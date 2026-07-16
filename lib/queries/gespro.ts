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

async function sbGetJson<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('data')
  if (error) throw error
  return (data ?? []).map((r: { data: T }) => r.data)
}

export async function getOrdenesGespro(): Promise<OrdenGespro[]> {
  return sbGetJson<OrdenGespro>('gespro_ordenes')
}

export async function getProveedoresGespro(): Promise<ProveedorGespro[]> {
  return sbGetJson<ProveedorGespro>('gespro_proveedores')
}
