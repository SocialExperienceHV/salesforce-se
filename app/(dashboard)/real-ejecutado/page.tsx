'use client'

// Módulo Real Ejecutado — conecta un presupuesto de PPTO (ya cerrado y vendido) con
// los gastos reales cargados en Gespro 2.0 (Órdenes de compra, Compra con tarjeta,
// Anticipos) para llenar la columna "Costo Total Ordenado" con datos reales en vez
// de un número escrito a mano. Persistencia: tabla Supabase `real_ejecutado`
// (JSON-blob {id, data}, una fila por centro de costo) + escribe de vuelta el total
// asignado por fila en `PptoRow.ordenado` (tabla `presupuestos`) para que el propio
// módulo PPTO y su exportación a Excel queden sincronizados automáticamente.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import {
  type PptoBudget, fmt, money, calcTotals, calcRow, utilColor,
} from '@/lib/ppto/calculations'
import {
  getOrdenesGespro, getProveedoresGespro, nombreProveedorGespro,
  type OrdenGespro, type ProveedorGespro, type ModalidadGastoGespro,
} from '@/lib/queries/gespro'
import {
  getRealEjecutados, guardarRealEjecutado, uid,
  type RealEjecutado, type AsignacionGasto,
} from '@/lib/real-ejecutado'

type Vista = 'landing' | 'seleccionVersion' | 'editor'

function ccKey(cc: string) {
  return (cc || '').trim() || 'Sin centro de costo'
}
function formatFechaCorta(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function RealEjecutadoPage() {
  const { tarjetasCorp, proyectos } = useStore()
  const [budgets, setBudgets] = useState<PptoBudget[]>([])
  const [reales, setReales] = useState<RealEjecutado[]>([])
  const [ordenes, setOrdenes] = useState<OrdenGespro[]>([])
  const [proveedores, setProveedores] = useState<ProveedorGespro[]>([])
  const [loading, setLoading] = useState(true)

  const [vista, setVista] = useState<Vista>('landing')
  const [ccSel, setCcSel] = useState('')
  const [asignarRowId, setAsignarRowId] = useState<string | null>(null)
  const [montoInputs, setMontoInputs] = useState<Record<string, string>>({})

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
    }).sort((a, b) => (b.latest.createdAt || '').localeCompare(a.latest.createdAt || ''))
  }, [budgets])

  function grupoDe(cc: string) {
    return grupos.find(g => g.centroCosto === ccKey(cc)) ?? null
  }
  function realDe(cc: string) {
    return reales.find(r => r.centroCosto === ccKey(cc)) ?? null
  }

  const grupoSel = grupoDe(ccSel)
  const realSel = realDe(ccSel)
  const budgetSel = realSel ? budgets.find(b => b.id === realSel.pptoId) ?? null : null

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

  function saldoDe(o: OrdenGespro): number {
    const asignado = (realSel?.asignaciones ?? []).filter(a => a.gastoId === o.id).reduce((s, a) => s + a.monto, 0)
    return o.valor - asignado
  }

  // Solo Órdenes de compra se asignan fila por fila. Compra con tarjeta y Anticipos
  // se toman como un total automático del centro de costo (ver totalTarjeta/totalAnticipos
  // más abajo), así que no aparecen como opción para asignar a una fila puntual.
  const gastosDisponibles = useMemo(
    () => gastosCC.filter(o => o.modalidad === 'Orden de compra' && saldoDe(o) > 0),
    [gastosCC, realSel],
  )

  const totalTarjeta = useMemo(
    () => gastosCC.filter(o => o.modalidad === 'Compra con tarjeta').reduce((s, o) => s + o.valor, 0),
    [gastosCC],
  )
  const totalAnticipos = useMemo(
    () => gastosCC.filter(o => o.modalidad === 'Anticipo').reduce((s, o) => s + o.valor, 0),
    [gastosCC],
  )

  /* ---------- navegación ---------- */
  function volverALanding() { setVista('landing'); setCcSel(''); setAsignarRowId(null) }
  function abrirCC(cc: string) {
    setCcSel(ccKey(cc))
    setVista(realDe(cc) ? 'editor' : 'seleccionVersion')
  }

  useEffect(() => {
    if (vista === 'seleccionVersion' && !grupoSel) volverALanding()
    if (vista === 'editor' && (!realSel || !budgetSel)) volverALanding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, grupoSel, realSel, budgetSel])

  async function elegirVersion(pptoId: string) {
    const re: RealEjecutado = { centroCosto: ccSel, pptoId, asignaciones: [] }
    setReales(prev => [...prev.filter(r => r.centroCosto !== ccSel), re])
    await guardarRealEjecutado(re)
    setVista('editor')
  }

  /* ---------- asignar / quitar gastos ---------- */
  async function persistirReal(re: RealEjecutado) {
    setReales(prev => [...prev.filter(r => r.centroCosto !== re.centroCosto), re])
    await guardarRealEjecutado(re)
  }

  async function actualizarOrdenadoFila(budget: PptoBudget, rowId: string, nuevoTotal: number) {
    const actualizado: PptoBudget = { ...budget, rows: budget.rows.map(r => r.id === rowId ? { ...r, ordenado: nuevoTotal } : r) }
    setBudgets(prev => prev.map(b => b.id === actualizado.id ? actualizado : b))
    await supabase.from('presupuestos').update({ data: actualizado }).eq('id', actualizado.id)
  }

  async function asignar(rowId: string, gasto: OrdenGespro, monto: number) {
    if (!realSel || !budgetSel || monto <= 0) return
    const nueva: AsignacionGasto = { id: uid(), rowId, gastoId: gasto.id, modalidad: gasto.modalidad, monto, createdAt: new Date().toISOString() }
    const actualizado: RealEjecutado = { ...realSel, asignaciones: [...realSel.asignaciones, nueva] }
    await persistirReal(actualizado)
    const totalFila = actualizado.asignaciones.filter(a => a.rowId === rowId).reduce((s, a) => s + a.monto, 0)
    await actualizarOrdenadoFila(budgetSel, rowId, totalFila)
  }

  async function quitarAsignacion(asigId: string) {
    if (!realSel || !budgetSel) return
    const asig = realSel.asignaciones.find(a => a.id === asigId)
    if (!asig) return
    const actualizado: RealEjecutado = { ...realSel, asignaciones: realSel.asignaciones.filter(a => a.id !== asigId) }
    await persistirReal(actualizado)
    const totalFila = actualizado.asignaciones.filter(a => a.rowId === asig.rowId).reduce((s, a) => s + a.monto, 0)
    await actualizarOrdenadoFila(budgetSel, asig.rowId, totalFila)
  }

  if (loading) {
    return <div className="realej"><Styles /><div style={{ padding: 40, color: '#9aa398', fontSize: 14 }}>Cargando...</div></div>
  }

  /* ==================== LANDING ==================== */
  if (vista === 'landing') {
    return (
      <div className="realej">
        <Styles />
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
            <div className="cclistheader">
              <div className="ccf-cc">Centro de costo</div>
              <div className="ccf-proy">Proyecto</div>
              <div className="ccf-cli">Cliente</div>
              <div className="ccheadbadge">Estado</div>
            </div>
            <div className="cclist">
              {grupos.map(g => {
                const re = realDe(g.centroCosto)
                const version = re ? g.versions.find(v => v.id === re.pptoId) : null
                return (
                  <button key={g.centroCosto} className="cccard" onClick={() => abrirCC(g.centroCosto)}>
                    <span className="ccnum ccf-cc">{g.centroCosto}</span>
                    <span className="ccevento ccf-proy">{g.latest.evento || 'Sin nombre'}</span>
                    <span className="cccliente ccf-cli">{g.latest.cliente || '—'}</span>
                    {version
                      ? <span className="ccbadge ok">Configurado · V{version.version}</span>
                      : <span className="ccbadge pend">Falta elegir versión</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    )
  }

  /* ==================== SELECCIÓN DE VERSIÓN ==================== */
  if (vista === 'seleccionVersion') {
    if (!grupoSel) return <div className="realej"><Styles /></div>
    return (
      <div className="realej">
        <Styles />
        <div className="breadcrumb"><button onClick={volverALanding}>Real Ejecutado</button> / {grupoSel.centroCosto}</div>
        <div className="pheader">
          <div>
            <h1>{grupoSel.latest.evento || 'Sin nombre'}</h1>
            <p>{grupoSel.latest.cliente || '—'} · Selecciona cuál versión del PPTO fue la que se vendió.</p>
          </div>
        </div>
        <div className="vlist">
          {grupoSel.versions.map(v => {
            const t = calcTotals(v)
            return (
              <button key={v.id} className="vcard" onClick={() => elegirVersion(v.id)}>
                <div className="vnum">V{v.version}</div>
                <div className="vinfo">
                  <div className="vevento">{v.evento || 'Sin nombre'}</div>
                  <div className="vfecha">Guardado {formatFechaCorta(v.createdAt)}</div>
                </div>
                <div className="vtotal">{money(t.totalAntesIva)}</div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  /* ==================== EDITOR ==================== */
  if (!realSel || !budgetSel) return <div className="realej"><Styles /></div>
  const t = calcTotals(budgetSel)
  // La utilidad real del módulo debe descontar TODO el gasto real: órdenes de
  // compra asignadas por fila (t.ordenado) + compra con tarjeta + anticipos, no
  // solo lo ordenado (que es lo único que entra en calcTotals/PPTO).
  const costoRealCompleto = t.ordenado + totalTarjeta + totalAnticipos
  const utilRealCompleta = t.totalAntesIva - costoRealCompleto
  const pctRealCompleto = t.totalAntesIva ? utilRealCompleta / t.totalAntesIva : NaN

  return (
    <div className="realej">
      <Styles />
      <div className="breadcrumb">
        <button onClick={volverALanding}>Real Ejecutado</button> / {budgetSel.centroCosto} · V{budgetSel.version}
      </div>
      <div className="pheader">
        <div>
          <h1>{budgetSel.evento || 'Sin nombre'}</h1>
          <p>{budgetSel.cliente || '—'} · Asigna gastos reales de Gespro a cada fila del presupuesto.</p>
        </div>
      </div>

      <div className="gridwrap">
        <table>
          <thead>
            <tr>
              <th>Proceso</th><th className="col-item">Ítem</th><th className="r">Costo unidad</th>
              <th className="r">Cant</th><th className="r">Días</th><th className="r">Costo total</th>
              <th className="col-ordenado">Costo total ordenado (real)</th>
            </tr>
          </thead>
          <tbody>
            {budgetSel.rows.map(r => {
              const c = calcRow(r, budgetSel.margenPct)
              const asigsFila = realSel.asignaciones.filter(a => a.rowId === r.id)
              const totalFila = asigsFila.reduce((s, a) => s + a.monto, 0)
              return (
                <tr key={r.id}>
                  <td className="col-proc">{r.proceso}</td>
                  <td className="col-item">{r.item}</td>
                  <td className="r">{fmt(r.costoUnd)}</td>
                  <td className="r">{r.cant}</td>
                  <td className="r">{r.dias}</td>
                  <td className="r calc">{fmt(c.costoTotal)}</td>
                  <td className="ordenadocell">
                    <div className="ordenadototal">{fmt(totalFila)}</div>
                    {asigsFila.map(a => {
                      const o = ordenes.find(x => x.id === a.gastoId)
                      return (
                        <div key={a.id} className="asigchip">
                          <span className="asignom">{o ? nombreGasto(o, false) : 'Gasto eliminado'}</span>
                          <span className="asigmonto">{fmt(a.monto)}</span>
                          <button className="asigx" onClick={() => quitarAsignacion(a.id)} title="Quitar">✕</button>
                        </div>
                      )
                    })}
                    <button className="addasig" onClick={() => setAsignarRowId(r.id)}>+ Asignar gasto</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>TOTALES</td>
              <td className="r calc">{fmt(t.subtotal)}</td>
              <td className="r calc">{fmt(t.ordenado)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="resumen">
        <div className="rescard">
          <h3>Resumen presupuesto</h3>
          <div className="kv"><span>Subtotal</span><span className="num">{money(t.subtotal)}</span></div>
          <div className="kv"><span>Utilidad de agencia ({budgetSel.agenciaPct || 0}%)</span><span className="num">{money(t.utilAgencia)}</span></div>
          <div className="kv total"><span>Total antes de IVA</span><span className="num">{money(t.totalAntesIva)}</span></div>
        </div>
        <div className="rescard">
          <h3>Real ejecutado</h3>
          <div className="kv"><span>Compra con tarjeta</span><span className="num">{money(totalTarjeta)}</span></div>
          <div className="kv"><span>Anticipos solicitados</span><span className="num">{money(totalAnticipos)}</span></div>
          <div className="kv"><span>Total ordenado</span><span className="num">{money(t.ordenado)}</span></div>
          <div className="kv total"><span>Utilidad real</span><span className="num">{money(utilRealCompleta)}</span></div>
          <div className="bigpct num" style={{ color: utilColor(pctRealCompleto) }}>{isFinite(pctRealCompleto) ? (pctRealCompleto * 100).toFixed(1).replace('.', ',') + ' %' : '—'}</div>
          <div className="bar"><i style={{ width: Math.max(0, Math.min(100, (pctRealCompleto || 0) * 100)) + '%', background: utilColor(pctRealCompleto) }}></i></div>
        </div>
      </div>

      {/* Modal: asignar gasto a la fila seleccionada */}
      {asignarRowId && (
        <div className="modalbg" onClick={() => setAsignarRowId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modaltitle">Asignar gasto a esta fila</div>
            {gastosDisponibles.length === 0 ? (
              <p className="modaltxt">No hay gastos con saldo disponible para el centro de costo {budgetSel.centroCosto}. Verifica en Gespro que la orden/anticipo/tarjeta esté cargada con este centro de costo.</p>
            ) : (
              <div className="gastolist">
                {gastosDisponibles.map(o => {
                  const saldo = saldoDe(o)
                  return (
                    <div key={o.id} className="gastorow">
                      <div className="gastoinfo">
                        <span className="gastomodalidad">{o.modalidad}</span>
                        <span className="gastonombre">{nombreGasto(o)}</span>
                        <span className="gastosaldo">Saldo {money(saldo)} de {money(o.valor)}</span>
                      </div>
                      <input className="in" style={{ width: 110 }} placeholder="Monto"
                        value={montoInputs[o.id] ?? ''}
                        onChange={e => setMontoInputs(prev => ({ ...prev, [o.id]: e.target.value.replace(/\D/g, '') }))} />
                      <button className="tb primary" onClick={() => {
                        const monto = Math.min(parseInt(montoInputs[o.id] || '0', 10) || 0, saldo)
                        if (monto > 0) {
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
.realej .cclistheader{display:flex;align-items:center;gap:28px;padding:0 18px;margin-bottom:8px}
.realej .cclistheader>div{font-size:10px;font-weight:600;color:#9aa398;text-transform:uppercase;letter-spacing:.05em}
.realej .ccheadbadge{flex-shrink:0;font-size:10px;font-weight:600;color:#9aa398;text-transform:uppercase;letter-spacing:.05em;min-width:170px;text-align:right}
.realej .cclist{display:flex;flex-direction:column;gap:10px}
.realej .cccard{display:flex;align-items:center;gap:28px;text-align:left;background:#fff;border:1px solid #dde1d8;border-radius:12px;padding:14px 18px;cursor:pointer;font:inherit;width:100%}
.realej .cccard:hover{border-color:#0e7a52;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.realej .ccf-cc{flex:0 0 100px;min-width:0}
.realej .ccf-proy{flex:2;min-width:0}
.realej .ccf-cli{flex:1.2;min-width:0}
.realej .ccnum{font-size:13px;font-weight:700;color:#0e7a52}
.realej .ccevento{font-size:14px;font-weight:600;color:#191c19;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.realej .cccliente{font-size:13px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.realej .ccbadge{flex-shrink:0;font-size:11px;font-weight:600;border-radius:20px;padding:3px 10px;white-space:nowrap;min-width:170px;text-align:center}
.realej .ccbadge.ok{color:#065F46;background:#ECFDF5}
.realej .ccbadge.pend{color:#92400E;background:#FFFBEB}
.realej .vlist{display:flex;flex-direction:column;gap:10px}
.realej .vcard{display:flex;align-items:center;gap:16px;text-align:left;background:#fff;border:1px solid #dde1d8;border-radius:10px;padding:14px 16px;cursor:pointer;font:inherit;width:100%}
.realej .vcard:hover{border-color:#0e7a52}
.realej .vnum{font-size:13px;font-weight:700;color:#fff;background:#0e7a52;border-radius:6px;padding:4px 10px;flex-shrink:0}
.realej .vinfo{flex:1}
.realej .vevento{font-size:14px;font-weight:600;color:#191c19}
.realej .vfecha{font-size:12px;color:#6d746c;margin-top:2px}
.realej .vtotal{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:14px;font-weight:700;color:#191c19}
.realej .gridwrap{overflow-x:auto;background:#fff;border:1px solid #dde1d8;border-radius:12px;margin-bottom:14px}
.realej table{border-collapse:collapse;width:100%;min-width:1000px}
.realej th{position:sticky;top:0;background:#5b9bd5;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:10px 8px;border-bottom:2px solid #4a86ba;white-space:nowrap}
.realej th.r,.realej td.r{text-align:right}
.realej td{border-bottom:1px solid #dde1d8;padding:8px;vertical-align:top;font-size:13px}
.realej .col-item{min-width:260px}
.realej .col-proc{font-weight:700;text-transform:uppercase;font-size:12px}
.realej .calc{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;white-space:nowrap}
.realej .col-ordenado{min-width:260px}
.realej .ordenadocell{min-width:260px}
.realej .ordenadototal{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-weight:700;font-size:14px;color:#191c19;margin-bottom:6px}
.realej .asigchip{display:flex;align-items:center;gap:6px;background:#f7f9f3;border:1px solid #e6e9e1;border-radius:8px;padding:4px 8px;margin-bottom:4px;font-size:11px}
.realej .asignom{flex:1;color:#191c19;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.realej .asigmonto{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;color:#0e7a52;font-weight:700;flex-shrink:0}
.realej .asigx{border:none;background:none;color:#b0b6ad;cursor:pointer;font-size:11px;padding:0 2px;flex-shrink:0}
.realej .asigx:hover{color:#b3261e}
.realej .addasig{border:1px dashed #c8cdc2;background:#fff;color:#0e7a52;border-radius:7px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer}
.realej .addasig:hover{border-color:#0e7a52;background:#f2f8f4}
.realej tfoot td{background:#7f7f7f;color:#fff;font-weight:700;border-top:2px solid #666}
.realej .resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;max-width:700px}
.realej .rescard{background:#fff;border:1px solid #dde1d8;border-radius:12px;padding:14px 16px}
.realej .rescard h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#6d746c}
.realej .kv{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:13.5px}
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
.realej .gastosaldo{font-size:11px;color:#0e7a52;font-weight:600}
.realej .modalcancel{width:100%;border:none;background:none;color:#9aa398;cursor:pointer;font:inherit;padding:12px 0 0;font-size:13px}
.realej .modalcancel:hover{color:#6d746c}
    `}</style>
  )
}
