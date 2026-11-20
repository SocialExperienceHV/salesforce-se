'use client'

// Módulo Real Ejecutado — conecta un presupuesto de PPTO (ya cerrado y vendido) con
// los gastos reales cargados en Gespro 2.0 (Órdenes de compra, Compra con tarjeta,
// Anticipos) para llenar la columna "Costo Total Ordenado" con datos reales en vez
// de un número escrito a mano. Persistencia: tabla Supabase `real_ejecutado`
// (JSON-blob {id, data}, una fila por centro de costo) + escribe de vuelta el total
// asignado por fila en `PptoRow.ordenado` (tabla `presupuestos`) para que el propio
// módulo PPTO y su exportación a Excel queden sincronizados automáticamente.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useStore, type Legalizacion, type GastoLegalizacion } from '@/lib/store'
import {
  type PptoBudget, type PptoRow, fmt, money, calcTotals, calcRow, utilColor, mkRow,
} from '@/lib/ppto/calculations'
import {
  getOrdenesGespro, getProveedoresGespro, nombreProveedorGespro,
  type OrdenGespro, type ProveedorGespro,
} from '@/lib/queries/gespro'
import {
  getRealEjecutados, guardarRealEjecutado, uid, versionVigente, puedeFinalizarRealEjecutado,
  type RealEjecutado, type AsignacionGasto, type ModalidadAsignacion,
} from '@/lib/real-ejecutado'

// Un gasto que se puede asignar a una fila del presupuesto, ya sea que venga
// de Gespro (Orden de compra / Compra con tarjeta / Anticipo) o de una
// Legalización de Calendar 2.0 (cuenta de cobro y demás soportes). Se unifica
// en un solo tipo para que el modal de "Asignar gasto" y los cálculos de
// saldo/huérfanos no tengan que distinguir la fuente.
type GastoAsignable = {
  id: string
  modalidad: ModalidadAsignacion
  valor: number
  label: string
  sublabel?: string
}

type Vista = 'landing' | 'editor'

function ccKey(cc: string) {
  return (cc || '').trim() || 'Sin centro de costo'
}

// Para buscar sin que importen mayúsculas ni tildes ("MEDELLÍN" = "medellin").
function sinTildes(s: string) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

type FiltroFin = 'todos' | 'pendientes' | 'finalizados'

type GastoSinAsignar = { id: string; nombre: string; saldo: number }

// ¿Queda algo por asignar de un gasto? Hay que asignar cuando el saldo sigue teniendo
// el mismo signo que el gasto (positivo = costo; negativo = devolución o crédito que
// resta). Un saldo de signo contrario sería haber asignado de más: eso no es "sin asignar".
const hayPorAsignar = (valor: number, saldo: number) => Math.abs(saldo) >= 1 && Math.sign(saldo) === Math.sign(valor)

const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
const fechaLarga = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

export default function RealEjecutadoPage() {
  const { tarjetasCorp, proyectos, legalizaciones, currentUser } = useStore()
  const [budgets, setBudgets] = useState<PptoBudget[]>([])
  const [reales, setReales] = useState<RealEjecutado[]>([])
  const [ordenes, setOrdenes] = useState<OrdenGespro[]>([])
  const [proveedores, setProveedores] = useState<ProveedorGespro[]>([])
  const [loading, setLoading] = useState(true)

  const [vista, setVista] = useState<Vista>('landing')
  const [ccSel, setCcSel] = useState('')
  const [asignarRowId, setAsignarRowId] = useState<string | null>(null)
  const [montoInputs, setMontoInputs] = useState<Record<string, string>>({})
  const [busqueda, setBusqueda] = useState('')
  const [filtroFin, setFiltroFin] = useState<FiltroFin>('todos')
  const [confirmFin, setConfirmFin] = useState<{ cc: string; accion: 'finalizar' | 'reabrir' } | null>(null)
  const [guardandoFin, setGuardandoFin] = useState(false)

  /* ---------- carga inicial ---------- */
  useEffect(() => {
    (async () => {
      const [{ data: presData }, ordenesData, proveedoresData, realesData] = await Promise.all([
        supabase.from('presupuestos').select('data'),
        getOrdenesGespro().catch(() => []),
        getProveedoresGespro().catch(() => []),
        getRealEjecutados(),
      ])
      setBudgets((presData ?? []).map((r: { data: PptoBudget }) => r.data))
      setOrdenes(ordenesData)
      setProveedores(proveedoresData)
      setReales(realesData)
      setLoading(false)
    })()
  }, [])

  /* ---------- agrupación de presupuestos por centro de costo ---------- */
  const grupos = useMemo(() => {
    const map = new Map<string, PptoBudget[]>()
    budgets.forEach(b => {
      const cc = ccKey(b.centroCosto)
      if (!map.has(cc)) map.set(cc, [])
      map.get(cc)!.push(b)
    })
    return [...map.entries()].map(([centroCosto, versions]) => {
      const sorted = [...versions].sort((a, b) => b.version - a.version)
      return { centroCosto, versions: sorted, latest: sorted[0] }
    }).sort((a, b) => {
      // De mayor a menor centro de costo (los CC no numéricos, ej. "Sin
      // centro de costo", quedan al final en vez de intercalados).
      const na = parseInt(a.centroCosto, 10)
      const nb = parseInt(b.centroCosto, 10)
      if (isNaN(na) && isNaN(nb)) return a.centroCosto.localeCompare(b.centroCosto)
      if (isNaN(na)) return 1
      if (isNaN(nb)) return -1
      return nb - na
    })
  }, [budgets])

  // Buscador de la lista: por número de centro de costo, nombre del proyecto o
  // cliente. Cada palabra escrita debe aparecer en alguno de los tres (así
  // "1942 open" o "falabella photo" también funcionan).
  // También se puede filtrar por Real Ejecutado finalizado / pendiente.
  const centrosFinalizados = useMemo(
    () => new Set(reales.filter(r => r.finalizado).map(r => r.centroCosto)),
    [reales],
  )
  const gruposFiltrados = useMemo(() => {
    const palabras = sinTildes(busqueda).split(/\s+/).filter(Boolean)
    return grupos.filter(g => {
      const fin = centrosFinalizados.has(g.centroCosto)
      if (filtroFin === 'finalizados' && !fin) return false
      if (filtroFin === 'pendientes' && fin) return false
      if (palabras.length === 0) return true
      const texto = sinTildes(`${g.centroCosto} ${g.latest.evento ?? ''} ${g.latest.cliente ?? ''}`)
      return palabras.every(p => texto.includes(p))
    })
  }, [grupos, busqueda, filtroFin, centrosFinalizados])

  function grupoDe(cc: string) {
    return grupos.find(g => g.centroCosto === ccKey(cc)) ?? null
  }

  // Los Real Ejecutado nuevos acompañan a la última versión del PPTO: mientras
  // nadie haya trabajado en uno (ver `seguirUltima`) se ve en la versión más
  // nueva, aunque se haya creado cuando solo existía una anterior. Los que ya
  // estaban hechos antes de este cambio no traen la marca y no se tocan.
  const realesVigentes = useMemo(() => reales.map(re => {
    if (!re.seguirUltima || re.asignaciones.length > 0) return re
    const g = grupos.find(x => x.centroCosto === ccKey(re.centroCosto))
    const vigente = g ? versionVigente(g.versions) : undefined
    return vigente && vigente.id !== re.pptoId ? { ...re, pptoId: vigente.id } : re
  }), [reales, grupos])

  // Deja guardado en la base de datos el cambio de versión (una sola vez por cambio).
  const versionGuardada = useRef(new Set<string>())
  useEffect(() => {
    if (loading) return
    realesVigentes.forEach((re, i) => {
      const clave = `${re.centroCosto}|${re.pptoId}`
      if (re.pptoId === reales[i].pptoId || versionGuardada.current.has(clave)) return
      versionGuardada.current.add(clave)
      guardarRealEjecutado(re)
    })
  }, [loading, reales, realesVigentes])

  function realDe(cc: string) {
    return realesVigentes.find(r => r.centroCosto === ccKey(cc)) ?? null
  }

  const realSel = realDe(ccSel)
  const budgetSel = realSel ? budgets.find(b => b.id === realSel.pptoId) ?? null : null
  // Un Real Ejecutado finalizado queda bloqueado hasta que alguien con permiso lo reabra.
  const bloqueado = !!realSel?.finalizado
  const puedeFinalizar = puedeFinalizarRealEjecutado(currentUser?.permiso)

  /* ---------- gastos de Gespro para el centro de costo activo ---------- */
  // Se relaciona por proyectoId (fuente confiable) y no solo por el centroCosto guardado
  // en la orden, porque ese campo queda como una foto del momento en que se creó la
  // orden en Gespro y puede quedar desactualizado si el centro de costo del proyecto
  // cambió después en Calendar 2.0.
  const gastosCC = useMemo(() => {
    const proyectoIdsDelCC = new Set(proyectos.filter(p => ccKey(p.centroCosto || '') === ccSel).map(p => p.id))
    return ordenes.filter(o => proyectoIdsDelCC.has(o.proyectoId) || ccKey(o.centroCosto) === ccSel)
  }, [ordenes, proyectos, ccSel])

  function nombreGasto(o: OrdenGespro, incluirNumero = true): string {
    if (o.modalidad === 'Orden de compra') {
      const proveedor = nombreProveedorGespro(proveedores.find(p => p.id === o.proveedorId))
      return incluirNumero ? `#${o.numeroOrden} · ${proveedor}` : proveedor
    }
    if (o.modalidad === 'Compra con tarjeta') {
      const t = tarjetasCorp.find(t => t.id === o.tarjetaId)
      return t ? `Tarjeta ${t.nombre ?? ''} •••• ${t.ultimos4}`.trim() : 'Compra con tarjeta'
    }
    return o.descripcion?.trim() || 'Anticipo'
  }

  function nombreGastoLegalizacion(g: GastoLegalizacion): string {
    return `${g.tipoFactura} — ${g.descripcion?.trim() || g.tipoGasto || 'Gasto'}`
  }

  // Una legalización puede traer gastos de varios centros de costo en el mismo
  // documento (ej. un productor que reporta parqueaderos de un proyecto y
  // viáticos de otro juntos). Si ningún gasto individual trae su propio centro
  // de costo, se usa el del documento completo como respaldo (formato viejo).
  function gastosLegalizacionDeCC(l: Legalizacion, cc: string): GastoLegalizacion[] {
    const gastosDeEsteCC = (l.gastos ?? []).filter(g => ccKey(g.centroCosto) === cc)
    if (gastosDeEsteCC.length > 0) return gastosDeEsteCC
    if (ccKey(l.centroCosto) === cc) return l.gastos ?? []
    return []
  }

  const gastosLegalizacionCC = useMemo(() => {
    const out: { gasto: GastoLegalizacion; leg: Legalizacion }[] = []
    legalizaciones.forEach(l => gastosLegalizacionDeCC(l, ccSel).forEach(gasto => out.push({ gasto, leg: l })))
    return out
  }, [legalizaciones, ccSel])

  // Busca un gasto de legalización por id en TODAS las legalizaciones (no solo
  // las de este CC), igual que `ordenes.find` no filtra por CC: si ya se
  // asignó y luego el gasto cambió de centro de costo, se sigue mostrando el
  // chip con su nombre en vez de marcarlo como huérfano.
  function encontrarGastoLegalizacion(gastoId: string) {
    for (const l of legalizaciones) {
      const gasto = (l.gastos ?? []).find(g => g.id === gastoId)
      if (gasto) return { gasto, leg: l }
    }
    return null
  }

  function saldoDeId(id: string, valor: number): number {
    const asignado = (realSel?.asignaciones ?? []).filter(a => a.gastoId === id).reduce((s, a) => s + a.monto, 0)
    return valor - asignado
  }

  // Si el gasto (de Gespro o de una Legalización) asignado a una fila se borra
  // en su módulo de origen (o se le cambia el centro de costo), la asignación
  // queda huérfana: se sigue mostrando como "Gasto eliminado" para que se pueda
  // quitar o reasignar, pero no debe seguir sumando como costo real — si no, el
  // total ordenado queda inflado con dinero fantasma que ya no corresponde a
  // ningún gasto existente.
  function existeGasto(a: AsignacionGasto): boolean {
    if (a.modalidad === 'Legalización') return legalizaciones.some(l => (l.gastos ?? []).some(g => g.id === a.gastoId))
    return ordenes.some(o => o.id === a.gastoId)
  }

  function totalValido(asigs: AsignacionGasto[]): number {
    return asigs.filter(existeGasto).reduce((s, a) => s + a.monto, 0)
  }

  function totalAsignadoPorModalidad(modalidad: ModalidadAsignacion): number {
    return (realSel?.asignaciones ?? [])
      .filter(a => a.modalidad === modalidad && existeGasto(a))
      .reduce((s, a) => s + a.monto, 0)
  }

  // Antes solo las Órdenes de compra se podían asignar fila por fila; Compra
  // con tarjeta y Anticipos (Gespro + Legalizaciones) se tomaban como un total
  // automático del centro de costo sin decir a qué rubro correspondían. Ahora
  // las 4 fuentes aparecen aquí para que el productor pueda decir "esto fue
  // para este ítem del presupuesto" — el total de arriba no cambia por esto
  // (ver costoRealCompleto más abajo), solo se vuelve más trazable.
  const gastosDisponibles = useMemo<GastoAsignable[]>(() => {
    const list: GastoAsignable[] = []
    gastosCC.forEach(o => {
      const saldo = saldoDeId(o.id, o.valor)
      if (hayPorAsignar(o.valor, saldo)) list.push({ id: o.id, modalidad: o.modalidad, valor: o.valor, label: nombreGasto(o) })
    })
    gastosLegalizacionCC.forEach(({ gasto, leg }) => {
      const saldo = saldoDeId(gasto.id, gasto.total)
      if (hayPorAsignar(gasto.total, saldo)) {
        list.push({
          id: gasto.id, modalidad: 'Legalización', valor: gasto.total,
          label: nombreGastoLegalizacion(gasto), sublabel: `${leg.responsable} · ${leg.codigo}`,
        })
      }
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastosCC, gastosLegalizacionCC, realSel])

  const totalTarjeta = useMemo(
    () => gastosCC.filter(o => o.modalidad === 'Compra con tarjeta').reduce((s, o) => s + o.valor, 0),
    [gastosCC],
  )
  // Total de TODAS las órdenes de compra del centro de costo en Gespro, estén o
  // no ya asignadas a una fila del presupuesto. "Total ordenado" (t.ordenado)
  // solo cuenta lo que se ha asignado manualmente fila por fila, así que puede
  // quedar por debajo de este total si hay órdenes sin asignar todavía.
  const totalGespro = useMemo(
    () => gastosCC.filter(o => o.modalidad === 'Orden de compra').reduce((s, o) => s + o.valor, 0),
    [gastosCC],
  )
  // Anticipos "solicitados" en Gespro = anticipos creados directo en el módulo
  // Ordenes de Gespro + los gastos de Legalizaciones de Calendar 2.0 que apliquen
  // a este centro de costo (mismo criterio que usa la vista de Gespro: suma
  // gastos[].total de cada legalización, no el campo "anticipo" en sí).
  const totalAnticipoGespro = useMemo(
    () => gastosCC.filter(o => o.modalidad === 'Anticipo').reduce((s, o) => s + o.valor, 0),
    [gastosCC],
  )
  const totalAnticipoLegalizaciones = useMemo(
    () => gastosLegalizacionCC.reduce((s, { gasto }) => s + (gasto.total ?? 0), 0),
    [gastosLegalizacionCC],
  )
  const totalAnticipos = totalAnticipoGespro + totalAnticipoLegalizaciones

  // Cuánto de la tarjeta/anticipos "brutos" de arriba ya quedó asignado a una
  // fila puntual del presupuesto (para no volver a sumarlo en costoRealCompleto
  // más abajo) y cuánto sigue sin clasificar en ningún rubro todavía.
  const tarjetaAsignada = totalAsignadoPorModalidad('Compra con tarjeta')
  const anticipoGesproAsignado = totalAsignadoPorModalidad('Anticipo')
  const legalizacionAsignada = totalAsignadoPorModalidad('Legalización')
  const tarjetaPendiente = totalTarjeta - tarjetaAsignada
  const anticipoPendiente = totalAnticipos - anticipoGesproAsignado - legalizacionAsignada

  /* ---------- finalizar / reabrir un Real Ejecutado ---------- */
  // Gastos de un centro de costo (de Gespro y de Legalizaciones) que todavía no
  // están asignados del todo a una fila del presupuesto. Para finalizar un Real
  // Ejecutado no puede quedar ninguno. Un gasto negativo (devolución o crédito)
  // también cuenta: tiene que asignarse a una fila para que reste del costo.
  function gastosSinAsignarDe(cc: string): GastoSinAsignar[] {
    const key = ccKey(cc)
    const asignaciones = realDe(key)?.asignaciones ?? []
    const asignadoA = (id: string) => asignaciones.filter(a => a.gastoId === id).reduce((s, a) => s + a.monto, 0)
    const idsProyecto = new Set(proyectos.filter(p => ccKey(p.centroCosto || '') === key).map(p => p.id))
    const out: GastoSinAsignar[] = []
    ordenes
      .filter(o => idsProyecto.has(o.proyectoId) || ccKey(o.centroCosto) === key)
      .forEach(o => {
        const saldo = o.valor - asignadoA(o.id)
        if (!hayPorAsignar(o.valor, saldo)) return
        out.push({
          id: o.id, saldo,
          nombre: `${o.modalidad || 'Gasto'} · ${nombreGasto(o, false)}${o.descripcion?.trim() ? ` — ${o.descripcion.trim()}` : ''}`,
        })
      })
    legalizaciones.forEach(l => gastosLegalizacionDeCC(l, key).forEach(g => {
      const saldo = (g.total ?? 0) - asignadoA(g.id)
      if (!hayPorAsignar(g.total ?? 0, saldo)) return
      out.push({ id: g.id, saldo, nombre: `Legalización · ${nombreGastoLegalizacion(g)} (${l.codigo})` })
    }))
    return out
  }

  async function aplicarFinalizacion(cc: string, accion: 'finalizar' | 'reabrir') {
    if (!puedeFinalizar || !currentUser) return
    const key = ccKey(cc)
    // No se puede finalizar con gastos sin asignar (la ventana ya lo avisa; esto es un respaldo).
    if (accion === 'finalizar' && gastosSinAsignarDe(key).length > 0) return
    let re = realDe(key)
    if (!re) {
      // Centro de costo "Sin iniciar": se crea con la última versión del PPTO.
      const g = grupoDe(key)
      const vigente = g ? versionVigente(g.versions) : undefined
      if (!vigente) return
      re = { centroCosto: key, pptoId: vigente.id, asignaciones: [] }
    }
    const ahora = new Date().toISOString()
    const historial = [
      ...(re.historial ?? []),
      { accion: accion === 'finalizar' ? 'finalizado' as const : 'reabierto' as const, por: currentUser.nombre, fecha: ahora },
    ]
    // Al finalizar la versión del PPTO queda fija (ya no sigue a la más nueva).
    const nuevo: RealEjecutado = accion === 'finalizar'
      ? { ...re, seguirUltima: false, finalizado: { por: currentUser.nombre, fecha: ahora }, historial }
      : { ...re, finalizado: undefined, historial }
    setReales(prev => [...prev.filter(r => r.centroCosto !== nuevo.centroCosto), nuevo])
    await guardarRealEjecutado(nuevo)
  }

  async function confirmarFinalizacion() {
    if (!confirmFin) return
    setGuardandoFin(true)
    try {
      await aplicarFinalizacion(confirmFin.cc, confirmFin.accion)
    } finally {
      setGuardandoFin(false)
      setConfirmFin(null)
    }
  }

  /* ---------- navegación ---------- */
  function volverALanding() { setVista('landing'); setCcSel(''); setAsignarRowId(null) }
  async function abrirCC(cc: string) {
    const key = ccKey(cc)
    setCcSel(key)
    if (!realDe(cc)) {
      // Sin Real Ejecutado todavía: se crea con la última versión del PPTO.
      const g = grupoDe(cc)
      const vigente = g ? versionVigente(g.versions) : undefined
      if (!vigente) return
      const re: RealEjecutado = { centroCosto: key, pptoId: vigente.id, asignaciones: [], seguirUltima: true }
      setReales(prev => [...prev.filter(r => r.centroCosto !== key), re])
      await guardarRealEjecutado(re)
    }
    setVista('editor')
  }

  useEffect(() => {
    if (vista === 'editor' && (!realSel || !budgetSel)) volverALanding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, realSel, budgetSel])

  /* ---------- asignar / quitar gastos ---------- */
  async function persistirReal(re: RealEjecutado) {
    // Cualquier cambio hecho desde el editor deja fija la versión (ver `seguirUltima`).
    const fijo = re.seguirUltima ? { ...re, seguirUltima: false } : re
    setReales(prev => [...prev.filter(r => r.centroCosto !== fijo.centroCosto), fijo])
    await guardarRealEjecutado(fijo)
  }

  // Editar el PPTO desde aquí (filas, filas adicionales) también cuenta como
  // trabajo sobre esa versión, aunque no se haya asignado ningún gasto.
  async function fijarVersion() {
    if (realSel?.seguirUltima) await persistirReal(realSel)
  }

  async function actualizarOrdenadoFila(budget: PptoBudget, rowId: string, nuevoTotal: number) {
    const actualizado: PptoBudget = { ...budget, rows: budget.rows.map(r => r.id === rowId ? { ...r, ordenado: nuevoTotal } : r) }
    setBudgets(prev => prev.map(b => b.id === actualizado.id ? actualizado : b))
    await supabase.from('presupuestos').update({ data: actualizado }).eq('id', actualizado.id)
  }

  async function asignar(rowId: string, gasto: GastoAsignable, monto: number) {
    // El monto va con signo: positivo suma al costo; negativo (devolución o
    // crédito de un gasto negativo) lo resta.
    if (!realSel || !budgetSel || monto === 0 || bloqueado) return
    const nueva: AsignacionGasto = { id: uid(), rowId, gastoId: gasto.id, modalidad: gasto.modalidad, monto, createdAt: new Date().toISOString() }
    const actualizado: RealEjecutado = { ...realSel, asignaciones: [...realSel.asignaciones, nueva] }
    await persistirReal(actualizado)
    const totalFila = totalValido(actualizado.asignaciones.filter(a => a.rowId === rowId))
    await actualizarOrdenadoFila(budgetSel, rowId, totalFila)
  }

  async function quitarAsignacion(asigId: string) {
    if (!realSel || !budgetSel || bloqueado) return
    const asig = realSel.asignaciones.find(a => a.id === asigId)
    if (!asig) return
    const actualizado: RealEjecutado = { ...realSel, asignaciones: realSel.asignaciones.filter(a => a.id !== asigId) }
    await persistirReal(actualizado)
    const totalFila = totalValido(actualizado.asignaciones.filter(a => a.rowId === asig.rowId))
    await actualizarOrdenadoFila(budgetSel, asig.rowId, totalFila)
  }

  /* ---------- filas adicionales (gasto real que no estaba en el PPTO inicial) ---------- */
  async function actualizarFila(rowId: string, patch: Partial<PptoRow>) {
    if (!budgetSel || bloqueado) return
    await fijarVersion()
    const actualizado: PptoBudget = { ...budgetSel, rows: budgetSel.rows.map(r => r.id === rowId ? { ...r, ...patch } : r) }
    setBudgets(prev => prev.map(b => b.id === actualizado.id ? actualizado : b))
    await supabase.from('presupuestos').update({ data: actualizado }).eq('id', actualizado.id)
  }

  async function agregarFilaAdicional() {
    if (!budgetSel || bloqueado) return
    await fijarVersion()
    const nueva: PptoRow = { ...mkRow('ADICIONALES', '', 0, 1, 1, 0, 0, ''), adicional: true }
    const actualizado: PptoBudget = { ...budgetSel, rows: [...budgetSel.rows, nueva] }
    setBudgets(prev => prev.map(b => b.id === actualizado.id ? actualizado : b))
    await supabase.from('presupuestos').update({ data: actualizado }).eq('id', actualizado.id)
  }

  async function eliminarFilaAdicional(rowId: string) {
    if (!budgetSel || bloqueado) return
    await fijarVersion()
    const actualizado: PptoBudget = { ...budgetSel, rows: budgetSel.rows.filter(r => r.id !== rowId) }
    setBudgets(prev => prev.map(b => b.id === actualizado.id ? actualizado : b))
    await supabase.from('presupuestos').update({ data: actualizado }).eq('id', actualizado.id)
    if (realSel && realSel.asignaciones.some(a => a.rowId === rowId)) {
      await persistirReal({ ...realSel, asignaciones: realSel.asignaciones.filter(a => a.rowId !== rowId) })
    }
  }

  if (loading) {
    return <div className="realej"><Styles /><div style={{ padding: 40, color: '#9aa398', fontSize: 14 }}>Cargando...</div></div>
  }

  // Confirmación para finalizar o reabrir un Real Ejecutado (se usa en la lista y en el editor).
  let modalFin: React.ReactNode = null
  if (confirmFin) {
    const finalizar = confirmFin.accion === 'finalizar'
    const grupo = grupoDe(confirmFin.cc)
    const sinAsignar = finalizar ? gastosSinAsignarDe(confirmFin.cc) : []
    const noSePuede = sinAsignar.length > 0
    const MAX_LISTA = 8
    modalFin = (
      <div className="modalbg" onClick={() => { if (!guardandoFin) setConfirmFin(null) }}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
          <div className="modaltitle">
            {!finalizar ? 'Reabrir Real Ejecutado' : noSePuede ? 'No se puede finalizar todavía' : 'Marcar como finalizado'}
          </div>
          <p className="modaltxt"><b>{confirmFin.cc}</b> · {grupo?.latest.evento || 'Sin nombre'}</p>
          {!finalizar ? (
            <p className="modaltxt">Se desbloquea la edición y se quita la marca de finalizado. Queda registrado quién lo reabrió y cuándo.</p>
          ) : noSePuede ? (
            <>
              <p className="modaltxt">
                Todavía hay <b>{sinAsignar.length} {sinAsignar.length === 1 ? 'gasto' : 'gastos'} sin asignar</b> a una fila del presupuesto
                (de Gespro o de Legalizaciones). Para finalizar tienen que estar todos asignados, incluidas las devoluciones o créditos en negativo.
              </p>
              <ul className="finlista">
                {sinAsignar.slice(0, MAX_LISTA).map(g => (
                  <li key={g.id}><span>{g.nombre}</span><span className="num">{money(g.saldo)}</span></li>
                ))}
              </ul>
              {sinAsignar.length > MAX_LISTA && <p className="modaltxt">… y {sinAsignar.length - MAX_LISTA} más.</p>}
            </>
          ) : (
            <p className="modaltxt">Todos los gastos están asignados. Al finalizarlo queda <b>bloqueado</b>: no se podrán asignar ni quitar gastos ni editar filas hasta que Francisco, Felipe o Hans lo reabran. Queda registrado quién lo finalizó y cuándo.</p>
          )}
          <div className="modalbtns">
            {noSePuede ? (
              <>
                <button className="tb" onClick={() => setConfirmFin(null)}>Cerrar</button>
                {vista === 'landing' && (
                  <button className="tb primary" onClick={() => { const cc = confirmFin.cc; setConfirmFin(null); abrirCC(cc) }}>Abrir y asignar</button>
                )}
              </>
            ) : (
              <>
                <button className="tb" onClick={() => setConfirmFin(null)} disabled={guardandoFin}>Cancelar</button>
                <button className="tb primary" onClick={confirmarFinalizacion} disabled={guardandoFin}>
                  {guardandoFin ? 'Guardando…' : finalizar ? 'Marcar como finalizado' : 'Reabrir'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ==================== LANDING ==================== */
  if (vista === 'landing') {
    const nFinalizados = grupos.filter(g => centrosFinalizados.has(g.centroCosto)).length
    const hayFiltro = !!busqueda.trim() || filtroFin !== 'todos'
    return (
      <div className="realej">
        <Styles />
        {modalFin}
        <div className="pheader">
          <div>
            <h1>Real Ejecutado</h1>
            <p>Selecciona un centro de costo para cargar sus gastos reales desde Gespro.</p>
          </div>
        </div>

        {grupos.length === 0 ? (
          <div className="empty">No hay presupuestos en PPTO todavía. <Link href="/ppto">Crea uno primero.</Link></div>
        ) : (
          <>
            <div className="busquedafila">
              <div className="buscador">
                <svg className="buscadorico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') setBusqueda('') }}
                  placeholder="Buscar por centro de costo o nombre…"
                  aria-label="Buscar centro de costo"
                  autoComplete="off"
                />
                {busqueda && <button className="buscadorx" onClick={() => setBusqueda('')} title="Borrar búsqueda" aria-label="Borrar búsqueda">✕</button>}
              </div>
              <div className="segfin" role="group" aria-label="Filtrar por revisión del Real Ejecutado">
                <button className={filtroFin === 'todos' ? 'on' : ''} onClick={() => setFiltroFin('todos')}>Todos ({grupos.length})</button>
                <button className={filtroFin === 'pendientes' ? 'on' : ''} onClick={() => setFiltroFin('pendientes')}>Pendientes ({grupos.length - nFinalizados})</button>
                <button className={filtroFin === 'finalizados' ? 'on' : ''} onClick={() => setFiltroFin('finalizados')}>Finalizados ({nFinalizados})</button>
              </div>
              {hayFiltro && <span className="buscadorcuenta">{gruposFiltrados.length} de {grupos.length}</span>}
            </div>
            {gruposFiltrados.length === 0 ? (
              <div className="empty">
                {busqueda.trim()
                  ? <>No hay centros de costo que coincidan con “{busqueda.trim()}”{filtroFin !== 'todos' ? ` entre los ${filtroFin}` : ''}.</>
                  : `No hay centros de costo ${filtroFin}.`}
              </div>
            ) : (
              <>
                <div className="cclistheader">
                  <div className="ccf-cc">Centro de costo</div>
                  <div className="ccf-proy">Proyecto</div>
                  <div className="ccf-cli">Cliente</div>
                  <div className="ccheadbadge">Estado</div>
                  <div className="ccheadfin">Revisión</div>
                </div>
                <div className="cclist">
                  {gruposFiltrados.map(g => {
                    const re = realDe(g.centroCosto)
                    const version = re ? g.versions.find(v => v.id === re.pptoId) : null
                    const fin = re?.finalizado
                    const detalleFin = fin ? `Finalizado por ${fin.por} el ${fechaLarga(fin.fecha)}` : ''
                    return (
                      <div key={g.centroCosto} className={`cccard${fin ? ' cc-fin' : ''}`}>
                        <button className="ccmain" onClick={() => abrirCC(g.centroCosto)}>
                          <span className="ccnum ccf-cc">{g.centroCosto}</span>
                          <span className="ccevento ccf-proy">{g.latest.evento || 'Sin nombre'}</span>
                          <span className="cccliente ccf-cli">{g.latest.cliente || '—'}</span>
                          {version
                            ? <span className="ccbadge ok">Configurado · V{version.version}</span>
                            : <span className="ccbadge pend">Sin iniciar</span>}
                        </button>
                        <div className="ccfin" title={detalleFin}>
                          {puedeFinalizar ? (
                            <label className="finchk">
                              <input
                                type="checkbox"
                                checked={!!fin}
                                onChange={() => setConfirmFin({ cc: g.centroCosto, accion: fin ? 'reabrir' : 'finalizar' })}
                                aria-label={`Real ejecutado finalizado del centro de costo ${g.centroCosto}`}
                              />
                              <span>{fin ? 'Finalizado' : 'Pendiente'}</span>
                            </label>
                          ) : fin ? (
                            <span className="finbadge">✓ Finalizado</span>
                          ) : (
                            <span className="finpend">Pendiente</span>
                          )}
                          {fin && <span className="finquien">{fin.por.split(' ')[0]} · {fechaCorta(fin.fecha)}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  /* ==================== EDITOR ==================== */
  if (!realSel || !budgetSel) return <div className="realej"><Styles /></div>
  // El "ordenado" se suma aquí a partir de los gastos asignados (lo mismo que
  // se ve fila por fila en "Costo real (ordenado)"), no del valor `ordenado`
  // guardado en cada fila del documento del PPTO: ese valor se reescribe en
  // cada asignación y puede quedar desfasado. En el 1861 dos filas conservaban
  // 250.000 y 150.000 de gastos ya movidos a otra fila, y el total salía
  // $400.000 por encima de la suma de la columna (y la utilidad real, por debajo).
  const ordenadoAsignado = budgetSel.rows.reduce(
    (s, r) => s + totalValido(realSel.asignaciones.filter(a => a.rowId === r.id)), 0,
  )
  // Las filas adicionales (gasto que no estaba en el PPTO) son solo gasto: nunca
  // suman a la venta. Se ignora su venta unidad aunque el documento guarde un
  // valor (antes se podía escribir uno en esta pantalla), así el Subtotal, el
  // Total antes de IVA y la utilidad real solo cuentan la venta del PPTO real.
  const presupuestoSoloVenta: PptoBudget = {
    ...budgetSel,
    rows: budgetSel.rows.map(r => r.adicional ? { ...r, costoUnd: 0 } : r),
  }
  const t = { ...calcTotals(presupuestoSoloVenta), ordenado: ordenadoAsignado }
  // La utilidad real del módulo debe descontar TODO el gasto real: lo asignado
  // fila por fila (t.ordenado, que ya incluye cualquier tarjeta/anticipo que se
  // haya clasificado en un rubro) + lo que de tarjeta/anticipos SIGUE sin
  // asignar a ninguna fila (tarjetaPendiente/anticipoPendiente). Así el total
  // nunca cambia por el solo hecho de ir asignando: asignar solo mueve la
  // plata de "sin clasificar" a "esta fila", nunca la suma dos veces.
  const costoRealCompleto = t.ordenado + tarjetaPendiente + anticipoPendiente
  const utilRealCompleta = t.totalAntesIva - costoRealCompleto
  const pctRealCompleto = t.totalAntesIva ? utilRealCompleta / t.totalAntesIva : NaN

  return (
    <div className="realej">
      <Styles />
      {modalFin}
      <div className="breadcrumb">
        <button onClick={volverALanding}>Real Ejecutado</button> / {budgetSel.centroCosto} · V{budgetSel.version}
      </div>
      <div className="pheader">
        <div>
          <h1>{budgetSel.evento || 'Sin nombre'}</h1>
          <p>{budgetSel.cliente || '—'} · Asigna gastos reales de Gespro y Legalizaciones a cada fila del presupuesto.</p>
        </div>
        {puedeFinalizar && (
          bloqueado
            ? <button className="tb" onClick={() => setConfirmFin({ cc: realSel.centroCosto, accion: 'reabrir' })}>Reabrir para editar</button>
            : <button className="tb primary" onClick={() => setConfirmFin({ cc: realSel.centroCosto, accion: 'finalizar' })}>✓ Marcar como finalizado</button>
        )}
      </div>
      {realSel.finalizado && (
        <div className="finbanner">
          <b>✓ Real ejecutado finalizado</b> por {realSel.finalizado.por} ({fechaLarga(realSel.finalizado.fecha)}). Está bloqueado: no se pueden asignar ni quitar gastos ni editar filas.{' '}
          {puedeFinalizar ? 'Usa “Reabrir para editar” si necesitas cambiarlo.' : 'Si necesita cambios, pídele a Francisco, Felipe o Hans que lo reabran.'}
        </div>
      )}

      <div className="gridwrap">
        <table>
          <thead>
            <tr>
              <th>Proceso</th><th className="col-item">Ítem</th><th className="r">Venta unidad</th>
              <th className="r">Cant</th><th className="r">Días</th><th className="r">Venta total</th>
              <th className="r" title="Lo que el presupuesto (PPTO) proyectó gastar en esta fila, no lo que se le cobra al cliente">Costo proyectado</th>
              <th className="col-ordenado">Costo real (ordenado)</th>
              <th className="r" title="Costo real ordenado / costo proyectado">% Ejecutado</th>
            </tr>
          </thead>
          <tbody>
            {budgetSel.rows.map(r => {
              const c = calcRow(r, budgetSel.margenPct)
              const asigsFila = realSel.asignaciones.filter(a => a.rowId === r.id)
              const totalFila = totalValido(asigsFila)
              const pctEjecutado = c.costoRealTotal > 0 ? (totalFila / c.costoRealTotal) * 100 : null
              return (
                <tr key={r.id} className={r.adicional ? 'fila-adicional' : ''}>
                  <td className="col-proc">
                    {r.adicional && !bloqueado
                      ? <input className="in-inline" value={r.proceso} onChange={e => actualizarFila(r.id, { proceso: e.target.value })} />
                      : r.proceso}
                  </td>
                  <td className="col-item">
                    {r.adicional && !bloqueado
                      ? <input className="in-inline" placeholder="Descripción del gasto" value={r.item} onChange={e => actualizarFila(r.id, { item: e.target.value })} />
                      : r.item}
                  </td>
                  {/* Una fila adicional es solo gasto: no tiene venta unidad, cantidad ni días. */}
                  <td className="r">{r.adicional ? '—' : fmt(r.costoUnd)}</td>
                  <td className="r">{r.adicional ? '—' : r.cant}</td>
                  <td className="r">{r.adicional ? '—' : r.dias}</td>
                  <td className="r calc dim">{r.adicional ? '—' : fmt(c.costoTotal)}</td>
                  <td className="r calc">{c.costoRealTotal ? fmt(c.costoRealTotal) : '—'}</td>
                  <td className="ordenadocell">
                    <div className="ordenadototal">{fmt(totalFila)}</div>
                    {asigsFila.map(a => {
                      const nombre = a.modalidad === 'Legalización'
                        ? (() => {
                          const encontrado = encontrarGastoLegalizacion(a.gastoId)
                          return encontrado ? nombreGastoLegalizacion(encontrado.gasto) : null
                        })()
                        : (() => {
                          const o = ordenes.find(x => x.id === a.gastoId)
                          return o ? nombreGasto(o, false) : null
                        })()
                      return (
                        <div key={a.id} className={`asigchip${nombre ? '' : ' asigchip-huerfana'}`} title={nombre ? a.modalidad : 'Este gasto ya no existe en su módulo de origen: no suma al total, quítalo o asigna otro'}>
                          <span className="asignom">{nombre ?? '⚠ Gasto eliminado (no suma)'}</span>
                          <span className="asigmonto">{fmt(a.monto)}</span>
                          {!bloqueado && <button className="asigx" onClick={() => quitarAsignacion(a.id)} title="Quitar">✕</button>}
                        </div>
                      )
                    })}
                    {!bloqueado && (
                      <div className="filaacciones">
                        <button className="addasig" onClick={() => setAsignarRowId(r.id)}>+ Asignar gasto</button>
                        {r.adicional && <button className="quitarfila" onClick={() => eliminarFilaAdicional(r.id)}>Quitar fila</button>}
                      </div>
                    )}
                  </td>
                  <td className="r calc" style={{ color: pctEjecutado == null ? '#9aa398' : pctEjecutado <= 100 ? '#0e7a52' : '#b3261e', fontWeight: 700 }}>
                    {pctEjecutado != null ? pctEjecutado.toFixed(0) + '%' : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>TOTALES</td>
              <td className="r calc">{fmt(t.subtotal)}</td>
              <td className="r calc">{fmt(t.costoProy)}</td>
              <td className="r calc">{fmt(t.ordenado)}</td>
              <td className="r calc">{t.costoProy > 0 ? ((t.ordenado / t.costoProy) * 100).toFixed(0) + '%' : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {!bloqueado && <button className="addfila" onClick={agregarFilaAdicional}>+ Agregar fila adicional</button>}

      <div className="resumen">
        <div className="rescard">
          <h3>Resumen presupuesto</h3>
          <div className="kv"><span>Subtotal</span><span className="num">{money(t.subtotal)}</span></div>
          <div className="kv"><span>Utilidad de agencia ({budgetSel.agenciaPct || 0}%)</span><span className="num">{money(t.utilAgencia)}</span></div>
          <div className="kv total"><span>Total antes de IVA</span><span className="num">{money(t.totalAntesIva)}</span></div>
        </div>
        <div className="rescard">
          <h3>Costo proyectado vs. real</h3>
          <div className="kv"><span>Costo proyectado (PPTO)</span><span className="num">{money(t.costoProy)}</span></div>
          <div className="kv"><span>Costo real total (todo incluido)</span><span className="num">{money(costoRealCompleto)}</span></div>
          <div className="kv total"><span>Diferencia (proy. − real)</span><span className="num" style={{ color: (t.costoProy - costoRealCompleto) >= 0 ? '#0e7a52' : '#b3261e' }}>{money(t.costoProy - costoRealCompleto)}</span></div>
        </div>
        <div className="rescard">
          <h3>Real ejecutado</h3>
          <div className="kv"><span>Compra con tarjeta</span><span className="num">{money(totalTarjeta)}</span></div>
          {tarjetaPendiente > 0 && (
            <div className="kv sub" title="Ya entró a Costo real total, pero todavía no se asignó a ningún rubro/fila puntual">
              <span>↳ sin asignar a un rubro</span><span className="num" style={{ color: '#b3261e' }}>{money(tarjetaPendiente)}</span>
            </div>
          )}
          <div className="kv"><span>Anticipos solicitados</span><span className="num">{money(totalAnticipos)}</span></div>
          {anticipoPendiente > 0 && (
            <div className="kv sub" title="Ya entró a Costo real total, pero todavía no se asignó a ningún rubro/fila puntual">
              <span>↳ sin asignar a un rubro</span><span className="num" style={{ color: '#b3261e' }}>{money(anticipoPendiente)}</span>
            </div>
          )}
          <div className="kv" title="Todas las órdenes de compra del centro de costo en Gespro, estén o no ya asignadas a una fila">
            <span>Órdenes de compra</span>
            <span className="num" style={{ color: totalGespro !== t.ordenado ? '#b3261e' : undefined }}>{money(totalGespro)}</span>
          </div>
          <div className="kv"><span>Total ordenado</span><span className="num">{money(t.ordenado)}</span></div>
          <div className="kv total"><span>Utilidad real</span><span className="num">{money(utilRealCompleta)}</span></div>
          <div className="bigpct num" style={{ color: utilColor(pctRealCompleto) }}>{isFinite(pctRealCompleto) ? (pctRealCompleto * 100).toFixed(1).replace('.', ',') + ' %' : '—'}</div>
          <div className="bar"><i style={{ width: Math.max(0, Math.min(100, (pctRealCompleto || 0) * 100)) + '%', background: utilColor(pctRealCompleto) }}></i></div>
        </div>
      </div>

      {/* Modal: asignar gasto a la fila seleccionada */}
      {asignarRowId && !bloqueado && (
        <div className="modalbg" onClick={() => setAsignarRowId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modaltitle">Asignar gasto a esta fila</div>
            {gastosDisponibles.length === 0 ? (
              <p className="modaltxt">No hay gastos con saldo disponible para el centro de costo {budgetSel.centroCosto}. Verifica en Gespro/Legalizaciones que el gasto esté cargado con este centro de costo.</p>
            ) : (
              <div className="gastolist">
                {gastosDisponibles.map(o => {
                  const saldo = saldoDeId(o.id, o.valor)
                  return (
                    <div key={o.id} className="gastorow">
                      <div className="gastoinfo">
                        <span className="gastomodalidad">{o.modalidad}</span>
                        <span className="gastonombre">{o.label}</span>
                        {o.sublabel && <span className="gastosublabel">{o.sublabel}</span>}
                        {o.valor < 0 && <span className="gastocredito">Devolución o crédito: al asignarlo resta del costo de la fila</span>}
                        <span className="gastosaldo">Saldo {money(saldo)} de {money(o.valor)}</span>
                      </div>
                      <input className="in" style={{ width: 110 }} placeholder={o.valor < 0 ? 'Monto (sin signo)' : 'Monto'}
                        value={montoInputs[o.id] ?? ''}
                        onChange={e => setMontoInputs(prev => ({ ...prev, [o.id]: e.target.value.replace(/\D/g, '') }))} />
                      <button className="tb primary" onClick={() => {
                        // Se escribe el monto sin signo; el signo lo da el gasto (negativo = resta).
                        const monto = Math.sign(saldo) * Math.min(parseInt(montoInputs[o.id] || '0', 10) || 0, Math.abs(saldo))
                        if (monto !== 0) {
                          asignar(asignarRowId, o, monto)
                          setMontoInputs(prev => ({ ...prev, [o.id]: '' }))
                        }
                      }}>Asignar</button>
                    </div>
                  )
                })}
              </div>
            )}
            <button className="modalcancel" onClick={() => setAsignarRowId(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- estilos (scopeados bajo .realej) ---------- */
function Styles() {
  return (
    <style>{`
.realej{padding:24px;font-size:14px;color:#191c19;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
.realej .num{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.realej .pheader{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}
.realej .pheader h1{font-size:24px;font-weight:700;color:#191c19;margin:0}
.realej .pheader p{font-size:14px;color:#6d746c;margin:4px 0 0}
.realej .breadcrumb{font-size:13px;color:#6d746c;margin-bottom:14px}
.realej .breadcrumb button{border:none;background:none;color:#1d4ed8;cursor:pointer;font:inherit;padding:0}
.realej .breadcrumb button:hover{text-decoration:underline}
.realej .empty{background:#fff;border:1px dashed #c8cdc2;border-radius:12px;padding:40px 20px;text-align:center;color:#9aa398;font-size:14px}
.realej .empty a{color:#1d4ed8}
.realej .busquedafila{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.realej .buscador{position:relative;flex:0 1 420px;min-width:0}
.realej .buscador input{width:100%;box-sizing:border-box;font:inherit;font-size:14px;color:#191c19;background:#fff;border:1px solid #dde1d8;border-radius:10px;padding:10px 34px 10px 36px;outline:none}
.realej .buscador input::placeholder{color:#9aa398}
.realej .buscador input:focus{border-color:#0e7a52;box-shadow:0 0 0 3px rgba(14,122,82,.12)}
.realej .buscadorico{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9aa398;pointer-events:none}
.realej .buscadorx{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:none;background:none;color:#9aa398;cursor:pointer;font-size:13px;line-height:1;padding:6px}
.realej .buscadorx:hover{color:#191c19}
.realej .buscadorcuenta{font-size:13px;color:#6d746c;white-space:nowrap}
.realej .cclistheader{display:flex;align-items:center;gap:28px;padding:0 18px;margin-bottom:8px}
.realej .cclistheader>div{font-size:10px;font-weight:600;color:#9aa398;text-transform:uppercase;letter-spacing:.05em}
.realej .ccheadbadge{flex-shrink:0;font-size:10px;font-weight:600;color:#9aa398;text-transform:uppercase;letter-spacing:.05em;min-width:170px;text-align:right}
.realej .cclist{display:flex;flex-direction:column;gap:10px}
.realej .cccard{display:flex;align-items:center;background:#fff;border:1px solid #dde1d8;border-radius:12px;width:100%}
.realej .cccard:hover{border-color:#0e7a52;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.realej .cccard.cc-fin{background:#f6fbf8;border-color:#bfe3d0}
.realej .ccmain{display:flex;align-items:center;gap:28px;flex:1;min-width:0;text-align:left;background:none;border:none;padding:14px 0 14px 18px;cursor:pointer;font:inherit;color:inherit}
.realej .ccheadfin{flex:0 0 150px;font-size:10px;font-weight:600;color:#9aa398;text-transform:uppercase;letter-spacing:.05em}
.realej .ccfin{flex:0 0 150px;margin:0 18px 0 28px;display:flex;flex-direction:column;gap:2px;min-width:0}
.realej .finchk{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:600;color:#6d746c}
.realej .finchk input{width:16px;height:16px;accent-color:#0e7a52;cursor:pointer;margin:0}
.realej .cc-fin .finchk{color:#065F46}
.realej .finbadge{font-size:12px;font-weight:700;color:#065F46}
.realej .finpend{font-size:12px;font-weight:600;color:#9aa398}
.realej .finquien{font-size:11px;color:#6d746c;padding-left:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.realej .segfin{display:flex;border:1px solid #dde1d8;border-radius:10px;overflow:hidden;background:#fff;flex-shrink:0}
.realej .segfin button{border:none;background:none;padding:9px 12px;font:inherit;font-size:13px;color:#6d746c;cursor:pointer;white-space:nowrap}
.realej .segfin button+button{border-left:1px solid #dde1d8}
.realej .segfin button.on{background:#ECFDF5;color:#065F46;font-weight:600}
.realej .finbanner{background:#ECFDF5;border:1px solid #BBF7D0;color:#065F46;border-radius:10px;padding:10px 14px;font-size:13px;line-height:1.5;margin-bottom:14px}
.realej .finlista{list-style:none;margin:6px 0 8px;padding:8px 10px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;max-height:240px;overflow-y:auto}
.realej .finlista li{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#92400E;padding:3px 0}
.realej .finlista li span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.realej .finlista li span.num{flex-shrink:0;font-weight:600}
.realej .gastocredito{font-size:11px;font-weight:600;color:#B45309}
.realej .modalbtns{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}
.realej .tb:disabled{opacity:.6;cursor:default}
.realej .ccf-cc{flex:0 0 100px;min-width:0}
.realej .ccf-proy{flex:2;min-width:0}
.realej .ccf-cli{flex:1.2;min-width:0}
.realej .ccnum{font-size:13px;font-weight:700;color:#0e7a52}
.realej .ccevento{font-size:14px;font-weight:600;color:#191c19;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.realej .cccliente{font-size:13px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.realej .ccbadge{flex-shrink:0;font-size:11px;font-weight:600;border-radius:20px;padding:3px 10px;white-space:nowrap;min-width:170px;text-align:center}
.realej .ccbadge.ok{color:#065F46;background:#ECFDF5}
.realej .ccbadge.pend{color:#92400E;background:#FFFBEB}
.realej .gridwrap{overflow-x:auto;background:#fff;border:1px solid #dde1d8;border-radius:12px;margin-bottom:14px}
.realej table{border-collapse:collapse;width:100%;min-width:1250px}
.realej th{position:sticky;top:0;background:#5b9bd5;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:10px 8px;border-bottom:2px solid #4a86ba;white-space:nowrap}
.realej th.r,.realej td.r{text-align:right}
.realej td{border-bottom:1px solid #dde1d8;padding:8px;vertical-align:top;font-size:13px}
.realej .col-item{min-width:260px}
.realej .col-proc{font-weight:700;text-transform:uppercase;font-size:12px}
.realej .calc{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;white-space:nowrap}
.realej .calc.dim{color:#9aa098}
.realej .col-ordenado{min-width:260px}
.realej .ordenadocell{min-width:260px}
.realej .ordenadototal{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-weight:700;font-size:14px;color:#191c19;margin-bottom:6px}
.realej .asigchip{display:flex;align-items:center;gap:6px;background:#f7f9f3;border:1px solid #e6e9e1;border-radius:8px;padding:4px 8px;margin-bottom:4px;font-size:11px}
.realej .asigchip-huerfana{background:#FFFBEB;border-color:#FDE68A}
.realej .asigchip-huerfana .asignom{color:#92400E}
.realej .asigchip-huerfana .asigmonto{color:#92400E;text-decoration:line-through}
.realej .asignom{flex:1;color:#191c19;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.realej .asigmonto{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#0e7a52;font-weight:700;flex-shrink:0}
.realej .asigx{border:none;background:none;color:#b0b6ad;cursor:pointer;font-size:11px;padding:0 2px;flex-shrink:0}
.realej .asigx:hover{color:#b3261e}
.realej .addasig{border:1px dashed #c8cdc2;background:#fff;color:#0e7a52;border-radius:7px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer}
.realej .addasig:hover{border-color:#0e7a52;background:#f2f8f4}
.realej .filaacciones{display:flex;gap:6px;flex-wrap:wrap}
.realej .quitarfila{border:none;background:none;color:#b91c1c;font-size:11px;font-weight:600;cursor:pointer;padding:4px 2px}
.realej .quitarfila:hover{text-decoration:underline}
.realej .fila-adicional{background:#FEF2F2}
.realej .fila-adicional td{color:#B91C1C}
.realej .fila-adicional .col-proc{color:#B91C1C}
.realej .fila-adicional .calc{color:#B91C1C}
.realej .in-inline{width:100%;border:1px solid #fecaca;border-radius:6px;padding:5px 7px;font:inherit;font-size:12px;background:#fff;color:#B91C1C;box-sizing:border-box}
.realej .in-inline.r{text-align:right}
.realej .in-inline.small{max-width:50px}
.realej .addfila{margin:10px 0 0;border:1px dashed #fca5a5;background:#fff;color:#B91C1C;border-radius:8px;padding:8px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.realej .addfila:hover{border-color:#b91c1c;background:#FEF2F2}
.realej tfoot td{background:#7f7f7f;color:#fff;font-weight:700;border-top:2px solid #666}
.realej .resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;max-width:1080px}
.realej .rescard{background:#fff;border:1px solid #dde1d8;border-radius:12px;padding:14px 16px}
.realej .rescard h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#6d746c}
.realej .kv{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:13.5px}
.realej .kv.sub{padding:0 0 6px;font-size:11px;color:#9aa398}
.realej .kv.sub .num{font-weight:600}
.realej .kv.total{border-top:1px solid #dde1d8;margin-top:6px;padding-top:9px;font-weight:700}
.realej .bigpct{font-size:26px;font-weight:700;margin-top:6px}
.realej .bar{height:10px;border-radius:6px;background:#e6e9e1;overflow:hidden;margin-top:8px}
.realej .bar i{display:block;height:100%;border-radius:6px;transition:width .2s}
.realej .in{border:1px solid #c8cdc2;border-radius:8px;padding:8px 10px;font:inherit;background:#fff;color:#191c19}
.realej .in:focus{outline:2px solid #0e7a5240;border-color:#0e7a52}
.realej .tb{border:1px solid #c8cdc2;background:#fff;color:#374151;border-radius:8px;padding:7px 12px;font:inherit;cursor:pointer;font-weight:500}
.realej .tb.primary{background:#0e7a52;border-color:#0e7a52;color:#fff;font-weight:600}
.realej .tb.primary:hover{background:#0c6a47}
.realej .modalbg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
.realej .modal{background:#fff;border-radius:14px;padding:24px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.15)}
.realej .modaltitle{font-size:16px;font-weight:700;color:#191c19;margin-bottom:8px}
.realej .modaltxt{font-size:13px;color:#6d746c;line-height:1.5;margin:0 0 8px}
.realej .gastolist{display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto}
.realej .gastorow{display:flex;align-items:center;gap:10px;border:1px solid #e6e9e1;border-radius:8px;padding:8px 10px}
.realej .gastoinfo{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.realej .gastomodalidad{font-size:10px;font-weight:600;color:#6d746c;text-transform:uppercase;letter-spacing:.04em}
.realej .gastonombre{font-size:13px;font-weight:600;color:#191c19;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.realej .gastosublabel{font-size:11px;color:#6d746c}
.realej .gastosaldo{font-size:11px;color:#0e7a52;font-weight:600}
.realej .modalcancel{width:100%;border:none;background:none;color:#9aa398;cursor:pointer;font:inherit;padding:12px 0 0;font-size:13px}
.realej .modalcancel:hover{color:#6d746c}
    `}</style>
  )
}
