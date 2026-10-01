// Importar un presupuesto hecho en Excel (la plantilla que ya usa el equipo:
// PRESUPUESTO / CLIENTE / EVENTO / FECHA / ... / tabla PROCESO-ÍTEM-COSTO... /
// RESUMEN PRESUPUESTO) y convertirlo en un PptoBudget, sin que alguien tenga
// que volver a digitarlo a mano en la app.
//
// La plantilla real del equipo varía un poco de archivo a archivo (a veces
// trae una fila "HORARIO" de más, a veces el resumen pone la etiqueta antes
// del valor y a veces después, a veces hay una fila en blanco en medio de los
// ítems) — por eso esto NO asume números de fila fijos: busca la fila de
// encabezado ("PROCESO") y a partir de ahí todo por contenido, igual que se
// ha venido haciendo a mano para cargar presupuestos reales esta temporada.

import type { PptoRow } from './calculations'
import { mkRow } from './calculations'

export type ImportedMeta = {
  cliente: string
  evento: string
  fecha: string
  ciudad: string
  director: string
  formaPago: string
  validez: string
  agenciaPct: number
}

export type ImportResult = {
  meta: ImportedMeta
  rows: PptoRow[]
  warnings: string[]
  subtotalCalc: number
  costoRealCalc: number
}

type AOA = unknown[][]

function cell(row: unknown[] | undefined, col: number): unknown {
  return row ? row[col] : undefined
}
function asText(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}
function asNum(v: unknown): number {
  return typeof v === 'number' && !isNaN(v) ? v : 0
}
function labelMatches(raw: unknown, label: string): boolean {
  return asText(raw).replace(/:$/, '').toUpperCase() === label.toUpperCase()
}

// Busca en col A (0) de las primeras `maxRow` filas una etiqueta (ej.
// "CLIENTE:") y devuelve el valor de la columna B (1) de esa misma fila.
function findLabelValue(aoa: AOA, labels: string[], maxRow: number): string {
  for (let r = 0; r < Math.min(maxRow, aoa.length); r++) {
    const a = cell(aoa[r], 0)
    if (labels.some(l => labelMatches(a, l))) return asText(cell(aoa[r], 1))
  }
  return ''
}

export function parseBudgetAOA(aoa: AOA): ImportResult {
  const warnings: string[] = []

  // 1) Encontrar la fila de encabezado de la tabla de ítems (columna A = "PROCESO").
  let headerRow = -1
  for (let r = 0; r < Math.min(40, aoa.length); r++) {
    if (labelMatches(cell(aoa[r], 0), 'PROCESO')) { headerRow = r; break }
  }
  if (headerRow === -1) {
    warnings.push('No se encontró la fila de encabezado "PROCESO / ÍTEM / COSTO UNIDAD…" — ¿es el formato de presupuesto habitual?')
    return { meta: emptyMeta(), rows: [], warnings, subtotalCalc: 0, costoRealCalc: 0 }
  }

  // 2) Meta (cliente/evento/fecha/...) por etiqueta, en cualquier fila antes del encabezado.
  const meta: ImportedMeta = {
    cliente: findLabelValue(aoa, ['CLIENTE'], headerRow),
    evento: findLabelValue(aoa, ['EVENTO'], headerRow),
    fecha: findLabelValue(aoa, ['FECHA'], headerRow),
    ciudad: findLabelValue(aoa, ['CIUDAD'], headerRow),
    director: findLabelValue(aoa, ['DIRECTOR DE PROYECTO', 'DIRECTOR PROYECTO'], headerRow),
    formaPago: '30 DÍAS',
    validez: '15 DÍAS',
    agenciaPct: 10,
  }

  // 3) Ítems: desde la fila siguiente al encabezado. Una fila con la columna
  // ÍTEM vacía normalmente es un separador visual (se salta); la tabla
  // termina cuando aparece la fila de totales (columna A/D "SUBTOTAL" o
  // "EVENTO" con un número en la columna COSTO TOTAL).
  const rows: PptoRow[] = []
  let lastProceso = ''
  let r = headerRow + 1
  let guard = 0
  while (r < aoa.length && guard < 600) {
    guard++
    const row = aoa[r]
    const itemRaw = cell(row, 1)
    const fRaw = cell(row, 5)
    if (itemRaw == null || asText(itemRaw) === '') {
      // Fin de la tabla: una fila sin ítem pero con un número en COSTO TOTAL
      // es la fila de totales (a veces trae "SUBTOTAL" o "EVENTO" en la
      // columna A, a veces no trae ninguna etiqueta ahí — no hay que
      // depender del texto, el número ya es suficiente señal).
      if (typeof fRaw === 'number') break
      r++
      continue
    }
    const proceso = asText(cell(row, 0)) || lastProceso
    lastProceso = proceso
    const costoUnd = asNum(cell(row, 2))
    const cant = asNum(cell(row, 3))
    const dias = asNum(cell(row, 4))
    const costoRealTotalExcel = asNum(cell(row, 9)) // columna J: COSTO REAL TOTAL
    const costoRealUnd = cant * dias > 0 ? costoRealTotalExcel / (cant * dias) : costoRealTotalExcel
    const ordenado = asNum(cell(row, 10)) // columna K: COSTO TOTAL ORDENADO
    const proveedor = asText(cell(row, 11))
    rows.push(mkRow(proceso, asText(itemRaw), costoUnd, cant, dias, costoRealUnd, ordenado, proveedor))
    r++
  }
  if (rows.length === 0) {
    warnings.push('No se encontró ninguna fila de ítem después del encabezado — revisa que el archivo tenga datos debajo de "PROCESO / ÍTEM…".')
  }

  // 4) Resumen del Excel (para validar contra lo que calculamos nosotros) y
  // forma de pago / validez / agencia %, buscando en las ~25 filas después
  // de la tabla. El resumen a veces pone la etiqueta en la columna I y el
  // valor en J, y a veces la etiqueta en K con el valor también en J — se
  // acepta cualquiera de las dos.
  let subtotalExcel: number | null = null
  let utilAgenciaExcel: number | null = null
  let costoTotalExcel: number | null = null
  for (let rr = r; rr < Math.min(r + 25, aoa.length); rr++) {
    const row = aoa[rr]
    const d = asText(cell(row, 3)).toUpperCase()
    const f = cell(row, 5)
    if (d === 'SUBTOTAL' && typeof f === 'number') subtotalExcel = f
    if (d === 'UTILIDAD DE AGENCIA' && typeof f === 'number') utilAgenciaExcel = f
    const iLabel = asText(cell(row, 8)).toUpperCase()
    const kLabel = asText(cell(row, 10)).toUpperCase()
    const j = cell(row, 9)
    if ((iLabel === 'COSTO TOTAL' || kLabel === 'COSTO TOTAL') && typeof j === 'number') costoTotalExcel = j
    const aLabel = asText(cell(row, 0))
    if (/^\*?\s*FORMA DE PAGO/i.test(aLabel)) meta.formaPago = asText(cell(row, 1)) || meta.formaPago
    if (/^\*?\s*VALIDEZ/i.test(aLabel)) meta.validez = asText(cell(row, 1)) || meta.validez
  }

  const subtotalCalc = rows.reduce((s, x) => s + (x.costoUnd || 0) * (x.cant || 0) * (x.dias || 0), 0)
  const costoRealCalc = rows.reduce((s, x) => s + (x.costoRealUnd || 0) * (x.cant || 0) * (x.dias || 0), 0)

  if (subtotalExcel != null && Math.abs(subtotalCalc - subtotalExcel) > 1) {
    warnings.push(`El subtotal que da la tabla ($ ${Math.round(subtotalCalc).toLocaleString('es-CO')}) no coincide con el SUBTOTAL del resumen del Excel ($ ${Math.round(subtotalExcel).toLocaleString('es-CO')}) — puede que se haya saltado alguna fila.`)
  }
  if (costoTotalExcel != null && Math.abs(costoRealCalc - costoTotalExcel) > 1) {
    const gap = Math.round(costoTotalExcel - costoRealCalc)
    warnings.push(`El costo real de las filas ($ ${Math.round(costoRealCalc).toLocaleString('es-CO')}) no coincide con el COSTO TOTAL del resumen ($ ${Math.round(costoTotalExcel).toLocaleString('es-CO')}) — quedan $ ${gap.toLocaleString('es-CO')} sin explicar (típicamente anticipos o tarjeta sueltos del resumen, no atados a un ítem puntual).`)
  }
  if (subtotalExcel != null && utilAgenciaExcel != null && subtotalExcel !== 0) {
    meta.agenciaPct = Math.round((utilAgenciaExcel / subtotalExcel) * 100)
  }

  return { meta, rows, warnings, subtotalCalc, costoRealCalc }
}

function emptyMeta(): ImportedMeta {
  return { cliente: '', evento: '', fecha: '', ciudad: '', director: '', formaPago: '30 DÍAS', validez: '15 DÍAS', agenciaPct: 10 }
}

// Sugerencia de centro de costo a partir del nombre del archivo (ej. "1818.
// PPTO VITRINA 8.8.xlsx" → "1818"). Es solo un punto de partida editable: NO
// hay que confiar en el nombre del archivo a ciegas (ya ha pasado que dos
// archivos distintos traían el mismo número al inicio).
export function sugerirCentroCostoDeNombre(filename: string): string {
  const m = filename.match(/^\s*(\d{3,6})\b/)
  return m ? m[1] : ''
}
