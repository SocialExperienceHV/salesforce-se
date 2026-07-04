'use client'

import { useState, useMemo } from 'react'
import { Users, UserPlus, Mail, FileText, CheckCircle, XCircle, Plus, Search, RefreshCw, Download, ChevronDown } from 'lucide-react'
import { useStore } from '@/lib/store'

// ─── Constantes ────────────────────────────────────────────────────────────────
const FASES = [
  'Contacto Digital',
  'Credenciales Enviadas',
  'Credenciales Presentadas',
  'Brief Recibido',
  'Propuesta Presentada',
  'Propuesta Aprobada',
  'Inscripción Proveedor',
  'No avanza / Descartado',
] as const

const FASE_STYLE: Record<string, { bg: string; color: string }> = {
  'Contacto Digital':         { bg: '#EFF6FF', color: '#1D4ED8' },
  'Credenciales Enviadas':    { bg: '#EEF2FF', color: '#4338CA' },
  'Credenciales Presentadas': { bg: '#F5F3FF', color: '#6D28D9' },
  'Brief Recibido':           { bg: '#FFFBEB', color: '#B45309' },
  'Propuesta Presentada':     { bg: '#FFF7ED', color: '#C2410C' },
  'Propuesta Aprobada':       { bg: '#F0FDF4', color: '#065F46' },
  'Inscripción Proveedor':    { bg: '#F0FDF4', color: '#166534' },
  'No avanza / Descartado':   { bg: '#F9FAFB', color: '#6B7280' },
}

const PRIMER_CONTACTO_OPTIONS = ['Hans Vargas', 'Felipe Aguilón', 'Iván Londoño', 'David Novoa']
const ORIGENES = ['LinkedIn', 'Referido', 'Pauta', 'Llamada en frío', 'Evento / Networking', 'Otro']

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatFecha(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ─── Celda inline select ────────────────────────────────────────────────────────
function InlineSelect({ value, options, placeholder, onChange, badge, badgeStyle }: {
  value: string; options: string[]; placeholder: string; onChange: (v: string) => void
  badge?: boolean; badgeStyle?: { bg: string; color: string }
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none', border: 'none', background: badge && badgeStyle ? badgeStyle.bg : 'transparent',
          color: badge && badgeStyle ? badgeStyle.color : '#374151',
          fontSize: badge ? 11 : 13, fontWeight: badge ? 600 : 400,
          padding: badge ? '3px 22px 3px 8px' : '0 18px 0 0',
          borderRadius: badge ? 20 : 4,
          cursor: 'pointer', outline: 'none', maxWidth: badge ? 170 : 140,
        }}>
        {!value && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown style={{ width: 10, height: 10, position: 'absolute', right: badge ? 5 : 2, color: badge && badgeStyle ? badgeStyle.color : '#9CA3AF', pointerEvents: 'none', flexShrink: 0 }} />
    </div>
  )
}

// ─── Celda fecha + texto editable ──────────────────────────────────────────────
function FechaTextoCell({ fecha, texto, onSave }: {
  fecha: string; texto: string; onSave: (fecha: string, texto: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState(fecha)
  const [t, setT] = useState(texto)

  if (editing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
        <input type="date" value={f} onChange={e => setF(e.target.value)}
          style={{ fontSize: 12, border: '1px solid #D1D5DB', borderRadius: 5, padding: '3px 6px', color: '#111827', outline: 'none' }} />
        <textarea value={t} onChange={e => setT(e.target.value)} rows={2}
          style={{ fontSize: 11, border: '1px solid #D1D5DB', borderRadius: 5, padding: '3px 6px', color: '#374151', resize: 'none', outline: 'none', lineHeight: 1.4 }} />
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => { onSave(f, t); setEditing(false) }}
            style={{ flex: 1, fontSize: 11, padding: '3px 6px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}>
            Guardar
          </button>
          <button onClick={() => { setF(fecha); setT(texto); setEditing(false) }}
            style={{ flex: 1, fontSize: 11, padding: '3px 6px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div onClick={() => { setF(fecha); setT(texto); setEditing(true) }}
      style={{ cursor: 'pointer', borderRadius: 6, padding: '2px 4px', margin: '-2px -4px' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: fecha ? '#111827' : '#D1D5DB' }}>
        {fecha ? formatFecha(fecha) : 'Sin fecha'}
      </div>
      {texto && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1, maxWidth: 180, lineHeight: 1.3 }}>{texto}</div>}
      {!texto && <div style={{ fontSize: 11, color: '#D1D5DB' }}>Agregar nota...</div>}
    </div>
  )
}

// ─── Modal Nuevo Prospecto ──────────────────────────────────────────────────────
function NuevoProspectoModal({ onClose, kams }: { onClose: () => void; kams: string[] }) {
  const { addProspecto } = useStore()
  const [form, setForm] = useState({
    empresa: '', contacto: '', email: '', cargo: '', origen: '',
    primerContactoPersona: '', comercial: '', fase: 'Contacto Digital',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.empresa.trim()) return
    addProspecto({ ...form, valor: 0, notas: '', ultimoContactoFecha: todayISO(), ultimoContactoTexto: 'Prospecto creado.', proximoSeguimientoFecha: '', proximoSeguimientoTexto: '' })
    onClose()
  }

  const inp: React.CSSProperties = { width: '100%', height: 36, border: '1px solid #E5E7EB', borderRadius: 7, padding: '0 10px', fontSize: 13, color: '#111827', outline: 'none', boxSizing: 'border-box' }
  const sel: React.CSSProperties = { ...inp, appearance: 'none', cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center', paddingRight: 28 }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 20 }}>Nuevo prospecto</div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Empresa *</label>
              <input required value={form.empresa} onChange={e => setForm(f => ({...f, empresa: e.target.value}))} placeholder="Nombre de la empresa" style={inp} />
            </div>
            <div>
              <label style={lbl}>Contacto</label>
              <input value={form.contacto} onChange={e => setForm(f => ({...f, contacto: e.target.value}))} placeholder="Nombre del contacto" style={inp} />
            </div>
            <div>
              <label style={lbl}>Cargo</label>
              <input value={form.cargo} onChange={e => setForm(f => ({...f, cargo: e.target.value}))} placeholder="Cargo del contacto" style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="correo@empresa.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Primer contacto (persona)</label>
              <select value={form.primerContactoPersona} onChange={e => setForm(f => ({...f, primerContactoPersona: e.target.value}))} style={sel}>
                <option value="">Seleccionar...</option>
                {PRIMER_CONTACTO_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Comercial</label>
              <select value={form.comercial} onChange={e => setForm(f => ({...f, comercial: e.target.value}))} style={sel}>
                <option value="">Seleccionar...</option>
                {kams.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Origen</label>
              <select value={form.origen} onChange={e => setForm(f => ({...f, origen: e.target.value}))} style={sel}>
                <option value="">Seleccionar...</option>
                {ORIGENES.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Fase inicial</label>
              <select value={form.fase} onChange={e => setForm(f => ({...f, fase: e.target.value}))} style={sel}>
                {FASES.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, height: 38, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ flex: 1, height: 38, background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              Crear prospecto
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function ProspeccionPage() {
  const { prospectos, updateProspecto, personasStore } = useStore()
  const kams = useMemo(() => personasStore.filter(p => p.area === 'Comercial').map(p => p.nombre), [personasStore])

  const [search, setSearch] = useState('')
  const [filtroFase, setFiltroFase] = useState('Todos')
  const [filtroComercial, setFiltroComercial] = useState('Todos')
  const [showModal, setShowModal] = useState(false)

  const filtered = useMemo(() => prospectos.filter(p => {
    if (search && !p.empresa.toLowerCase().includes(search.toLowerCase()) && !(p.contacto ?? '').toLowerCase().includes(search.toLowerCase())) return false
    if (filtroFase !== 'Todos' && p.fase !== filtroFase) return false
    if (filtroComercial !== 'Todos' && p.comercial !== filtroComercial) return false
    return true
  }), [prospectos, search, filtroFase, filtroComercial])

  // KPIs
  const activos   = prospectos.filter(p => p.fase !== 'No avanza / Descartado').length
  const nuevos    = prospectos.filter(p => p.createdAt >= todayISO().substring(0, 7)).length
  const credEnv   = prospectos.filter(p => p.fase === 'Credenciales Enviadas').length
  const briefs    = prospectos.filter(p => p.fase === 'Brief Recibido').length
  const aprobados = prospectos.filter(p => p.fase === 'Propuesta Aprobada').length
  const descar    = prospectos.filter(p => p.fase === 'No avanza / Descartado').length

  const sel: React.CSSProperties = {
    height: 34, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7,
    fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center', paddingRight: 28,
  }

  const th: React.CSSProperties = { padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }
  const td: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #F3F4F6', verticalAlign: 'top' }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Prospección Comercial</h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>Gestiona el pipeline de nuevos clientes potenciales.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
          <Plus style={{ width: 15, height: 15 }} />
          Nuevo prospecto
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {[
          { label: 'Prospectos activos',       value: activos,   Icon: Users,       bg: '#F5F3FF', color: '#7C3AED' },
          { label: 'Nuevos este mes',           value: nuevos,    Icon: UserPlus,    bg: '#F0FDF4', color: '#059669' },
          { label: 'Credenciales enviadas',     value: credEnv,   Icon: Mail,        bg: '#FFFBEB', color: '#B45309' },
          { label: 'Briefs recibidos',          value: briefs,    Icon: FileText,    bg: '#EEF2FF', color: '#4338CA' },
          { label: 'Propuestas aprobadas',      value: aprobados, Icon: CheckCircle, bg: '#F0FDF4', color: '#065F46' },
          { label: 'Descartados',               value: descar,    Icon: XCircle,     bg: '#FFF1F2', color: '#BE123C' },
        ].map(({ label, value, Icon, bg, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 16, height: 16, color }} />
              </div>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa o contacto..."
            style={{ height: 34, paddingLeft: 32, paddingRight: 12, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#374151', outline: 'none', width: 220 }} />
        </div>
        <select value={filtroFase} onChange={e => setFiltroFase(e.target.value)} style={{ ...sel, minWidth: 180 }}>
          <option value="Todos">Todas las fases</option>
          {FASES.map(f => <option key={f}>{f}</option>)}
        </select>
        <select value={filtroComercial} onChange={e => setFiltroComercial(e.target.value)} style={{ ...sel, minWidth: 140 }}>
          <option value="Todos">Todo el equipo</option>
          {kams.map(k => <option key={k}>{k}</option>)}
        </select>
        <button onClick={() => { setSearch(''); setFiltroFase('Todos'); setFiltroComercial('Todos') }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#6B7280', background: '#fff', cursor: 'pointer' }}>
          <RefreshCw style={{ width: 12, height: 12 }} /> Limpiar
        </button>
        <button style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#6B7280', background: '#fff', cursor: 'pointer', marginLeft: 'auto' }}>
          <Download style={{ width: 12, height: 12 }} /> Exportar
        </button>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
            <thead>
              <tr>
                <th style={th}>Empresa</th>
                <th style={th}>Contacto</th>
                <th style={th}>Cargo</th>
                <th style={th}>Primer contacto</th>
                <th style={th}>Comercial</th>
                <th style={th}>Origen</th>
                <th style={th}>Fase</th>
                <th style={{ ...th, whiteSpace: 'normal', lineHeight: 1.3 }}>Fecha primer<br/>contacto</th>
                <th style={th}>Último contacto</th>
                <th style={th}>Próximo seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...td, textAlign: 'center', color: '#9CA3AF', padding: '40px 20px' }}>
                    No hay prospectos que coincidan con los filtros.
                  </td>
                </tr>
              ) : filtered.map(p => {
                const fStyle = FASE_STYLE[p.fase] ?? { bg: '#F9FAFB', color: '#6B7280' }
                return (
                  <tr key={p.id} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}>

                    {/* Empresa — solo nombre, sin avatar */}
                    <td style={td}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{p.empresa}</span>
                    </td>

                    {/* Contacto */}
                    <td style={td}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{p.contacto || '—'}</div>
                      {p.email && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{p.email}</div>}
                    </td>

                    {/* Cargo */}
                    <td style={{ ...td, fontSize: 12, color: '#6B7280' }}>{p.cargo || '—'}</td>

                    {/* Primer contacto (persona) */}
                    <td style={td}>
                      <InlineSelect
                        value={p.primerContactoPersona ?? ''}
                        options={PRIMER_CONTACTO_OPTIONS}
                        placeholder="Seleccionar..."
                        onChange={v => updateProspecto(p.id, { primerContactoPersona: v })}
                      />
                    </td>

                    {/* Comercial (del equipo) */}
                    <td style={td}>
                      <InlineSelect
                        value={p.comercial ?? ''}
                        options={kams}
                        placeholder="Seleccionar..."
                        onChange={v => updateProspecto(p.id, { comercial: v })}
                      />
                    </td>

                    {/* Origen */}
                    <td style={{ ...td, fontSize: 12, color: '#6B7280' }}>{p.origen || '—'}</td>

                    {/* Fase */}
                    <td style={td}>
                      <InlineSelect
                        value={p.fase}
                        options={[...FASES]}
                        placeholder=""
                        onChange={v => updateProspecto(p.id, { fase: v })}
                        badge
                        badgeStyle={fStyle}
                      />
                    </td>

                    {/* Fecha primer contacto (auto) */}
                    <td style={{ ...td, fontSize: 12, color: '#6B7280' }}>
                      {formatFecha(p.createdAt?.substring(0, 10) ?? '')}
                    </td>

                    {/* Último contacto */}
                    <td style={td}>
                      <FechaTextoCell
                        fecha={p.ultimoContactoFecha ?? ''}
                        texto={p.ultimoContactoTexto ?? ''}
                        onSave={(fecha, texto) => updateProspecto(p.id, { ultimoContactoFecha: fecha, ultimoContactoTexto: texto })}
                      />
                    </td>

                    {/* Próximo seguimiento */}
                    <td style={td}>
                      <FechaTextoCell
                        fecha={p.proximoSeguimientoFecha ?? ''}
                        texto={p.proximoSeguimientoTexto ?? ''}
                        onSave={(fecha, texto) => updateProspecto(p.id, { proximoSeguimientoFecha: fecha, proximoSeguimientoTexto: texto })}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 13, color: '#9CA3AF' }}>
        Mostrando {filtered.length} de {prospectos.length} prospectos
      </div>

      {showModal && <NuevoProspectoModal onClose={() => setShowModal(false)} kams={kams} />}
    </div>
  )
}
