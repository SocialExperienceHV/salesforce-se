import { supabase } from '@/lib/supabase'

// Salesforce SE NO tiene su propia tabla de órdenes: son propiedad de Gespro 2.0
// (misma instancia de Supabase, tabla `gespro_ordenes`, formato JSON-blob {id, data
// jsonb}). Salesforce SE solo LEE — nunca inserta ni actualiza esta tabla.

export type OrdenGespro = {
  id: string
  centroCosto: string
  valor: number
}

async function sbGetJson<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select('data')
  if (error) throw error
  return (data ?? []).map((r: { data: T }) => r.data)
}

export async function getOrdenesGespro(): Promise<OrdenGespro[]> {
  return sbGetJson<OrdenGespro>('gespro_ordenes')
}
