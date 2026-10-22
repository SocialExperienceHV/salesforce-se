import { supabase } from '@/lib/supabase'

// Salesforce SE NO tiene su propia tabla de órdenes/proveedores: son propiedad de
// Gespro 2.0 (misma instancia de Supabase, tablas `gespro_ordenes` y
// `gespro_proveedores`, formato JSON-blob {id, data jsonb}). Salesforce SE solo
// LEE desde este archivo. La ÚNICA excepción donde Calendar escribe en
// `gespro_ordenes` es la carga de compras con tarjeta que hace Contabilidad
// desde el módulo Tarjeta Crédito — vive aparte en lib/gespro-tarjetas.ts.

export type ModalidadGastoGespro = 'Orden de compra' | 'Compra con tarjeta' | 'Anticipo'

export type OrdenGespro = {
  id: string
  numeroOrden: number
  proyectoId: string
  centroCosto: string
  nombreProyecto: string
  modalidad: ModalidadGastoGespro
  proveedorId?: string
  tarjetaId?: string
  // Id del gasto de documentos_tc que originó esta compra con tarjeta (las
  // cargadas antes de que Gespro lo guardara no lo traen).
  tcItemId?: string
  valor: number
  descripcion?: string
  createdAt: string
}

export type ProveedorGespro = {
  id: string
  tipoPersona: 'Jurídica' | 'Natural'
  razonSocial: string
  nombreApellido: string
}

export function nombreProveedorGespro(p: ProveedorGespro | undefined): string {
  if (!p) return '—'
  return p.tipoPersona === 'Jurídica' ? p.razonSocial : p.nombreApellido
}

// Supabase/PostgREST solo devuelve 1000 filas por consulta por defecto —
// gespro_ordenes y gespro_proveedores ya andan cerca de ese límite, así que
// hay que paginar o se pierden filas en silencio (le pasó a proyectos).
async function sbGetJson<T>(table: string): Promise<T[]> {
  const PAGE = 1000
  const all: { data: T }[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase.from(table).select('data').range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...(data as { data: T }[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all.map(r => r.data)
}

export async function getOrdenesGespro(): Promise<OrdenGespro[]> {
  return sbGetJson<OrdenGespro>('gespro_ordenes')
}

export async function getProveedoresGespro(): Promise<ProveedorGespro[]> {
  return sbGetJson<ProveedorGespro>('gespro_proveedores')
}

// Estado de cada proyecto en Gespro (tabla `gespro_proyecto_estados`). Un
// proyecto cerrado no admite más gastos.
export type ProyectoEstadoGespro = { proyectoId: string; facturado: boolean; cerrado: boolean }

export async function getProyectoEstadosGespro(): Promise<ProyectoEstadoGespro[]> {
  return sbGetJson<ProyectoEstadoGespro>('gespro_proyecto_estados')
}
