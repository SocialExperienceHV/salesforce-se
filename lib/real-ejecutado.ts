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
