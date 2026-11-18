import { supabase } from './supabase'
import type { ModalidadGastoGespro } from './queries/gespro'

// Tabla propia de Salesforce SE (Calendar 2.0), formato JSON-blob {id, data}.
// Una fila por centro de costo: registra cuál versión del PPTO fue la que se
// vendió y qué gastos de Gespro (órdenes/anticipos/tarjeta) se le asignaron a
// cada fila de ese presupuesto.

// Además de las 3 modalidades de Gespro, un gasto asignado a una fila puede
// venir de una Legalización de Calendar 2.0 (cuenta de cobro, factura
// electrónica, documento equivalente, etc. — ver GastoLegalizacion.tipoFactura
// en lib/store.tsx). No se distingue por tipoFactura aquí porque para efectos
// de "en qué rubro se gastó" da igual el soporte, todas cuentan igual.
export type ModalidadAsignacion = ModalidadGastoGespro | 'Legalización'

export type AsignacionGasto = {
  id: string
  rowId: string
  gastoId: string
  modalidad: ModalidadAsignacion
  monto: number
  createdAt: string
}

export type RealEjecutado = {
  centroCosto: string
  pptoId: string
  asignaciones: AsignacionGasto[]
  // true en los Real Ejecutado creados desde que se usa siempre la última
  // versión del PPTO: acompañan a la versión más nueva mientras nadie haya
  // trabajado en ellos (asignar un gasto, editar o agregar una fila). Ese
  // trabajo queda atado a las filas de una versión concreta, así que al primer
  // cambio pasa a false y la versión queda fija. Los anteriores no la traen
  // (undefined) y nunca cambian de versión solos.
  seguirUltima?: boolean
}

// Versión del PPTO que debe usar un Real Ejecutado nuevo: la de mayor número
// que tenga filas. Una versión vacía (ej. una "nueva versión" creada y sin
// llenar) no sirve para cargar gastos, así que se salta; si todas están
// vacías, la de mayor número. `versionesDesc` viene ordenada de mayor a menor.
export function versionVigente<T extends { rows: unknown[] }>(versionesDesc: T[]): T | undefined {
  return versionesDesc.find(v => v.rows.length > 0) ?? versionesDesc[0]
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export async function getRealEjecutados(): Promise<RealEjecutado[]> {
  const PAGE = 1000
  const all: { data: RealEjecutado }[] = []
  let from = 0
  for (;;) {
    const { data } = await supabase.from('real_ejecutado').select('data').range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    all.push(...(data as { data: RealEjecutado }[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all.map(r => r.data)
}

export async function guardarRealEjecutado(re: RealEjecutado) {
  await supabase.from('real_ejecutado').upsert({ id: re.centroCosto, data: re })
}
