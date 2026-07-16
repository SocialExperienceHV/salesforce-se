// Lógica de cálculo del módulo PPTO — portada VERBATIM desde presupuestos.html.
// No modificar las fórmulas: están validadas contra los Excel reales de la agencia.

export type PptoRow = {
  id: string
  proceso: string
  item: string
  costoUnd: number
  cant: number
  dias: number
  costoRealUnd: number
  ordenado: number
  proveedor: string
  // Fila agregada desde Real Ejecutado para un gasto real que no estaba en el
  // presupuesto inicial (no viene del PPTO original, ej. proceso "ADICIONALES").
  adicional?: boolean
}

export type PptoBudget = {
  id: string
  centroCosto: string
  cliente: string
  evento: string
  fecha: string
  ciudad: string
  director: string
  formaPago: string
  validez: string
  agenciaPct: number
  margenPct: number
  rows: PptoRow[]
  version: number
  createdAt: string
}

/* ---------- helpers ---------- */
export const fmt = (n: number | null | undefined) =>
  (n === null || n === undefined || isNaN(n)) ? '' : Math.round(n).toLocaleString('es-CO')
export const money = (n: number | null | undefined) => (n || n === 0) ? '$ ' + fmt(n) : ''
export const pctFmt = (n: number) => isFinite(n) ? (n * 100).toFixed(1).replace('.', ',') + ' %' : '—'
export const parseNum = (s: string | number) => { const d = String(s).replace(/[^\d]/g, ''); return d ? parseInt(d, 10) : 0 }
export const uid = () => Math.random().toString(36).slice(2, 10)

export const mkRow = (
  proceso: string, item: string, costoUnd: number, cant: number, dias: number,
  costoRealUnd: number, ordenado: number, proveedor: string,
): PptoRow => ({ id: uid(), proceso, item, costoUnd, cant, dias, costoRealUnd, ordenado, proveedor })

export const emptyBudget = (overrides?: Partial<PptoBudget>): PptoBudget => ({
  id: uid(), centroCosto: '', cliente: '', evento: '',
  fecha: '', ciudad: '', director: '', formaPago: '30 DÍAS', validez: '15 DÍAS', agenciaPct: 10, margenPct: 35,
  rows: [], version: 1, createdAt: new Date().toISOString(),
  ...overrides,
})

export const normalize = (b: Partial<PptoBudget>): PptoBudget => Object.assign(emptyBudget(), b,
  { rows: (b.rows || []).map(r => Object.assign({ proceso: '' }, r)) })

/* ---------- cálculos ---------- */
export const calcRow = (r: PptoRow, margenPct: number) => {
  const costoTotal = (r.costoUnd || 0) * (r.cant || 0) * (r.dias || 0)
  const factor = 1 - (margenPct || 0) / 100
  const ventaSugerida = (r.costoRealUnd && factor > 0) ? r.costoRealUnd / factor : 0
  const costoRealTotal = (r.costoRealUnd || 0) * (r.cant || 0) * (r.dias || 0)
  return { costoTotal, ventaSugerida, costoRealTotal }
}

export const calcTotals = (b: PptoBudget) => {
  let subtotal = 0, costoProy = 0, ordenado = 0
  b.rows.forEach(r => {
    const c = calcRow(r, b.margenPct)
    subtotal += c.costoTotal; costoProy += c.costoRealTotal; ordenado += r.ordenado || 0
  })
  const utilAgencia = subtotal * (b.agenciaPct || 0) / 100
  const totalAntesIva = subtotal + utilAgencia
  const utilProy = totalAntesIva - costoProy
  const utilReal = totalAntesIva - ordenado
  return {
    subtotal, utilAgencia, totalAntesIva, costoProy, utilProy,
    pctProy: totalAntesIva ? utilProy / totalAntesIva : NaN,
    ordenado, utilReal, pctReal: totalAntesIva ? utilReal / totalAntesIva : NaN,
  }
}

export const utilColor = (p: number) => !isFinite(p) ? '#8a8f88' : p < 0 ? '#b3261e' : p < 0.2 ? '#b26a00' : '#0e7a52'
