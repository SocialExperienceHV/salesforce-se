'use client'

// Módulo PPTO — herramienta de presupuestos de Social Experience.
// Lógica de cálculo y exportación a Excel: lib/ppto/calculations.ts y lib/ppto/export.ts
// (portadas VERBATIM desde presupuestos.html). Persistencia: tabla Supabase `presupuestos`
// (patrón JSON-blob {id, data}).
//
// Navegación: Landing (todos los centros de costo) → Versiones (todas las versiones de un
// centro de costo) → Editor (la grilla de un presupuesto puntual). El guardado es manual
// ("Guardar"): si el presupuesto ya existía, siempre pregunta si sobrescribir la versión
// actual o crear una nueva (V1, V2, V3...).

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/lib/store'
import {
  type PptoBudget, type PptoRow,
  fmt, money, pctFmt, parseNum, uid, mkRow,
  emptyBudget, normalize, calcRow, calcTotals, utilColor,
} from '@/lib/ppto/calculations'
import { buildStyledBlob, buildBasicBlob, exportName, type PptoExportVariant } from '@/lib/ppto/export'

const META_FIELDS: [keyof PptoBudget, string, boolean][] = [
  ['centroCosto', 'Centro de costo', false],
  ['cliente', 'Cliente', false],
  ['evento', 'Evento', true],
  ['fecha', 'Fecha', false],
  ['ciudad', 'Ciudad', false],
  ['director', 'Director de proyecto', false],
  ['formaPago', 'Forma de pago', false],
  ['validez', 'Validez de la oferta', false],
]

type Vista = 'landing' | 'versiones' | 'editor'

function nombreArchivo(b: PptoBudget) {
  return `PPTO_${b.centroCosto || 'SC'}_${b.evento || 'presupuesto'}_V${b.version || 1}`
}
function formatFechaCorta(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function ccKey(cc: string) {
  return (cc || '').trim() || 'Sin centro de costo'
}

export default function PptoPage() {
  const { proyectos } = useStore()
  const [budgets, setBudgets] = useState<PptoBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<Vista>('landing')
  const [ccSel, setCcSel] = useState('')
  const [activeId, setActiveId] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [showSaveChoice, setShowSaveChoice] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dl, setDl] = useState<{ url: string; name: string } | null>(null)
  const [avisoBasico, setAvisoBasico] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [nuevoCcInput, setNuevoCcInput] = useState('')
  const [nuevoCcError, setNuevoCcError] = useState('')
  const [searchLanding, setSearchLanding] = useState('')
  const [filtroProductor, setFiltroProductor] = useState('Todos')

  const active = useMemo(() => budgets.find(b => b.id === activeId) ?? null, [budgets, activeId])

  /* ---------- carga inicial ---------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('presupuestos').select('data')
      const list = (data ?? []).map((r: { data: Partial<PptoBudget> }) => normalize(r.data))
      setBudgets(list)
      setLoading(false)
    })()
  }, [])

  /* ---------- agrupación por centro de costo ---------- */
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

  /* ---------- productor (Tráfico → Producción) por centro de costo ---------- */
  function productoresDe(cc: string): string[] {
    const proyecto = proyectos.find(p => (p.centroCosto || '').trim() === cc.trim())
    return proyecto?.personasProduccion ?? []
  }

  /* ---------- búsqueda / filtro de la landing ---------- */
  const productores = useMemo(() => {
    const s = new Set(grupos.flatMap(g => productoresDe(g.centroCosto)))
    return ['Todos', ...s]
  }, [grupos, proyectos])

  const gruposFiltrados = useMemo(() => grupos.filter(g => {
    const q = searchLanding.trim().toLowerCase()
    const matchSearch = !q || g.centroCosto.toLowerCase().includes(q) || (g.latest.evento || '').toLowerCase().includes(q)
    const matchProductor = filtroProductor === 'Todos' || productoresDe(g.centroCosto).includes(filtroProductor)
    return matchSearch && matchProductor
  }), [grupos, searchLanding, filtroProductor, proyectos])
  const grupoSel = grupoDe(ccSel)
  const grupoActivo = active ? grupoDe(active.centroCosto) : null

  /* ---------- helpers de edición local (sin autoguardado) ---------- */
  function invalidarDescarga() {
    setDl(prev => { if (prev) URL.revokeObjectURL(prev.url); return null })
    setAvisoBasico(false)
  }
  function mutateActive(fn: (b: PptoBudget) => PptoBudget) {
    setBudgets(prev => prev.map(b => b.id === activeId ? fn(b) : b))
    setDirty(true)
    invalidarDescarga()
  }
  const setMeta = (k: keyof PptoBudget, v: string | number) => mutateActive(b => ({ ...b, [k]: v }))
  function setCentroCosto(v: string) {
    mutateActive(b => {
      const next = { ...b, centroCosto: v }
      const match = proyectos.find(p => (p.centroCosto || '').trim() && (p.centroCosto || '').trim() === v.trim())
      if (match) {
        if (!next.cliente) next.cliente = match.cliente
        if (!next.evento) next.evento = match.nombre
        if (!next.director) next.director = match.ejecutivo
      }
      return next
    })
  }
  const setRow = (rowId: string, patch: Partial<PptoRow>) =>
    mutateActive(b => ({ ...b, rows: b.rows.map(r => r.id === rowId ? { ...r, ...patch } : r) }))
  const addRow = () => mutateActive(b => {
    const lastP = b.rows.length ? b.rows[b.rows.length - 1].proceso : ''
    return { ...b, rows: [...b.rows, mkRow(lastP, '', 0, 1, 1, 0, 0, '')] }
  })
  const delRow = (rowId: string) => mutateActive(b => ({ ...b, rows: b.rows.filter(r => r.id !== rowId) }))
  const moveRow = (rowId: string, dir: -1 | 1) => mutateActive(b => {
    const i = b.rows.findIndex(r => r.id === rowId); const j = i + dir
    if (i < 0 || j < 0 || j >= b.rows.length) return b
    const rows = [...b.rows];[rows[i], rows[j]] = [rows[j], rows[i]]
    return { ...b, rows }
  })
  const reorder = (fromId: string, toId: string) => mutateActive(b => {
    const from = b.rows.findIndex(r => r.id === fromId), to = b.rows.findIndex(r => r.id === toId)
    if (from < 0 || to < 0 || from === to) return b
    const rows = [...b.rows]; const [moved] = rows.splice(from, 1); rows.splice(to, 0, moved)
    return { ...b, rows }
  })

  /* ---------- navegación ---------- */
  function volverALanding() { setVista('landing'); setCcSel(''); setActiveId(''); setDirty(false) }
  function abrirVersiones(cc: string) { setCcSel(ccKey(cc)); setActiveId(''); setDirty(false); setVista('versiones') }
  function abrirEditor(id: string) { setActiveId(id); setDirty(false); invalidarDescarga(); setVista('editor') }
  function volverAVersiones() {
    if (!active) { volverALanding(); return }
    abrirVersiones(active.centroCosto)
  }

  // Guardas de navegación: si el grupo/documento activo desaparece (p.ej. tras eliminar),
  // redirige a una vista válida en vez de romper el render.
  useEffect(() => {
    if (vista === 'versiones' && !grupoSel) volverALanding()
    if (vista === 'editor' && !active) volverALanding()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista, grupoSel, active])

  /* ---------- crear nuevo presupuesto (V1 de un centro de costo) ---------- */
  async function crearNuevo() {
    const cc = nuevoCcInput.trim()
    if (!cc) { setNuevoCcError('Ingresa un centro de costo.'); return }
    const existente = grupoDe(cc)
    if (existente) {
      setNuevoCcInput(''); setNuevoCcError('')
      abrirVersiones(cc)
      return
    }
    const match = proyectos.find(p => (p.centroCosto || '').trim() === cc)
    const nb = emptyBudget({
      centroCosto: cc,
      cliente: match?.cliente ?? '',
      evento: match?.nombre ?? '',
      director: match?.ejecutivo ?? '',
      version: 1,
    })
    setBudgets(prev => [...prev, nb])
    await supabase.from('presupuestos').insert({ id: nb.id, data: nb })
    setNuevoCcInput(''); setNuevoCcError('')
    abrirEditor(nb.id)
  }

  /* ---------- nueva versión en blanco desde la lista de versiones ---------- */
  async function nuevaVersionEnBlanco() {
    if (!grupoSel) return
    const base = grupoSel.latest
    const nextVersion = Math.max(...grupoSel.versions.map(v => v.version)) + 1
    const nb = emptyBudget({
      centroCosto: base.centroCosto, cliente: base.cliente, evento: base.evento,
      director: base.director, ciudad: base.ciudad, formaPago: base.formaPago, validez: base.validez,
      agenciaPct: base.agenciaPct, margenPct: base.margenPct, version: nextVersion,
    })
    setBudgets(prev => [...prev, nb])
    await supabase.from('presupuestos').insert({ id: nb.id, data: nb })
    abrirEditor(nb.id)
  }

  /* ---------- guardar (siempre pregunta si el documento ya existía) ---------- */
  function guardar() { if (active) setShowSaveChoice(true) }

  async function confirmarSobrescribir() {
    if (!active) return
    setShowSaveChoice(false)
    setSaveMsg('Guardando…')
    const { error } = await supabase.from('presupuestos').update({ data: active }).eq('id', active.id)
    setDirty(false)
    setSaveMsg(error ? 'Sin guardar' : `Guardado · V${active.version}`)
  }
  async function confirmarNuevaVersion() {
    if (!active) return
    setShowSaveChoice(false)
    const nextVersion = grupoActivo ? Math.max(...grupoActivo.versions.map(v => v.version)) + 1 : active.version + 1
    const nb: PptoBudget = { ...JSON.parse(JSON.stringify(active)), id: uid(), version: nextVersion, createdAt: new Date().toISOString() }
    setSaveMsg('Guardando…')
    const { error } = await supabase.from('presupuestos').insert({ id: nb.id, data: nb })
    setBudgets(prev => [...prev, nb])
    setActiveId(nb.id)
    setDirty(false)
    setSaveMsg(error ? 'Sin guardar' : `Guardado · V${nb.version}`)
  }

  /* ---------- eliminar ---------- */
  async function eliminar() {
    if (!active) return
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3500); return }
    const delId = active.id
    const cc = ccKey(active.centroCosto)
    setConfirmDel(false); invalidarDescarga()
    await supabase.from('presupuestos').delete().eq('id', delId)
    const rest = budgets.filter(b => b.id !== delId)
    setBudgets(rest)
    const quedan = rest.some(b => ccKey(b.centroCosto) === cc)
    if (quedan) { setActiveId(''); setCcSel(cc); setDirty(false); setVista('versiones') }
    else volverALanding()
  }

  /* ---------- exportación ---------- */
  async function exportar(variant: PptoExportVariant) {
    if (!active) return
    setExporting(true); invalidarDescarga()
    let blob: Blob | null = null, basico = false
    try { blob = await buildStyledBlob(active, variant) }
    catch (e) {
      console.log('respaldo sin estilos:', (e as Error).message)
      try { blob = buildBasicBlob(active, variant); basico = true } catch (e2) { console.error(e2) }
    }
    setExporting(false)
    if (!blob) { setSaveMsg('Error al exportar'); return }
    const url = URL.createObjectURL(blob)
    const name = exportName(active, variant)
    setDl({ url, name }); setAvisoBasico(basico)
    try {
      const a = document.createElement('a')
      a.href = url; a.download = name
      document.body.appendChild(a); a.click(); a.remove()
    } catch { /* queda el botón azul */ }
  }

  if (loading) {
    return <div className="ppto"><PptoStyles /><div style={{ padding: 40, color: '#9aa398', fontSize: 14 }}>Cargando presupuestos…</div></div>
  }

  /* ==================== LANDING: todos los centros de costo ==================== */
  if (vista === 'landing') {
    return (
      <div className="ppto">
        <PptoStyles />
        <div className="pheader">
          <div>
            <h1>PPTO</h1>
            <p>Selecciona un centro de costo para ver sus presupuestos, o crea uno nuevo.</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: '#6d746c', marginBottom: 6 }}>
            Nuevo presupuesto
          </label>
          <div className="field-inline">
            <input className="in edit" placeholder="Centro de costo (ej. 1529)" value={nuevoCcInput}
              onChange={e => { setNuevoCcInput(e.target.value); setNuevoCcError('') }}
              onKeyDown={e => { if (e.key === 'Enter') crearNuevo() }} />
            <button className="tb primary" onClick={crearNuevo}>+ Nuevo presupuesto</button>
          </div>
          {nuevoCcError && <div className="errtxt">{nuevoCcError}</div>}
          <div className="hint">Si el centro de costo coincide con un proyecto en Vendidos, se autocompletan cliente, evento y director.</div>
        </div>

        {grupos.length === 0 ? (
          <div className="empty">Aún no hay presupuestos. Crea el primero arriba.</div>
        ) : (
          <>
            <div className="filterbar">
              <input className="in" placeholder="Buscar por centro de costo o proyecto..." value={searchLanding}
                onChange={e => setSearchLanding(e.target.value)} style={{ flex: 1 }} />
              <select className="in" value={filtroProductor} onChange={e => setFiltroProductor(e.target.value)} style={{ maxWidth: 220 }}>
                {productores.map(p => <option key={p} value={p}>{p === 'Todos' ? 'Productor: Todos' : p}</option>)}
              </select>
            </div>

            {gruposFiltrados.length === 0 ? (
              <div className="empty">No hay presupuestos que coincidan con la búsqueda.</div>
            ) : (
              <>
                <div className="cclistheader">
                  <div className="ccf-cc">Centro de costo</div>
                  <div className="ccf-proy">Proyecto</div>
                  <div className="ccf-cli">Cliente</div>
                  <div className="ccf-prod">Productor</div>
                  <div className="ccheadbadge">Versiones</div>
                </div>
                <div className="cclist">
                  {gruposFiltrados.map(g => (
                    <button key={g.centroCosto} className="cccard" onClick={() => abrirVersiones(g.centroCosto)}>
                      <span className="ccnum ccf-cc">{g.centroCosto}</span>
                      <span className="ccevento ccf-proy">{g.latest.evento || 'Sin nombre'}</span>
                      <span className="cccliente ccf-cli">{g.latest.cliente || '—'}</span>
                      <span className="ccproductor ccf-prod">{productoresDe(g.centroCosto).join(', ') || '—'}</span>
                      <span className="ccbadge">{g.versions.length} {g.versions.length === 1 ? 'versión' : 'versiones'}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    )
  }

  /* ==================== VERSIONES: todas las versiones de un CC ==================== */
  if (vista === 'versiones') {
    if (!grupoSel) return <div className="ppto"><PptoStyles /></div>
    return (
      <div className="ppto">
        <PptoStyles />
        <div className="breadcrumb"><button onClick={volverALanding}>PPTO</button> / {grupoSel.centroCosto}</div>
        <div className="pheader">
          <div>
            <h1>{grupoSel.latest.evento || 'Sin nombre'}</h1>
            <p>{grupoSel.latest.cliente || '—'} · Centro de costo {grupoSel.centroCosto}</p>
          </div>
          <button className="tb primary" onClick={nuevaVersionEnBlanco}>+ Nueva versión en blanco</button>
        </div>
        <div className="vlist">
          {grupoSel.versions.map(v => {
            const t = calcTotals(v)
            return (
              <button key={v.id} className="vcard" onClick={() => abrirEditor(v.id)}>
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
  if (!active) return <div className="ppto"><PptoStyles /></div>
  const t = calcTotals(active)
  const nextVNum = grupoActivo ? Math.max(...grupoActivo.versions.map(v => v.version)) + 1 : active.version + 1

  return (
    <div className="ppto">
      <PptoStyles />

      <div className="breadcrumb">
        <button onClick={volverALanding}>PPTO</button> / <button onClick={volverAVersiones}>{active.centroCosto || 'Sin centro de costo'}</button> / V{active.version}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="filename">{nombreArchivo(active)}</div>
        <button className="tb danger" onClick={eliminar}>{confirmDel ? '¿Seguro? Toca de nuevo' : 'Eliminar'}</button>
        <button className="tb primary" onClick={() => exportar('cliente')} disabled={exporting}>{exporting ? 'Generando…' : 'Exportar Cliente'}</button>
        <button className="tb primary" onClick={() => exportar('costos')} disabled={exporting}>{exporting ? 'Generando…' : 'Exportar Costos'}</button>
        {dl && <a className="tb dl" href={dl.url} download={dl.name}>⬇ Descargar {dl.name}</a>}
        <button className="tb save" onClick={guardar} disabled={!dirty}>{dirty ? 'Guardar' : 'Guardado'}</button>
        <div className="savestate">{saveMsg}</div>
      </div>

      <div className="sheet">
        {avisoBasico && <div className="aviso show">El archivo se generó sin colores (no cargó el motor de estilos); las fórmulas y la estructura están completas.</div>}

        {/* Datos del evento */}
        <div className="card">
          <div className="meta">
            {META_FIELDS.map(([k, label, wide]) => (
              <div className="field" key={k} style={wide ? { gridColumn: 'span 2' } : undefined}>
                <label>{label}</label>
                <input className="in edit" value={String(active[k] ?? '')}
                  onChange={e => k === 'centroCosto' ? setCentroCosto(e.target.value) : setMeta(k, e.target.value)} />
              </div>
            ))}
            <div className="field">
              <label>Utilidad agencia %</label>
              <input className="in num edit small" inputMode="numeric" value={active.agenciaPct || ''} onChange={e => setMeta('agenciaPct', parseNum(e.target.value))} />
            </div>
            <div className="field">
              <label>Margen venta sugerida %</label>
              <input className="in num edit small" inputMode="numeric" value={active.margenPct || ''} onChange={e => setMeta('margenPct', parseNum(e.target.value))} />
            </div>
          </div>
          <div className="hint">Como en tus modelos de Excel: lo <b>azul</b> se digita, lo negro se calcula solo. Al escribir el centro de costo, si coincide con un proyecto se autocompletan cliente, evento y director.</div>
        </div>

        {/* Grilla */}
        <div className="gridwrap">
          <table>
            <thead>
              <tr>
                <th>Proceso</th><th className="col-item">Ítem</th><th className="r">Costo unidad</th>
                <th className="r">Cant</th><th className="r">Días</th><th className="r">Costo total</th>
                <th className="sep"></th><th className="r">Venta sugerida</th><th className="r">Costo real und</th>
                <th className="r">Costo real total</th><th className="sep"></th><th className="r">Costo total ordenado</th>
                <th>Proveedor</th><th></th><th></th>
              </tr>
            </thead>
            <tbody>
              {active.rows.map((r, idx) => {
                const c = calcRow(r, active.margenPct)
                return (
                  <tr key={r.id}
                    className={dragOverId === r.id && dragId !== r.id ? 'dragover' : ''}
                    onDragOver={e => { if (dragId) { e.preventDefault(); setDragOverId(r.id) } }}
                    onDrop={e => { e.preventDefault(); if (dragId && dragId !== r.id) reorder(dragId, r.id); setDragId(null); setDragOverId(null) }}>
                    <td className="col-proc"><input className="in edit" value={r.proceso} placeholder="PROCESO" onChange={e => setRow(r.id, { proceso: e.target.value })} /></td>
                    <td className="col-item"><input className="in edit" value={r.item} placeholder="Descripción del ítem" onChange={e => setRow(r.id, { item: e.target.value })} /></td>
                    <td className="r col-money"><input className="in num edit" inputMode="numeric" value={r.costoUnd ? fmt(r.costoUnd) : ''} placeholder="0" onChange={e => setRow(r.id, { costoUnd: parseNum(e.target.value) })} /></td>
                    <td className="r"><input className="in num edit small" inputMode="numeric" value={r.cant || ''} placeholder="0" onChange={e => setRow(r.id, { cant: parseNum(e.target.value) })} /></td>
                    <td className="r"><input className="in num edit small" inputMode="numeric" value={r.dias || ''} placeholder="0" onChange={e => setRow(r.id, { dias: parseNum(e.target.value) })} /></td>
                    <td className="r calc">{c.costoTotal ? fmt(c.costoTotal) : '—'}</td>
                    <td className="sep"></td>
                    <td className="r calc dim">{c.ventaSugerida ? fmt(c.ventaSugerida) : '—'}</td>
                    <td className="r col-money"><input className="in num edit" inputMode="numeric" value={r.costoRealUnd ? fmt(r.costoRealUnd) : ''} placeholder="0" onChange={e => setRow(r.id, { costoRealUnd: parseNum(e.target.value) })} /></td>
                    <td className="r calc">{c.costoRealTotal ? fmt(c.costoRealTotal) : '—'}</td>
                    <td className="sep"></td>
                    <td className="r col-money"><input className="in num edit" inputMode="numeric" value={r.ordenado ? fmt(r.ordenado) : ''} placeholder="0" onChange={e => setRow(r.id, { ordenado: parseNum(e.target.value) })} /></td>
                    <td className="col-prov"><input className="in edit" value={r.proveedor} onChange={e => setRow(r.id, { proveedor: e.target.value })} /></td>
                    <td className="movecell">
                      <span className="drag" draggable title="Arrastrar para mover"
                        onDragStart={() => setDragId(r.id)} onDragEnd={() => { setDragId(null); setDragOverId(null) }}>⠿</span>
                      <button className="movebtn" title="Subir fila" disabled={idx === 0} onClick={() => moveRow(r.id, -1)}>▲</button>
                      <button className="movebtn" title="Bajar fila" disabled={idx === active.rows.length - 1} onClick={() => moveRow(r.id, 1)}>▼</button>
                    </td>
                    <td><button className="delbtn" title="Eliminar fila" onClick={() => delRow(r.id)}>✕</button></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTALES</td><td></td><td></td><td></td><td></td>
                <td className="r calc">{fmt(t.subtotal)}</td><td className="sep"></td>
                <td></td><td></td><td className="r calc">{fmt(t.costoProy)}</td><td className="sep"></td>
                <td className="r calc">{fmt(t.ordenado)}</td><td></td><td></td><td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button className="addrow" onClick={addRow}>+ Agregar ítem</button>

        {/* Resumen tipo Excel */}
        <div className="xlsres">
          <div className="xr-head">RESUMEN PRESUPUESTO</div>
          <div className="xr-row"><span>SUBTOTAL</span><span className="xr-money"><span>$</span><span>{fmt(t.subtotal)}</span></span></div>
          <div className="xr-row"><span>UTILIDAD DE AGENCIA</span><span className="xr-money"><span>$</span><span>{fmt(t.utilAgencia)}</span></span></div>
          <div className="xr-gap"></div>
          <div className="xr-row"><span>TOTAL ANTES DE IVA</span><span className="xr-money"><span>$</span><span>{fmt(t.totalAntesIva)}</span></span></div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="resumen">
          <div className="rescard">
            <h3>Resumen presupuesto</h3>
            <div className="kv"><span>Subtotal</span><span className="num">{money(t.subtotal)}</span></div>
            <div className="kv"><span>Utilidad de agencia ({active.agenciaPct || 0}%)</span><span className="num">{money(t.utilAgencia)}</span></div>
            <div className="kv total"><span>Total antes de IVA</span><span className="num">{money(t.totalAntesIva)}</span></div>
          </div>
          <div className="rescard">
            <h3>Proyección</h3>
            <div className="kv"><span>Costo total</span><span className="num">{money(t.costoProy)}</span></div>
            <div className="kv"><span>Utilidad</span><span className="num">{money(t.utilProy)}</span></div>
            <div className="bigpct num" style={{ color: utilColor(t.pctProy) }}>{pctFmt(t.pctProy)}</div>
            <div className="bar"><i style={{ width: Math.max(0, Math.min(100, (t.pctProy || 0) * 100)) + '%', background: utilColor(t.pctProy) }}></i></div>
          </div>
          <div className="rescard">
            <h3>Real ejecutado</h3>
            <div className="kv"><span>Total ordenado</span><span className="num">{money(t.ordenado)}</span></div>
            <div className="kv"><span>Utilidad real</span><span className="num">{money(t.utilReal)}</span></div>
            <div className="bigpct num" style={{ color: utilColor(t.pctReal) }}>{pctFmt(t.pctReal)}</div>
            <div className="bar"><i style={{ width: Math.max(0, Math.min(100, (t.pctReal || 0) * 100)) + '%', background: utilColor(t.pctReal) }}></i></div>
          </div>
        </div>
      </div>

      {showSaveChoice && (
        <div className="modalbg" onClick={() => setShowSaveChoice(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modaltitle">¿Cómo guardas este cambio?</div>
            <p className="modaltxt">Este presupuesto ya existe como <b>V{active.version}</b>. Puedes sobrescribirlo o guardar tus cambios como una versión nueva.</p>
            <div className="modalbtns">
              <button className="tb" onClick={confirmarSobrescribir}>Sobrescribir V{active.version}</button>
              <button className="tb primary" onClick={confirmarNuevaVersion}>Guardar como nueva versión (V{nextVNum})</button>
            </div>
            <button className="modalcancel" onClick={() => setShowSaveChoice(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- estilos (scopeados bajo .ppto para no filtrar al resto de la app) ---------- */
function PptoStyles() {
  return (
    <style>{`
.ppto{padding:24px;font-size:14px;color:#191c19;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
.ppto .num{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.ppto .pheader{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}
.ppto .pheader h1{font-size:24px;font-weight:700;color:#191c19;margin:0}
.ppto .pheader p{font-size:14px;color:#6d746c;margin:4px 0 0}
.ppto .breadcrumb{font-size:13px;color:#6d746c;margin-bottom:14px}
.ppto .breadcrumb button{border:none;background:none;color:#1d4ed8;cursor:pointer;font:inherit;padding:0}
.ppto .breadcrumb button:hover{text-decoration:underline}
.ppto .field-inline{display:flex;gap:8px;align-items:center}
.ppto .field-inline .in{max-width:260px}
.ppto .errtxt{font-size:12px;color:#b3261e;margin-top:6px}
.ppto .empty{background:#fff;border:1px dashed #c8cdc2;border-radius:12px;padding:40px 20px;text-align:center;color:#9aa398;font-size:14px}
.ppto .filterbar{display:flex;gap:10px;margin-bottom:14px}
.ppto .cclistheader{display:flex;align-items:center;gap:28px;padding:0 18px;margin-bottom:8px}
.ppto .cclistheader>div{font-size:10px;font-weight:600;color:#9aa398;text-transform:uppercase;letter-spacing:.05em}
.ppto .ccheadbadge{flex-shrink:0;font-size:10px;font-weight:600;color:#9aa398;text-transform:uppercase;letter-spacing:.05em;min-width:80px;text-align:right}
.ppto .cclist{display:flex;flex-direction:column;gap:10px}
.ppto .cccard{display:flex;align-items:center;gap:28px;text-align:left;background:#fff;border:1px solid #dde1d8;border-radius:12px;padding:14px 18px;cursor:pointer;font:inherit;width:100%}
.ppto .cccard:hover{border-color:#0e7a52;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.ppto .ccf-cc{flex:0 0 100px;min-width:0}
.ppto .ccf-proy{flex:2;min-width:0}
.ppto .ccf-cli{flex:1.2;min-width:0}
.ppto .ccf-prod{flex:1.2;min-width:0}
.ppto .ccnum{font-size:13px;font-weight:700;color:#0e7a52}
.ppto .ccevento{font-size:14px;font-weight:600;color:#191c19;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ppto .cccliente{font-size:13px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ppto .ccproductor{font-size:13px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ppto .ccbadge{flex-shrink:0;font-size:11px;font-weight:600;color:#6d746c;background:#eef0ea;border-radius:20px;padding:3px 10px;white-space:nowrap;min-width:80px;text-align:center}
.ppto .vlist{display:flex;flex-direction:column;gap:10px}
.ppto .vcard{display:flex;align-items:center;gap:16px;text-align:left;background:#fff;border:1px solid #dde1d8;border-radius:10px;padding:14px 16px;cursor:pointer;font:inherit;width:100%}
.ppto .vcard:hover{border-color:#0e7a52}
.ppto .vnum{font-size:13px;font-weight:700;color:#fff;background:#0e7a52;border-radius:6px;padding:4px 10px;flex-shrink:0}
.ppto .vinfo{flex:1}
.ppto .vevento{font-size:14px;font-weight:600;color:#191c19}
.ppto .vfecha{font-size:12px;color:#6d746c;margin-top:2px}
.ppto .vtotal{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-size:14px;font-weight:700;color:#191c19}
.ppto .filename{font-size:12px;color:#6d746c;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;margin-right:auto}
.ppto .toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px}
.ppto .toolbar select{border:1px solid #c8cdc2;border-radius:8px;padding:7px 10px;font:inherit;background:#fff;color:#191c19;max-width:340px}
.ppto .tb{border:1px solid #c8cdc2;background:#fff;color:#374151;border-radius:8px;padding:7px 12px;font:inherit;cursor:pointer;font-weight:500}
.ppto .tb:hover{background:#f3f4f6}
.ppto .tb:disabled{opacity:.5;cursor:default}
.ppto .tb:disabled:hover{background:#fff}
.ppto .tb.primary{background:#0e7a52;border-color:#0e7a52;color:#fff;font-weight:600}
.ppto .tb.primary:hover{background:#0c6a47}
.ppto .tb.primary:disabled{opacity:.6;cursor:wait}
.ppto .tb.danger:hover{background:#fef2f2;border-color:#fca5a5;color:#b3261e}
.ppto .tb.dl{background:#1d4ed8;border-color:#1d4ed8;color:#fff;font-weight:700;text-decoration:none;display:inline-block}
.ppto .tb.dl:hover{background:#1a44bd}
.ppto .tb.save{background:#1d4ed8;border-color:#1d4ed8;color:#fff;font-weight:700}
.ppto .tb.save:hover{background:#1a44bd}
.ppto .tb.save:disabled{background:#eef0ea;border-color:#dde1d8;color:#9aa398}
.ppto .savestate{margin-left:8px;font-size:12px;color:#9aa398}
.ppto .sheet{max-width:1400px}
.ppto .aviso{display:none;font-size:12px;color:#6d746c;padding:8px 2px}
.ppto .aviso.show{display:block}
.ppto .card{background:#fff;border:1px solid #dde1d8;border-radius:12px;padding:14px 16px;margin-bottom:14px}
.ppto .meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.ppto .field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6d746c;margin-bottom:4px}
.ppto .in{width:100%;border:1px solid #c8cdc2;border-radius:8px;padding:8px 10px;font:inherit;background:#fff;color:#191c19}
.ppto .in:focus{outline:2px solid #0e7a5240;border-color:#0e7a52}
.ppto .edit{color:#1d4ed8;font-weight:500}
.ppto .hint{font-size:12px;color:#6d746c;margin-top:10px}
.ppto .hint b{color:#1d4ed8}
.ppto .gridwrap{overflow-x:auto;background:#fff;border:1px solid #dde1d8;border-radius:12px}
.ppto table{border-collapse:collapse;width:100%;min-width:1250px}
.ppto th{position:sticky;top:0;background:#5b9bd5;color:#fff;font-size:11px;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:10px 8px;border-bottom:2px solid #4a86ba;white-space:nowrap;z-index:2}
.ppto th.r,.ppto td.r{text-align:right}
.ppto th.sep,.ppto td.sep{background:#eef0ea;min-width:14px;padding:0;border-bottom:1px solid #dde1d8}
.ppto td{border-bottom:1px solid #dde1d8;padding:4px 6px;vertical-align:middle}
.ppto tbody tr:hover td:not(.sep){background:#f7f9f3}
.ppto td .in{border-color:transparent;background:transparent;padding:6px}
.ppto td .in:hover{border-color:#c8cdc2}
.ppto td .in:focus{background:#fff}
.ppto .calc{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;padding:6px;white-space:nowrap}
.ppto .calc.dim{color:#9aa098}
.ppto .col-item{min-width:320px}
.ppto .col-proc .in{width:120px;font-weight:700;text-transform:uppercase;font-size:12px}
.ppto .small{width:58px;text-align:right}
.ppto .col-money .in{width:116px;text-align:right}
.ppto .col-prov .in{width:110px}
.ppto .delbtn{border:none;background:none;color:#b0b6ad;cursor:pointer;font-size:15px;padding:4px 6px;border-radius:6px}
.ppto .delbtn:hover{color:#b3261e;background:#f6e4e2}
.ppto tfoot td{background:#7f7f7f;color:#fff;font-weight:700;border-top:2px solid #666}
.ppto tfoot td.sep{background:#eef0ea}
.ppto .addrow{margin:10px 0 0;border:1px dashed #c8cdc2;background:#fff;color:#0e7a52;border-radius:8px;padding:8px 14px;font:inherit;cursor:pointer;font-weight:600}
.ppto .addrow:hover{border-color:#0e7a52;background:#f2f8f4}
.ppto .resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:14px}
.ppto .rescard{background:#fff;border:1px solid #dde1d8;border-radius:12px;padding:14px 16px}
.ppto .rescard h3{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:#6d746c}
.ppto .kv{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:13.5px}
.ppto .kv.total{border-top:1px solid #dde1d8;margin-top:6px;padding-top:9px;font-weight:700}
.ppto .bigpct{font-size:26px;font-weight:700;margin-top:6px}
.ppto .bar{height:10px;border-radius:6px;background:#e6e9e1;overflow:hidden;margin-top:8px}
.ppto .bar i{display:block;height:100%;border-radius:6px;transition:width .2s}
.ppto .xlsres{max-width:640px;margin-top:16px;border:1px solid #cfd4ca;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.ppto .xr-head{background:#5b9bd5;color:#fff;font-weight:700;text-align:center;padding:7px 10px;letter-spacing:.02em;font-size:13px}
.ppto .xr-row{display:flex;justify-content:space-between;align-items:center;background:#000;color:#fff;font-weight:700;padding:7px 12px;border-top:1px solid #333;font-size:13.5px}
.ppto .xr-money{display:flex;justify-content:space-between;min-width:190px;gap:10px;font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.ppto .xr-gap{height:20px;background:#fff}
.ppto .movecell{white-space:nowrap;padding:0 2px}
.ppto .movebtn{border:1px solid #d5dad0;background:#fff;color:#5c635a;cursor:pointer;font-size:13px;padding:5px 7px;border-radius:6px;line-height:1;margin-left:3px}
.ppto .movebtn:hover{color:#0e7a52;background:#e9f3ec;border-color:#0e7a52}
.ppto .movebtn:disabled{opacity:.25;cursor:default}
.ppto .drag{cursor:grab;color:#9aa098;font-size:15px;padding:2px 4px;user-select:none;vertical-align:middle}
.ppto .drag:active{cursor:grabbing}
.ppto tr.dragover td{box-shadow:inset 0 3px 0 #0e7a52}
.ppto .modalbg{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
.ppto .modal{background:#fff;border-radius:14px;padding:24px;width:420px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.15)}
.ppto .modaltitle{font-size:16px;font-weight:700;color:#191c19;margin-bottom:8px}
.ppto .modaltxt{font-size:13px;color:#6d746c;line-height:1.5;margin:0 0 18px}
.ppto .modalbtns{display:flex;flex-direction:column;gap:8px}
.ppto .modalbtns .tb{width:100%;padding:10px 14px}
.ppto .modalcancel{width:100%;border:none;background:none;color:#9aa398;cursor:pointer;font:inherit;padding:10px 0 0;font-size:13px}
.ppto .modalcancel:hover{color:#6d746c}
    `}</style>
  )
}
