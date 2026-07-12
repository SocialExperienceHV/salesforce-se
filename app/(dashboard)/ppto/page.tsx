'use client'

// Módulo PPTO — herramienta de presupuestos de Social Experience.
// Lógica de cálculo y exportación a Excel: lib/ppto/calculations.ts y lib/ppto/export.ts
// (portadas VERBATIM desde presupuestos.html). Persistencia: tabla Supabase `presupuestos`
// (patrón JSON-blob {id, data}) con guardado debounced e indicador "Guardado ✓".

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  type PptoBudget, type PptoRow,
  fmt, money, pctFmt, parseNum, uid, mkRow,
  seedBudget, emptyBudget, normalize, calcRow, calcTotals, utilColor,
} from '@/lib/ppto/calculations'
import { buildStyledBlob, buildBasicBlob, exportName } from '@/lib/ppto/export'

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

export default function PptoPage() {
  const [budgets, setBudgets] = useState<PptoBudget[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState('Guardado ✓')
  const [confirmDel, setConfirmDel] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dl, setDl] = useState<{ url: string; name: string } | null>(null)
  const [avisoBasico, setAvisoBasico] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const budgetsRef = useRef<PptoBudget[]>([])
  const activeIdRef = useRef<string>('')
  budgetsRef.current = budgets
  activeIdRef.current = activeId

  const active = useMemo(() => budgets.find(b => b.id === activeId) ?? budgets[0], [budgets, activeId])

  /* ---------- carga inicial ---------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('presupuestos').select('data')
      let list = (data ?? []).map((r: { data: Partial<PptoBudget> }) => normalize(r.data))
      if (list.length === 0) {
        const s = seedBudget()
        await supabase.from('presupuestos').insert({ id: s.id, data: s })
        list = [s]
      }
      setBudgets(list)
      const stored = typeof window !== 'undefined' ? localStorage.getItem('ppto-active-id') : null
      setActiveId(stored && list.find(b => b.id === stored) ? stored : list[0].id)
      setLoading(false)
    })()
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [])

  useEffect(() => { if (activeId) localStorage.setItem('ppto-active-id', activeId) }, [activeId])

  /* ---------- descarga / guardado ---------- */
  function invalidarDescarga() {
    setDl(prev => { if (prev) URL.revokeObjectURL(prev.url); return null })
    setAvisoBasico(false)
  }

  function scheduleSave() {
    setSaveState('Guardando…')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const b = budgetsRef.current.find(x => x.id === activeIdRef.current)
      if (!b) return
      const { error } = await supabase.from('presupuestos').upsert({ id: b.id, data: b })
      setSaveState(error ? 'Sin guardar' : 'Guardado ✓')
    }, 700)
  }

  function mutateActive(fn: (b: PptoBudget) => PptoBudget) {
    setBudgets(prev => prev.map(b => b.id === activeIdRef.current ? fn(b) : b))
    invalidarDescarga()
    scheduleSave()
  }

  /* ---------- edición meta / filas ---------- */
  const setMeta = (k: keyof PptoBudget, v: string | number) => mutateActive(b => ({ ...b, [k]: v }))
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

  /* ---------- selector / nuevo / duplicar / eliminar ---------- */
  async function nuevo() {
    const nb = emptyBudget()
    setBudgets(p => [...p, nb]); setActiveId(nb.id); invalidarDescarga()
    setSaveState('Guardando…')
    const { error } = await supabase.from('presupuestos').insert({ id: nb.id, data: nb })
    setSaveState(error ? 'Sin guardar' : 'Guardado ✓')
  }
  async function duplicar() {
    if (!active) return
    const nb: PptoBudget = JSON.parse(JSON.stringify(active))
    nb.id = uid(); nb.evento += ' (copia)'; nb.rows.forEach(r => r.id = uid())
    setBudgets(p => [...p, nb]); setActiveId(nb.id); invalidarDescarga()
    setSaveState('Guardando…')
    const { error } = await supabase.from('presupuestos').insert({ id: nb.id, data: nb })
    setSaveState(error ? 'Sin guardar' : 'Guardado ✓')
  }
  async function eliminar() {
    if (!active) return
    if (!confirmDel) { setConfirmDel(true); setTimeout(() => setConfirmDel(false), 3500); return }
    const delId = active.id
    const rest = budgets.filter(b => b.id !== delId)
    setConfirmDel(false); invalidarDescarga()
    await supabase.from('presupuestos').delete().eq('id', delId)
    if (rest.length === 0) {
      const nb = emptyBudget()
      setBudgets([nb]); setActiveId(nb.id)
      await supabase.from('presupuestos').insert({ id: nb.id, data: nb })
    } else {
      setBudgets(rest); setActiveId(rest[0].id)
    }
    setSaveState('Guardado ✓')
  }

  /* ---------- exportación ---------- */
  async function exportar() {
    if (!active) return
    setExporting(true); invalidarDescarga()
    let blob: Blob | null = null, basico = false
    try { blob = await buildStyledBlob(active) }
    catch (e) {
      console.log('respaldo sin estilos:', (e as Error).message)
      try { blob = buildBasicBlob(active); basico = true } catch (e2) { console.error(e2) }
    }
    setExporting(false)
    if (!blob) { setSaveState('Error al exportar'); return }
    const url = URL.createObjectURL(blob)
    const name = exportName(active)
    setDl({ url, name }); setAvisoBasico(basico)
    try {
      const a = document.createElement('a')
      a.href = url; a.download = name
      document.body.appendChild(a); a.click(); a.remove()
    } catch { /* queda el botón azul */ }
  }

  if (loading || !active) {
    return <div className="ppto"><div style={{ padding: 40, color: '#9aa398', fontSize: 14 }}>Cargando presupuestos…</div></div>
  }

  const t = calcTotals(active)

  return (
    <div className="ppto">
      <PptoStyles />

      {/* Toolbar */}
      <div className="toolbar">
        <select value={active.id} onChange={e => { setActiveId(e.target.value); invalidarDescarga() }}>
          {budgets.map(b => (
            <option key={b.id} value={b.id}>{(b.cliente ? b.cliente + ' — ' : '') + b.evento}</option>
          ))}
        </select>
        <button className="tb" onClick={nuevo}>+ Nuevo</button>
        <button className="tb" onClick={duplicar}>Duplicar</button>
        <button className="tb danger" onClick={eliminar}>{confirmDel ? '¿Seguro? Toca de nuevo' : 'Eliminar'}</button>
        <button className="tb primary" onClick={exportar} disabled={exporting}>{exporting ? 'Generando…' : 'Exportar a Excel'}</button>
        {dl && <a className="tb dl" href={dl.url} download={dl.name}>⬇ Descargar {dl.name}</a>}
        <div className="savestate">{saveState}</div>
      </div>

      <div className="sheet">
        {avisoBasico && <div className="aviso show">El archivo se generó sin colores (no cargó el motor de estilos); las fórmulas y la estructura están completas.</div>}

        {/* Datos del evento */}
        <div className="card">
          <div className="meta">
            {META_FIELDS.map(([k, label, wide]) => (
              <div className="field" key={k} style={wide ? { gridColumn: 'span 2' } : undefined}>
                <label>{label}</label>
                <input className="in edit" value={String(active[k] ?? '')} onChange={e => setMeta(k, e.target.value)} />
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
          <div className="hint">Como en tus modelos de Excel: lo <b>azul</b> se digita, lo negro se calcula solo. Al exportar, el archivo sale con el logo, colores y columnas separadas de tu plantilla.</div>
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
    </div>
  )
}

/* ---------- estilos (scopeados bajo .ppto para no filtrar al resto de la app) ---------- */
function PptoStyles() {
  return (
    <style>{`
.ppto{padding:24px;font-size:14px;color:#191c19;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
.ppto .num{font-family:ui-monospace,'SF Mono',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.ppto .toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px}
.ppto .toolbar select{border:1px solid #c8cdc2;border-radius:8px;padding:7px 10px;font:inherit;background:#fff;color:#191c19;max-width:340px}
.ppto .tb{border:1px solid #c8cdc2;background:#fff;color:#374151;border-radius:8px;padding:7px 12px;font:inherit;cursor:pointer;font-weight:500}
.ppto .tb:hover{background:#f3f4f6}
.ppto .tb.primary{background:#0e7a52;border-color:#0e7a52;color:#fff;font-weight:600}
.ppto .tb.primary:hover{background:#0c6a47}
.ppto .tb.primary:disabled{opacity:.6;cursor:wait}
.ppto .tb.danger:hover{background:#fef2f2;border-color:#fca5a5;color:#b3261e}
.ppto .tb.dl{background:#1d4ed8;border-color:#1d4ed8;color:#fff;font-weight:700;text-decoration:none;display:inline-block}
.ppto .tb.dl:hover{background:#1a44bd}
.ppto .savestate{margin-left:auto;font-size:12px;color:#9aa398}
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
    `}</style>
  )
}
