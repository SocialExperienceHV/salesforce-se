'use client'

import { useStore } from '@/lib/store'
import type { DocumentoTC, ItemTC } from '@/lib/store'
import { useMemo, useState, useRef } from 'react'
import {
  CreditCard, PlusCircle, X, Download,
  CheckCircle, Clock, Trash2, Plus, Flag, Upload,
} from 'lucide-react'
import * as XLSX from 'xlsx'

const fmt = (n: number) => '$ ' + Math.round(n).toLocaleString('es-CO')
const today = () => new Date().toISOString().slice(0, 10)
const newItemId = () => `i${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const blankItem = (): ItemTC => ({ id: newItemId(), centroCosto: '', monto: 0, responsable: '', status: 'Pendiente', descripcion: '', item: '', fechaItem: '', gespro: 'No Cargado' })
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const labelMes = (ym: string) => { const [y,m] = ym.split('-'); return `${MESES_ES[parseInt(m,10)-1]} ${y}` }

// ─── PDF ─────────────────────────────────────────────────────────────────────
function exportDocPDF(doc: DocumentoTC, tarjetaNombre?: string) {
  const totalDoc = doc.items.reduce((s, i) => s + i.monto, 0)
  const rows = doc.items.map(it => `<tr>
    <td>${it.centroCosto}</td>
    <td style="text-align:right">${fmt(it.monto)}</td>
    <td>${it.responsable}</td>
    <td>${it.descripcion ?? ''}</td>
    <td><span class="${it.status==='Entregado'?'badge-e':'badge-p'}">${it.status}</span></td>
  </tr>`).join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>TC ${doc.ultimos4} — ${doc.fecha}</title>
  <style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:24px;margin:0}h1{font-size:16px;font-weight:800;margin:0 0 2px}.sub{font-size:11px;color:#6B7280;margin:0 0 18px}table{width:100%;border-collapse:collapse;margin-top:12px}th{font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;padding:7px 10px;border-bottom:2px solid #E5E7EB;text-align:left}td{font-size:12px;padding:8px 10px;border-bottom:1px solid #F3F4F6}tfoot td{font-weight:800;border-top:2px solid #E5E7EB;border-bottom:none}.badge-e{background:#D1FAE5;color:#065F46;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700}.badge-p{background:#FEF3C7;color:#92400E;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700}</style>
  </head><body>
  <h1>Tarjeta Crédito — •••• ${doc.ultimos4}${tarjetaNombre?` (${tarjetaNombre})`:''}</h1>
  <p class="sub">Fecha: ${doc.fecha} &nbsp;|&nbsp; Generado el ${new Date().toLocaleDateString('es-CO',{dateStyle:'long'})}</p>
  <table><thead><tr><th>CC</th><th>Monto</th><th>Responsable</th><th>Descripción</th><th>Estado</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td style="color:#6B7280">Total</td><td style="text-align:right">${fmt(totalDoc)}</td><td colspan="3"></td></tr></tfoot>
  </table></body></html>`
  const win = window.open('','_blank'); if(!win) return
  win.document.write(html); win.document.close(); win.focus()
  setTimeout(()=>{win.print();win.close()},500)
}

// ─── Panel detalle ────────────────────────────────────────────────────────────
function DetallePanel({ doc, tarjetaNombre, responsablesOpts, ccValidos, fullWidth, onClose, onUpdate, onDelete }: {
  doc: DocumentoTC; tarjetaNombre?: string; responsablesOpts: string[]
  ccValidos: Set<string>; fullWidth?: boolean; onClose: () => void
  onUpdate: (c: Partial<DocumentoTC>) => void; onDelete: () => void
}) {
  const [errorFinalizar, setErrorFinalizar] = useState<string | null>(null)
  const total = doc.items.reduce((s,i)=>s+i.monto,0)

  function addItem() { onUpdate({ items: [...doc.items, blankItem()] }) }
  function updateItem(id: string, ch: Partial<ItemTC>) {
    onUpdate({ items: doc.items.map(i => i.id===id ? {...i,...ch} : i) })
  }
  function removeItem(id: string) { onUpdate({ items: doc.items.filter(i=>i.id!==id) }) }

  function handleFinalizar() {
    const sinResp = doc.items.findIndex(i=>!i.responsable)
    if (sinResp !== -1) { setErrorFinalizar(`El ítem ${sinResp+1} no tiene responsable asignado.`); return }
    const ccBad = doc.items.find(i=>i.centroCosto.trim()&&!ccValidos.has(i.centroCosto.trim()))
    if (ccBad) { setErrorFinalizar(`El centro de costos "${ccBad.centroCosto}" no existe en la plataforma.`); return }
    setErrorFinalizar(null); onUpdate({ finalizado: true }); onClose()
  }

  const ccInvalidoSet = useMemo(
    ()=>new Set(doc.items.filter(i=>i.centroCosto.trim()&&!ccValidos.has(i.centroCosto.trim())).map(i=>i.centroCosto.trim())),
    [doc.items, ccValidos]
  )

  const inp: React.CSSProperties = { width:'100%', height:32, border:'1px solid #E5E7EB', borderRadius:6, padding:'0 8px', fontSize:12, color:'#111827', outline:'none', boxSizing:'border-box', background: doc.finalizado?'#F9FAFB':'#fff' }
  const sel: React.CSSProperties = { ...inp, cursor: doc.finalizado?'default':'pointer' }
  const thS: React.CSSProperties = { padding:'9px 10px', fontSize:10, fontWeight:700, color:'#6B7280', textAlign:'left', borderBottom:'1px solid #E5E7EB', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap', background:'#F9FAFB' }

  return (
    <div style={{ width: fullWidth ? '100%' : 680, borderLeft: fullWidth ? 'none' : '1px solid #E5E7EB', display:'flex', flexDirection:'column', background:'#fff', flexShrink:0 }}>
      {/* Header */}
      <div style={{ padding:'14px 18px', borderBottom:'1px solid #E5E7EB', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div style={{ width:32, height:32, borderRadius:8, background: doc.finalizado?'#059669':'#111827', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <CreditCard style={{ width:15, height:15, color:'#fff' }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#111827' }}>•••• {doc.ultimos4}{tarjetaNombre?` — ${tarjetaNombre}`:''}</div>
          <div style={{ fontSize:11, color:'#6B7280' }}>{doc.fecha}</div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {doc.finalizado && <span style={{ fontSize:11, fontWeight:700, background:'#D1FAE5', color:'#065F46', padding:'3px 9px', borderRadius:20 }}>✓ Finalizado</span>}
          <button onClick={()=>exportDocPDF(doc,tarjetaNombre)}
            style={{ display:'flex', alignItems:'center', gap:5, height:30, padding:'0 10px', border:'1px solid #E5E7EB', borderRadius:7, background:'#fff', color:'#374151', fontSize:11, fontWeight:600, cursor:'pointer' }}>
            <Download style={{ width:12, height:12 }} /> PDF
          </button>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF', padding:4 }}>
            <X style={{ width:17, height:17 }} />
          </button>
        </div>
      </div>

      {/* Mini KPIs */}
      <div style={{ display:'flex', borderBottom:'1px solid #E5E7EB', flexShrink:0 }}>
        {[
          { label:'Total', value: fmt(total), color:'#111827' },
          { label:'Entregados', value: fmt(doc.items.filter(i=>i.status==='Entregado').reduce((s,i)=>s+i.monto,0)), color:'#065F46' },
          { label:'Pendientes', value: fmt(doc.items.filter(i=>i.status==='Pendiente').reduce((s,i)=>s+i.monto,0)), color:'#C2410C' },
        ].map((k,idx)=>(
          <div key={k.label} style={{ flex:1, padding:'9px 16px', borderRight:idx<2?'1px solid #E5E7EB':'none' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>{k.label}</div>
            <div style={{ fontSize:15, fontWeight:800, color:k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabla ítems */}
      <div style={{ flex:1, overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={thS}>Fecha</th>
              <th style={thS}>Item</th>
              <th style={thS}>Centro Costos</th>
              <th style={thS}>Monto</th>
              <th style={thS}>Responsable</th>
              <th style={thS}>Descripción</th>
              <th style={{ ...thS, minWidth:130 }}>Gespro</th>
              <th style={{ ...thS, minWidth:160 }}>Estado</th>
              <th style={{ ...thS, textAlign:'right' }}>
                {!doc.finalizado && (
                  <button onClick={addItem}
                    style={{ display:'flex', alignItems:'center', gap:4, height:26, padding:'0 9px', border:'1px solid #D1D5DB', borderRadius:6, background:'#fff', color:'#374151', fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', marginLeft:'auto' }}>
                    <Plus style={{ width:11, height:11 }} /> Agregar
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {doc.items.length===0 && (
              <tr><td colSpan={6} style={{ padding:'32px', textAlign:'center', color:'#9CA3AF', fontSize:13 }}>
                Haz clic en "Agregar" para registrar gastos.
              </td></tr>
            )}
            {doc.items.map((item,idx)=>(
              <tr key={item.id} style={{ background: idx%2===0?'#fff':'#FAFAFA' }}>
                <td style={{ padding:'6px 8px', verticalAlign:'top', minWidth:90 }}>
                  <input value={item.fechaItem??''}
                    onChange={e=>updateItem(item.id,{fechaItem:e.target.value})}
                    placeholder="yyyy-mm-dd" style={{ ...inp, fontSize:11 }} disabled={doc.finalizado} />
                </td>
                <td style={{ padding:'6px 8px', verticalAlign:'top', minWidth:140 }}>
                  <input value={item.item??''}
                    onChange={e=>updateItem(item.id,{item:e.target.value})}
                    placeholder="Nombre gasto..." style={inp} disabled={doc.finalizado} />
                </td>
                <td style={{ padding:'6px 8px', verticalAlign:'top', minWidth:100 }}>
                  <input value={item.centroCosto}
                    onChange={e=>{updateItem(item.id,{centroCosto:e.target.value});setErrorFinalizar(null)}}
                    placeholder="1042"
                    style={{ ...inp, border: item.centroCosto.trim()&&ccInvalidoSet.has(item.centroCosto.trim())?'1.5px solid #EF4444':'1px solid #E5E7EB' }}
                    disabled={doc.finalizado} />
                  {item.centroCosto.trim()&&ccInvalidoSet.has(item.centroCosto.trim())&&(
                    <div style={{ fontSize:10, color:'#EF4444', marginTop:2, fontWeight:600 }}>CC no existe</div>
                  )}
                </td>
                <td style={{ padding:'6px 8px', verticalAlign:'top', minWidth:120 }}>
                  <input type="text" inputMode="numeric"
                    value={item.monto?item.monto.toLocaleString('es-CO'):''}
                    onChange={e=>{const raw=e.target.value.replace(/\./g,'').replace(/[^\d]/g,'');updateItem(item.id,{monto:raw?Number(raw):0})}}
                    placeholder="0" style={{ ...inp, textAlign:'right' }} disabled={doc.finalizado} />
                </td>
                <td style={{ padding:'6px 8px', verticalAlign:'top', minWidth:140 }}>
                  <select value={item.responsable}
                    onChange={e=>{updateItem(item.id,{responsable:e.target.value});setErrorFinalizar(null)}}
                    style={{ ...sel, border:!item.responsable&&errorFinalizar?'1.5px solid #EF4444':'1px solid #E5E7EB' }}
                    disabled={doc.finalizado}>
                    <option value="">— Persona —</option>
                    {responsablesOpts.map(r=><option key={r}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding:'6px 8px', verticalAlign:'top', minWidth:140 }}>
                  <input value={item.descripcion??''}
                    onChange={e=>updateItem(item.id,{descripcion:e.target.value})}
                    placeholder="Concepto..." style={inp} disabled={doc.finalizado} />
                </td>
                <td style={{ padding:'6px 8px', verticalAlign:'middle', minWidth:130 }}>
                  <div style={{ display:'flex', gap:4 }}>
                    {(['Cargado','No Cargado'] as const).map(g=>{
                      const active = (item.gespro??'No Cargado')===g
                      return (
                        <button key={g} onClick={()=>!doc.finalizado&&updateItem(item.id,{gespro:g})}
                          style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 8px', borderRadius:6, fontSize:11, fontWeight:700,
                            border: active ? `1.5px solid ${g==='Cargado'?'#10B981':'#E5E7EB'}` : '1.5px solid #E5E7EB',
                            cursor: doc.finalizado?'default':'pointer',
                            background: active ? (g==='Cargado'?'#D1FAE5':'#F3F4F6') : '#fff',
                            color: active ? (g==='Cargado'?'#065F46':'#374151') : '#9CA3AF',
                            opacity: doc.finalizado&&!active?0.4:1 }}>
                          {g}
                        </button>
                      )
                    })}
                  </div>
                </td>
                <td style={{ padding:'6px 8px', verticalAlign:'middle' }}>
                  <div style={{ display:'flex', gap:4 }}>
                    {(['Pendiente','Entregado'] as const).map(s=>{
                      const active=item.status===s; const isPend=s==='Pendiente'
                      return (
                        <button key={s} onClick={()=>!doc.finalizado&&updateItem(item.id,{status:s})}
                          style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'4px 8px', borderRadius:6, fontSize:11, fontWeight:700,
                            border: active?`1.5px solid ${isPend?'#F59E0B':'#10B981'}`:'1.5px solid #E5E7EB',
                            cursor: doc.finalizado?'default':'pointer',
                            background: active?(isPend?'#FEF3C7':'#D1FAE5'):'#fff',
                            color: active?(isPend?'#92400E':'#065F46'):'#9CA3AF',
                            opacity: doc.finalizado&&!active?0.4:1 }}>
                          {s==='Entregado'?<CheckCircle style={{width:10,height:10}}/>:<Clock style={{width:10,height:10}}/>}
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </td>
                <td style={{ padding:'6px 8px', verticalAlign:'middle', textAlign:'right' }}>
                  {!doc.finalizado&&(
                    <button onClick={()=>removeItem(item.id)}
                      style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #FCA5A5', borderRadius:6, background:'#FEF2F2', cursor:'pointer', color:'#DC2626', marginLeft:'auto' }}>
                      <Trash2 style={{ width:12, height:12 }} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {doc.items.length>0&&(
            <tfoot>
              <tr style={{ background:'#F9FAFB' }}>
                <td style={{ padding:'9px 10px', fontSize:12, fontWeight:700, color:'#6B7280' }}>Total</td>
                <td style={{ padding:'9px 10px', fontSize:14, fontWeight:800, color:'#111827', fontVariantNumeric:'tabular-nums' }}>{fmt(total)}</td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer */}
      {!doc.finalizado ? (
        <div style={{ borderTop:'1px solid #E5E7EB', flexShrink:0, background:'#FAFAFA' }}>
          {errorFinalizar&&(
            <div style={{ padding:'7px 16px', background:'#FEF2F2', borderBottom:'1px solid #FECACA', fontSize:12, color:'#DC2626', fontWeight:600 }}>
              ⚠ {errorFinalizar}
            </div>
          )}
          <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <button onClick={onDelete}
              style={{ display:'flex', alignItems:'center', gap:5, height:30, padding:'0 10px', border:'1px solid #FCA5A5', borderRadius:7, background:'#FEF2F2', color:'#DC2626', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              <Trash2 style={{width:12,height:12}}/> Eliminar
            </button>
            <button onClick={handleFinalizar}
              style={{ display:'flex', alignItems:'center', gap:6, height:32, padding:'0 16px', border:'none', borderRadius:8, background:'#059669', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              <Flag style={{width:13,height:13}}/> Finalizar documento
            </button>
          </div>
        </div>
      ):(
        <div style={{ padding:'10px 16px', borderTop:'1px solid #E5E7EB', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'#F0FDF4' }}>
          <span style={{ fontSize:13, color:'#065F46', fontWeight:600 }}>✓ Documento finalizado</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>onUpdate({finalizado:false})}
              style={{ height:28, padding:'0 10px', border:'1px solid #D1D5DB', borderRadius:7, background:'#fff', color:'#374151', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              Reabrir
            </button>
            <button onClick={onDelete}
              style={{ display:'flex', alignItems:'center', gap:4, height:28, padding:'0 9px', border:'1px solid #FCA5A5', borderRadius:7, background:'#FEF2F2', color:'#DC2626', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              <Trash2 style={{width:11,height:11}}/> Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal nuevo documento ────────────────────────────────────────────────────
function NuevoDocModal({ tarjetasActivas, onConfirm, onConfirmExcel, onClose }: {
  tarjetasActivas: { id:string; ultimos4:string; nombre?:string }[]
  onConfirm: (tarjetaId:string, ultimos4:string, fecha:string) => void
  onConfirmExcel: (tarjetaId:string, ultimos4:string, fecha:string, items:ItemTC[]) => void
  onClose: () => void
}) {
  const [tarjetaId, setTarjetaId] = useState(tarjetasActivas[0]?.id??'')
  const [fecha, setFecha] = useState(today())
  const [modo, setModo] = useState<'manual'|'excel'>('manual')
  const [excelError, setExcelError] = useState('')
  const [excelRows, setExcelRows] = useState<ItemTC[]>([])
  const [excelFileName, setExcelFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const inp: React.CSSProperties = { width:'100%', height:38, border:'1px solid #E5E7EB', borderRadius:8, padding:'0 10px', fontSize:13, color:'#111827', outline:'none', boxSizing:'border-box' }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if(!file) return
    setExcelError(''); setExcelRows([])
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type:'array', cellDates:true })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const rows: Record<string,unknown>[] = XLSX.utils.sheet_to_json(ws, { defval:'' })
        const items: ItemTC[] = rows.map(r => {
          const fechaRaw = r['Fecha'] ?? r['fecha'] ?? ''
          let fechaStr = ''
          if(fechaRaw instanceof Date) {
            fechaStr = fechaRaw.toISOString().slice(0,10)
          } else if(typeof fechaRaw === 'string') {
            fechaStr = fechaRaw.slice(0,10)
          } else if(typeof fechaRaw === 'number') {
            const d = XLSX.SSF.parse_date_code(fechaRaw)
            fechaStr = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
          }
          const monto = Number(r['Valor'] ?? r['valor'] ?? r['Monto'] ?? r['monto'] ?? 0)
          return {
            id: newItemId(),
            fechaItem: fechaStr,
            item: String(r['Item'] ?? r['item'] ?? r['Concepto'] ?? '').trim(),
            monto,
            responsable: String(r['Responsable'] ?? r['responsable'] ?? '').trim(),
            centroCosto: '',
            status: 'Pendiente' as const,
            descripcion: '',
          }
        }).filter(i => i.monto > 0)
        if(items.length === 0) { setExcelError('No se encontraron filas válidas con Fecha, Item, Valor y Responsable.'); return }
        // Fecha del documento = la más reciente del archivo
        const fechas = items.map(i=>i.fechaItem??'').filter(Boolean).sort()
        setFecha(fechas[fechas.length-1] || today())
        setExcelRows(items)
        setExcelFileName(file.name)
      } catch {
        setExcelError('Error leyendo el archivo. Verifica que sea un .xlsx válido.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  function handleConfirm() {
    const t = tarjetasActivas.find(t=>t.id===tarjetaId); if(!t||!fecha) return
    if(modo==='excel' && excelRows.length>0) {
      onConfirmExcel(tarjetaId, t.ultimos4, fecha, excelRows)
    } else {
      onConfirm(tarjetaId, t.ultimos4, fecha)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'28px', width:420, boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ fontSize:16, fontWeight:700, color:'#111827', margin:0 }}>Nuevo documento TC</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}><X style={{width:18,height:18}}/></button>
        </div>

        {/* Toggle modo */}
        <div style={{ display:'flex', gap:6, marginBottom:18, background:'#F3F4F6', borderRadius:9, padding:4 }}>
          {(['manual','excel'] as const).map(m=>(
            <button key={m} onClick={()=>setModo(m)}
              style={{ flex:1, height:32, border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer',
                background:modo===m?'#fff':'transparent', color:modo===m?'#111827':'#6B7280',
                boxShadow:modo===m?'0 1px 4px rgba(0,0,0,0.1)':'none', transition:'all 0.15s' }}>
              {m==='manual'?'Manual':'Importar Excel'}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Tarjeta</label>
            <select value={tarjetaId} onChange={e=>setTarjetaId(e.target.value)} style={{ ...inp, cursor:'pointer' }}>
              {tarjetasActivas.map(t=><option key={t.id} value={t.id}>•••• {t.ultimos4}{t.nombre?` — ${t.nombre}`:''}</option>)}
            </select>
          </div>

          {modo==='excel' ? (
            <>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Archivo Excel</label>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display:'none' }} />
                <button onClick={()=>fileRef.current?.click()}
                  style={{ display:'flex', alignItems:'center', gap:8, width:'100%', height:38, border:'1.5px dashed #D1D5DB', borderRadius:8,
                    background:'#FAFAFA', color:'#374151', fontSize:13, fontWeight:500, cursor:'pointer', justifyContent:'center' }}>
                  <Upload style={{width:15,height:15,color:'#6B7280'}}/>
                  {excelFileName || 'Seleccionar archivo .xlsx'}
                </button>
                {excelError && <p style={{ fontSize:11, color:'#DC2626', margin:'4px 0 0', fontWeight:600 }}>{excelError}</p>}
                {excelRows.length>0 && (
                  <p style={{ fontSize:11, color:'#059669', margin:'4px 0 0', fontWeight:600 }}>
                    ✓ {excelRows.length} gastos listos para importar
                  </p>
                )}
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Fecha del documento</label>
                <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inp} />
              </div>
            </>
          ) : (
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Fecha</label>
              <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inp} />
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:8, marginTop:22 }}>
          <button onClick={onClose} style={{ flex:1, height:38, border:'1px solid #E5E7EB', borderRadius:8, background:'#fff', color:'#374151', fontSize:13, fontWeight:600, cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleConfirm}
            disabled={modo==='excel'&&excelRows.length===0}
            style={{ flex:1, height:38, border:'none', borderRadius:8, background: modo==='excel'&&excelRows.length===0?'#9CA3AF':'#111827', color:'#fff', fontSize:13, fontWeight:600, cursor: modo==='excel'&&excelRows.length===0?'not-allowed':'pointer' }}>
            {modo==='excel'?`Importar ${excelRows.length>0?excelRows.length+' gastos':''}`.trim():'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function TarjetaCredito() {
  const { tarjetasCorp, documentosTC, addDocumentoTC, updateDocumentoTC, deleteDocumentoTC, personasStore, proyectos } = useStore()

  const tarjetasActivas = useMemo(()=>tarjetasCorp.filter(t=>t.activa),[tarjetasCorp])
  const [editingItemId, setEditingItemId] = useState<string|null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filtroTarjeta, setFiltroTarjeta] = useState('Todas')
  const [filtroResponsable, setFiltroResponsable] = useState('Todos')
  const [filtroMes, setFiltroMes] = useState('Todos')

  const ccValidos = useMemo(()=>new Set(proyectos.map(p=>p.centroCosto).filter(Boolean) as string[]),[proyectos])

  const responsablesOpts = useMemo(
    ()=>personasStore.filter(p=>p.estado==='Activo'&&(p.area==='Producción'||p.area==='Comercial'||p.permiso==='KAM'||p.permiso==='Líder Producción')).map(p=>p.nombre),
    [personasStore]
  )

  const mesesConDocs = useMemo(()=>{
    const set=new Set(documentosTC.map(d=>d.fecha.slice(0,7)))
    return Array.from(set).sort().reverse()
  },[documentosTC])

  const responsablesConDocs = useMemo(()=>{
    const set=new Set(documentosTC.flatMap(d=>d.items.map(i=>i.responsable)).filter(Boolean))
    return ['Todos',...Array.from(set)]
  },[documentosTC])

  const tarjetasConDocs = useMemo(()=>{
    const set=new Set(documentosTC.map(d=>d.ultimos4))
    return ['Todas',...Array.from(set)]
  },[documentosTC])

  const docsFiltrados = useMemo(()=>documentosTC.filter(d=>{
    if(filtroTarjeta!=='Todas'&&d.ultimos4!==filtroTarjeta) return false
    if(filtroMes!=='Todos'&&!d.fecha.startsWith(filtroMes)) return false
    if(filtroResponsable!=='Todos'&&!d.items.some(i=>i.responsable===filtroResponsable)) return false
    return true
  }),[documentosTC,filtroTarjeta,filtroMes,filtroResponsable])

  const allItems = useMemo(()=>docsFiltrados.flatMap(d=>d.items),[docsFiltrados])
  const totalGlobal     = useMemo(()=>allItems.reduce((s,i)=>s+i.monto,0),[allItems])
  const totalEntregados = useMemo(()=>allItems.filter(i=>i.status==='Entregado').reduce((s,i)=>s+i.monto,0),[allItems])
  const totalPendientes = useMemo(()=>allItems.filter(i=>i.status==='Pendiente').reduce((s,i)=>s+i.monto,0),[allItems])
  const cantPendientes  = useMemo(()=>allItems.filter(i=>i.status==='Pendiente').length,[allItems])

  const pendientesPorPersona = useMemo(()=>{
    const mapa: Record<string,number>={}
    allItems.filter(i=>i.status==='Pendiente').forEach(i=>{ if(i.responsable) mapa[i.responsable]=(mapa[i.responsable]??0)+1 })
    return mapa
  },[allItems])

  function patchItem(docId: string, itemId: string, ch: Partial<ItemTC>) {
    const doc = documentosTC.find(d=>d.id===docId); if(!doc) return
    updateDocumentoTC(docId, { items: doc.items.map(i=>i.id===itemId?{...i,...ch}:i) })
  }
  function updateItemStatus(docId: string, itemId: string, status: 'Entregado' | 'Pendiente') { patchItem(docId, itemId, {status}) }
  function updateGespro(docId: string, itemId: string, gespro: 'Cargado' | 'No Cargado') { patchItem(docId, itemId, {gespro}) }

  function handleNuevo(tarjetaId:string, ultimos4:string, fecha:string) {
    addDocumentoTC({ tarjetaId, ultimos4, fecha, items:[blankItem()], finalizado:false })
    setShowModal(false)
  }
  function handleNuevoExcel(tarjetaId:string, ultimos4:string, fecha:string, items:ItemTC[]) {
    addDocumentoTC({ tarjetaId, ultimos4, fecha, items, finalizado:false })
    setShowModal(false)
  }

  // Estilos tabla
  const thT: React.CSSProperties = { padding:'10px 14px', fontSize:11, fontWeight:700, color:'#6B7280', textAlign:'left', whiteSpace:'nowrap', borderBottom:'2px solid #E5E7EB', background:'#F9FAFB', textTransform:'uppercase', letterSpacing:'0.04em' }
  const tdT: React.CSSProperties = { padding:'12px 14px', fontSize:13, color:'#374151', borderBottom:'1px solid #F3F4F6', verticalAlign:'middle' }
  const selS: React.CSSProperties = { height:32, padding:'0 8px', border:'1px solid #E5E7EB', borderRadius:7, fontSize:12, color:'#374151', background:'#fff', outline:'none', cursor:'pointer' }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Top */}
      <div style={{ padding:'24px 24px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', margin:0 }}>Tarjeta Crédito</h1>
            <p style={{ fontSize:13, color:'#9CA3AF', margin:'3px 0 0' }}>Registro y control de gastos con tarjetas corporativas.</p>
          </div>
          <button onClick={()=>setShowModal(true)}
            style={{ display:'flex', alignItems:'center', gap:7, height:36, padding:'0 16px', background:'#111827', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            <PlusCircle style={{width:15,height:15}}/> Nuevo documento
          </button>
        </div>

        {tarjetasActivas.length===0&&(
          <div style={{ background:'#FFF7ED', border:'1px solid #FDE68A', borderRadius:10, padding:'12px 16px', marginBottom:14, fontSize:13, color:'#92400E' }}>
            No hay tarjetas activas. Ve a <strong>Administración → Tarjetas Corporativas</strong> para agregar una.
          </div>
        )}

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14 }}>
          {[
            { label:'Total gastos',      value:fmt(totalGlobal),    color:'#111827', bg:'#F9FAFB', border:'#E5E7EB' },
            { label:'Entregados',        value:fmt(totalEntregados), color:'#065F46', bg:'#F0FDF4', border:'#BBF7D0' },
            { label:'Pendientes',        value:fmt(totalPendientes), color:'#C2410C', bg:'#FFF7ED', border:'#FDE68A' },
            { label:'Soportes pendientes', value:cantPendientes,    color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
          ].map(k=>(
            <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:10, padding:'12px 16px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{k.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Banner pendientes */}
        {Object.keys(pendientesPorPersona).length>0&&(
          <div style={{ background:'#FFF7ED', border:'1px solid #FDE68A', borderRadius:10, padding:'9px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#92400E', textTransform:'uppercase', letterSpacing:'0.04em', flexShrink:0 }}>Soportes pendientes:</span>
            {Object.entries(pendientesPorPersona).map(([persona,cant])=>(
              <span key={persona} style={{ fontSize:12, background:'#fff', border:'1px solid #FDE68A', color:'#111827', padding:'3px 10px', borderRadius:20, fontWeight:500 }}>
                {persona} <strong style={{ color:'#C2410C' }}>{cant}</strong>
              </span>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:12, borderBottom:'1px solid #E5E7EB', flexWrap:'wrap' }}>
          {[
            { label:'Tarjeta', value:filtroTarjeta, set:setFiltroTarjeta, opts:tarjetasConDocs.map(t=>({v:t,l:t==='Todas'?'Todas':`•••• ${t}`})) },
            { label:'Responsable', value:filtroResponsable, set:setFiltroResponsable, opts:responsablesConDocs.map(r=>({v:r,l:r})) },
            { label:'Mes', value:filtroMes, set:setFiltroMes, opts:[{v:'Todos',l:'Todos'},...mesesConDocs.map(m=>({v:m,l:labelMes(m)}))] },
          ].map(f=>(
            <div key={f.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'#6B7280' }}>{f.label}:</span>
              <select value={f.value} onChange={e=>f.set(e.target.value)} style={selS}>
                {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
          <span style={{ fontSize:12, color:'#9CA3AF', marginLeft:'auto' }}>
            {allItems.length} gasto{allItems.length!==1?'s':''}
          </span>
        </div>
      </div>

      {/* Cuerpo: tabla */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {allItems.length===0?(
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px', gap:12 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CreditCard style={{width:26,height:26,color:'#D97706'}}/>
            </div>
            <p style={{ fontSize:14, fontWeight:600, color:'#111827', margin:0 }}>No hay gastos</p>
            <p style={{ fontSize:13, color:'#9CA3AF', margin:0 }}>Crea un nuevo documento para empezar.</p>
          </div>
        ):(
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={thT}>Tarjeta</th>
                <th style={thT}>Fecha</th>
                <th style={thT}>Item</th>
                <th style={thT}>Responsable</th>
                <th style={thT}>Centro Costos</th>
                <th style={thT}>Descripción</th>
                <th style={{ ...thT, textAlign:'right' }}>Valor</th>
                <th style={thT}>Gespro</th>
                <th style={thT}>Estado</th>
                <th style={thT}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {docsFiltrados.flatMap(doc=>{
                const tarjeta = tarjetasCorp.find(t=>t.id===doc.tarjetaId)
                return doc.items
                  .filter(item => filtroResponsable==='Todos' || item.responsable===filtroResponsable)
                  .flatMap((item, idx)=>{
                    const isEditing = editingItemId===item.id
                    const inp: React.CSSProperties = { height:30, border:'1px solid #D1D5DB', borderRadius:6, padding:'0 8px', fontSize:12, color:'#111827', outline:'none', boxSizing:'border-box', width:'100%' }
                    const rows: React.ReactNode[] = [
                      <tr key={item.id} style={{ background: isEditing?'#EFF6FF':idx%2===0?'#fff':'#FAFAFA' }}>
                        <td style={tdT}>
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <div style={{ width:26, height:26, borderRadius:6, background: doc.finalizado?'#059669':'#111827', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                              <CreditCard style={{width:12,height:12,color:'#fff'}}/>
                            </div>
                            <div>
                              <div style={{ fontSize:12, fontWeight:700, color:'#111827' }}>•••• {doc.ultimos4}</div>
                              {tarjeta?.nombre&&<div style={{ fontSize:10, color:'#9CA3AF' }}>{tarjeta.nombre}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ ...tdT, color:'#6B7280', whiteSpace:'nowrap', fontSize:12 }}>{item.fechaItem||doc.fecha}</td>
                        <td style={{ ...tdT, maxWidth:200 }}>
                          <span style={{ fontSize:12, color:'#111827', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.item||'—'}</span>
                        </td>
                        <td style={{ ...tdT, fontSize:12 }}>{item.responsable||<span style={{color:'#9CA3AF'}}>—</span>}</td>
                        <td style={{ ...tdT, fontSize:12 }}>
                          {item.centroCosto
                            ? <span style={{ background:'#EFF6FF', color:'#1D4ED8', padding:'2px 7px', borderRadius:5, fontSize:11, fontWeight:600 }}>{item.centroCosto}</span>
                            : <span style={{ color:'#F59E0B', fontSize:11, fontWeight:600 }}>Pendiente</span>}
                        </td>
                        <td style={{ ...tdT, fontSize:12, color:'#6B7280', maxWidth:160 }}>
                          <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.descripcion||'—'}</span>
                        </td>
                        <td style={{ ...tdT, textAlign:'right', fontWeight:700, color:'#111827', fontVariantNumeric:'tabular-nums' }}>{fmt(item.monto)}</td>
                        <td style={tdT} onClick={e=>e.stopPropagation()}>
                          <div style={{ display:'flex', gap:4 }}>
                            {(['Cargado','No Cargado'] as const).map(g=>{
                              const active=(item.gespro??'No Cargado')===g
                              return (
                                <button key={g} onClick={()=>updateGespro(doc.id,item.id,g)}
                                  style={{ padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer',
                                    border: active?`1.5px solid ${g==='Cargado'?'#10B981':'#D1D5DB'}`:'1.5px solid #E5E7EB',
                                    background: active?(g==='Cargado'?'#D1FAE5':'#F3F4F6'):'#fff',
                                    color: active?(g==='Cargado'?'#065F46':'#6B7280'):'#D1D5DB' }}>
                                  {g}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                        <td style={tdT} onClick={e=>e.stopPropagation()}>
                          <div style={{ display:'flex', gap:4 }}>
                            {(['Pendiente','Entregado'] as const).map(s=>{
                              const active = item.status===s
                              return (
                                <button key={s} onClick={()=>updateItemStatus(doc.id,item.id,s)}
                                  style={{ padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer',
                                    border: active?`1.5px solid ${s==='Entregado'?'#10B981':'#F59E0B'}`:'1.5px solid #E5E7EB',
                                    background: active?(s==='Entregado'?'#D1FAE5':'#FEF3C7'):'#fff',
                                    color: active?(s==='Entregado'?'#065F46':'#92400E'):'#D1D5DB' }}>
                                  {s==='Entregado'?'✓ Entregado':'Pendiente'}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                        <td style={tdT}>
                          <button onClick={()=>setEditingItemId(isEditing?null:item.id)}
                            style={{ height:28, padding:'0 10px', border:'1px solid #E5E7EB', borderRadius:7,
                              background: isEditing?'#111827':'#fff', color: isEditing?'#fff':'#374151',
                              fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            {isEditing?'Cerrar':'Editar'}
                          </button>
                        </td>
                      </tr>
                    ]
                    if(isEditing) rows.push(
                      <tr key={`${item.id}_edit`}>
                        <td colSpan={10} style={{ padding:'12px 16px', background:'#F0F9FF', borderBottom:'2px solid #1A56DB' }}>
                          <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
                            <div style={{ display:'flex', flexDirection:'column', gap:4, minWidth:90 }}>
                              <label style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Fecha</label>
                              <input value={item.fechaItem??''} onChange={e=>patchItem(doc.id,item.id,{fechaItem:e.target.value})} style={inp} type="date"/>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:2, minWidth:140 }}>
                              <label style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Item</label>
                              <input value={item.item??''} onChange={e=>patchItem(doc.id,item.id,{item:e.target.value})} placeholder="Nombre gasto" style={inp}/>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:4, minWidth:110 }}>
                              <label style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Centro Costos</label>
                              <input value={item.centroCosto} onChange={e=>patchItem(doc.id,item.id,{centroCosto:e.target.value})} placeholder="1042" style={inp}/>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:4, minWidth:110 }}>
                              <label style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Monto</label>
                              <input type="text" inputMode="numeric"
                                value={item.monto?item.monto.toLocaleString('es-CO'):''}
                                onChange={e=>{const raw=e.target.value.replace(/\./g,'').replace(/[^\d]/g,'');patchItem(doc.id,item.id,{monto:raw?Number(raw):0})}}
                                placeholder="0" style={{ ...inp, textAlign:'right' }}/>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:4, minWidth:130 }}>
                              <label style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Responsable</label>
                              <select value={item.responsable} onChange={e=>patchItem(doc.id,item.id,{responsable:e.target.value})} style={{ ...inp, cursor:'pointer' }}>
                                <option value="">— Persona —</option>
                                {responsablesOpts.map(r=><option key={r}>{r}</option>)}
                              </select>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:2, minWidth:140 }}>
                              <label style={{ fontSize:11, fontWeight:600, color:'#374151' }}>Descripción</label>
                              <input value={item.descripcion??''} onChange={e=>patchItem(doc.id,item.id,{descripcion:e.target.value})} placeholder="Concepto..." style={inp}/>
                            </div>
                            <button onClick={()=>setEditingItemId(null)}
                              style={{ height:30, padding:'0 14px', border:'none', borderRadius:6, background:'#111827', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
                              Guardar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                    return rows
                  })
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal&&(
        <NuevoDocModal tarjetasActivas={tarjetasActivas} onConfirm={handleNuevo} onConfirmExcel={handleNuevoExcel} onClose={()=>setShowModal(false)}/>
      )}
    </div>
  )
}
