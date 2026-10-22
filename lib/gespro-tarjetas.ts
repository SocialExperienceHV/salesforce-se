import { supabase } from '@/lib/supabase'
import { getOrdenesGespro, getProyectoEstadosGespro, type OrdenGespro } from '@/lib/queries/gespro'

// Carga de compras con tarjeta en Gespro desde Calendar.
//
// Normalmente el productor entra a Gespro, escoge el gasto de la tarjeta y lo
// carga a un proyecto. Esto permite el mismo resultado desde el módulo Tarjeta
// Crédito de Calendar: cuando Contabilidad escribe el centro de costo de un
// gasto, se crea (o se mueve) la orden en Gespro como si el productor la
// hubiera cargado, para que cuente en Real Ejecutado, Seguimiento, etc.
//
// Es la ÚNICA parte de Calendar que escribe en `gespro_ordenes` (todo lo demás
// la lee, ver lib/queries/gespro.ts). La orden lleva el id del ítem
// (`tcItemId`), que es la misma marca que usa Gespro para no cargar dos veces
// un mismo gasto de tarjeta — por eso aquí nunca se crea una orden si ya hay
// una con ese id.

export type ProyectoRef = { id: string; nombre: string; centroCosto?: string; excluirDeReportes?: boolean }

export type ParamsCargaTC = {
  itemId: string
  tarjetaId: string
  monto: number
  responsable: string
  descripcion: string
  fechaItem?: string
  fechaDocumento?: string
  /** Centro de costo que se quiere dejar (el que escribió Contabilidad). */
  centroCostoNuevo: string
  /** Centro de costo que el ítem ya tenía en Calendar ('' si no tenía). */
  centroCostoActual: string
  /** Otros ítems de la misma tarjeta, mismo valor y mismo centro de costo que éste. */
  hermanos: { id: string }[]
  usuarioFallback: string
  proyectos: ProyectoRef[]
}

export type ResultadoCargaTC =
  | { ok: true; accion: 'creada' | 'movida' | 'sin_cambios'; orden: OrdenGespro }
  | { ok: false; error: string }

const fallo = (error: string): ResultadoCargaTC => ({ ok: false, error })

function proyectoDeCC(proyectos: ProyectoRef[], cc: string): ProyectoRef | undefined {
  const coincide = proyectos.filter(p => (p.centroCosto || '').trim() === cc)
  return coincide.find(p => !p.excluirDeReportes) ?? coincide[0]
}

export async function cargarItemTCaGespro(p: ParamsCargaTC): Promise<ResultadoCargaTC> {
  const ccNuevo = p.centroCostoNuevo.trim()
  const ccActual = p.centroCostoActual.trim()
  if (!ccNuevo) return fallo('Escribe el centro de costo.')

  const destino = proyectoDeCC(p.proyectos, ccNuevo)
  if (!destino) return fallo(`El centro de costo ${ccNuevo} no existe en Proyectos.`)

  // Datos frescos en el momento de guardar (no los que cargó la pantalla hace
  // rato): así no se duplica un gasto que alguien acaba de cargar en Gespro.
  let ordenes: OrdenGespro[]
  let estados: Awaited<ReturnType<typeof getProyectoEstadosGespro>>
  try {
    ;[ordenes, estados] = await Promise.all([getOrdenesGespro(), getProyectoEstadosGespro()])
  } catch {
    return fallo('No pude consultar Gespro. Revisa tu conexión e inténtalo de nuevo.')
  }
  const cerrado = (proyectoId: string) => estados.some(e => e.proyectoId === proyectoId && e.cerrado)
  if (cerrado(destino.id)) return fallo(`El proyecto del centro de costo ${ccNuevo} está cerrado: no se le pueden cargar más gastos.`)

  // 1) ¿Ya hay una orden de Gespro para este gasto? Primero por id exacto.
  let orden: OrdenGespro | undefined = ordenes.find(o => o.tcItemId === p.itemId)
  let vinculoNuevo = false

  // 2) Gastos viejos (cargados antes de que Gespro guardara el id): se busca
  // por tarjeta + valor + centro de costo actual, y solo se acepta si hay UNA
  // sola orden candidata y ningún otro gasto de Calendar que compita por ella.
  if (!orden && ccActual) {
    const idsEnlazados = new Set(ordenes.map(o => o.tcItemId).filter(Boolean) as string[])
    const candidatas = ordenes.filter(o =>
      o.modalidad === 'Compra con tarjeta' && !o.tcItemId &&
      o.tarjetaId === p.tarjetaId && o.valor === p.monto &&
      (o.centroCosto || '').trim() === ccActual)
    const competidores = p.hermanos.filter(h => !idsEnlazados.has(h.id)).length
    if (candidatas.length === 1 && competidores === 0) {
      orden = candidatas[0]
      vinculoNuevo = true
    } else {
      return fallo(
        `Este gasto ya figura con el centro de costo ${ccActual}, pero no encuentro con certeza su orden en Gespro` +
        ` (${candidatas.length === 0 ? 'no hay ninguna que coincida' : 'hay varias que podrían ser'}).` +
        ' Para no duplicar el gasto, corrígelo directamente en Gespro.')
    }
  }

  if (orden) {
    // MOVER: la orden ya existe, solo cambia de proyecto / centro de costo.
    if (orden.proyectoId === destino.id && (orden.centroCosto || '').trim() === ccNuevo && !vinculoNuevo) {
      return { ok: true, accion: 'sin_cambios', orden }
    }
    if (cerrado(orden.proyectoId)) {
      return fallo('El proyecto donde está cargado hoy este gasto está cerrado: no se puede mover (cambiaría su rentabilidad).')
    }
    const { data, error } = await supabase.from('gespro_ordenes').select('data').eq('id', orden.id).single()
    if (error || !data) return fallo('No pude leer la orden en Gespro para moverla.')
    const actualizada = {
      ...(data.data as OrdenGespro),
      proyectoId: destino.id,
      centroCosto: (destino.centroCosto || ccNuevo).trim(),
      nombreProyecto: destino.nombre,
      tcItemId: p.itemId,
    }
    const { error: errUpd } = await supabase.from('gespro_ordenes').update({ data: actualizada }).eq('id', orden.id)
    if (errUpd) return fallo('No pude actualizar la orden en Gespro. Nada cambió.')
    return { ok: true, accion: 'movida', orden: actualizada }
  }

  // 3) CREAR: el gasto no estaba en Gespro todavía.
  if (!p.descripcion.trim()) return fallo('La descripción es obligatoria: escríbela antes de asignar el centro de costo.')
  if (!(p.monto > 0)) return fallo('El gasto no tiene un valor mayor a cero.')

  let id = `ord_${Date.now()}`
  while (ordenes.some(o => o.id === id)) id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
  const nueva = {
    id,
    // Igual que las compras con tarjeta que se cargan desde Gespro hoy: no
    // consumen un número de la secuencia de órdenes de compra.
    numeroOrden: null,
    proyectoId: destino.id,
    centroCosto: (destino.centroCosto || ccNuevo).trim(),
    nombreProyecto: destino.nombre,
    modalidad: 'Compra con tarjeta' as const,
    tarjetaId: p.tarjetaId,
    tcItemId: p.itemId,
    valor: p.monto,
    descripcion: p.descripcion.trim(),
    fechaEntrega: p.fechaItem || p.fechaDocumento || new Date().toISOString().slice(0, 10),
    items: [] as unknown[],
    enviado: false,
    facturado: false,
    girado: false,
    usuario: p.responsable || p.usuarioFallback,
    createdAt: new Date().toISOString(),
  }
  const { error: errIns } = await supabase.from('gespro_ordenes').insert({ id, data: nueva })
  if (errIns) return fallo('No pude crear el gasto en Gespro. Nada se guardó.')
  return { ok: true, accion: 'creada', orden: nueva as unknown as OrdenGespro }
}
