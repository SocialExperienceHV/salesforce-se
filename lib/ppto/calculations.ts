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

export const seedRows = (): PptoRow[] => [
  mkRow('ESCENOGRAFIA', 'Piso en PVC laminado tipo click color gris. Módulo exhibidor y módulo central en MDF, acabados, montaje, desmontaje y transporte', 41520000, 1, 1, 19000000, 19000000, 'TU MARCA'),
  mkRow('TECNICA', 'Interactivos credelio dog experiencia AR, escultura a escala y tablet', 3970000, 1, 1, 2200000, 7100000, 'CARLOS TELLO'),
  mkRow('TECNICA', 'Interactivos credelio plus NFC con lector de códigos y programación de pantalla', 4860000, 1, 1, 2100000, 0, ''),
  mkRow('TECNICA', 'Interactivo cat experiencia pantalla táctil', 3600000, 1, 1, 1200000, 0, ''),
  mkRow('TECNICA', 'Interactivo experiencia penaltis', 0, 0, 0, 0, 0, ''),
  mkRow('MOBILIARIO', 'Escultura de mascota a escala', 1250000, 1, 1, 380000, 0, ''),
  mkRow('ALQUILER', 'Alquiler de juegos de sala, sillas y mesa según propuesta', 440000, 2, 1, 405000, 0, ''),
  mkRow('OTRO', 'Pantalla aérea LED de pitch 2,9 de 3,00 mt x 1,00 mt - 12 mt2 - estructura a 4 caras y procesador', 3800000, 1, 3, 5414000, 16242800, 'IDEALO'),
  mkRow('OTRO', 'Truss central en forma de cuadro para soporte de cubo', 480000, 1, 3, 0, 0, ''),
  mkRow('OTRO', 'Puesto fijo central', 420000, 1, 3, 0, 2325135, 'TC'),
  mkRow('OTRO', 'Punto de anclaje aéreo de 4 motores y trabajo de alturas', 760000, 1, 2, 0, 1367010, 'ANT'),
  mkRow('OTRO', 'Coordinador de alturas - requerimiento locación para trabajo en alturas (montaje y desmontaje)', 380000, 1, 2, 0, 0, ''),
  mkRow('OTRO', 'Horas adicionales servicio de grúa de 10 mts', 0, 0, 0, 0, 0, ''),
  mkRow('OPERACIÓN', 'Productor 360', 380000, 1, 4, 0, 0, ''),
  mkRow('OPERACIÓN', 'Personal promotores jornada 12 horas', 320000, 3, 3, 194000, 4378200, 'LA EMPRESA'),
  mkRow('OPERACIÓN', 'Personal botargas jornada 12 horas', 0, 0, 0, 0, 0, ''),
  mkRow('OPERACIÓN', 'Tiquetes aéreos productor - Bogotá Medellín Bogotá', 250000, 1, 2, 0, 0, ''),
  mkRow('OPERACIÓN', 'Hidratación 10 pacas de agua', 0, 0, 0, 0, 0, ''),
  mkRow('OPERACIÓN', 'Uniformes promotores', 120000, 3, 1, 40000, 0, ''),
]

export const seedBudget = (): PptoBudget => ({
  id: uid(), centroCosto: '1529', cliente: 'ELANCO',
  evento: 'STAND CREDELIO VET TECH 2026', fecha: '12 de abril', ciudad: 'BOGOTA',
  director: 'HANS VARGAS', formaPago: '30 DÍAS', validez: '15 DÍAS', agenciaPct: 10, margenPct: 35, rows: seedRows(),
})

export const emptyBudget = (): PptoBudget => ({
  id: uid(), centroCosto: '', cliente: '', evento: 'Nuevo presupuesto',
  fecha: '', ciudad: '', director: '', formaPago: '30 DÍAS', validez: '15 DÍAS', agenciaPct: 10, margenPct: 35,
  rows: [mkRow('', '', 0, 1, 1, 0, 0, '')],
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
