import { supabase } from '@/lib/supabase'

// Salesforce SE NO tiene su propia tabla de órdenes/proveedores: son propiedad de
// Gespro 2.0 (misma instancia de Supabase, tablas `gespro_ordenes` y
// `gespro_proveedores`, formato JSON-blob {id, data jsonb}). Salesforce SE solo
// LEE — nunca inserta ni actualiza estas tablas.

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
