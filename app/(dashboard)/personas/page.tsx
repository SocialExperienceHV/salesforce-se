'use client'

import { useState, useRef } from 'react'
import { Users, Crown, UserCheck, Plus, Search, X, Pencil, Eye, EyeOff, Camera, ChevronsUpDown } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { PersonaStore } from '@/lib/store'
import { ROLES } from '@/lib/permisos'

const AREAS   = ['Comercial', 'Producción', 'Creatividad', 'Audiovisual', 'Diseño gráfico', 'Diseño industrial', 'Administración']
const CARGOS  = ['KAM', 'Director Producción', 'Director Creativo', 'Líder Creativo', 'Líder Industrial', 'Líder Gráfico', 'Diseñador Gráfico', 'Copy Creativo', 'Diseñador Industrial', 'Audiovisual', 'Productor Sr', 'Coordinador', 'Administrativo', 'Comercial', 'Contabilidad']
const PERMISOS = ROLES
const AREAS_FILTRO = ['Todas', ...AREAS]

const PERMISO_STYLE: Record<string, { bg: string; color: string }> = {
  'Super Admin':       { bg: '#FFF1F2', color: '#BE123C' },
  'KAM':               { bg: '#F5F3FF', color: '#6D28D9' },
  'Líder':             { bg: '#EFF6FF', color: '#1D4ED8' },
  'Líder Producción':  { bg: '#EFF6FF', color: '#1D4ED8' },
  'Producción':        { bg: '#F0FDF4', color: '#15803D' },
  'Comercial':         { bg: '#ECFDF5', color: '#059669' },
  'Administración':    { bg: '#FFFBEB', color: '#B45309' },
  'Contabilidad':      { bg: '#F9FAFB', color: '#6B7280' },
}

function initials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
function formatCOP(v: number) { return `$ ${v.toLocaleString('es-CO')}` }

// ─── Uploader de foto ───────────────────────────────────────────────────────────
function FotoUploader({ foto, nombre, onChange }: { foto?: string; nombre: string; onChange: (b64: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => { if (e.target?.result) onChange(e.target.result as string) }
    reader.readAsDataURL(file)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Foto de perfil</label>
      <div onClick={() => ref.current?.click()}
        style={{ width: 80, height: 80, borderRadius: '50%', border: '2px dashed #E5E7EB', cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', flexShrink: 0, position: 'relative' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#1A56DB')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E7EB')}>
        {foto
          ? <img src={foto} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Camera style={{ width: 18, height: 18, color: '#9CA3AF' }} />
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>Subir</span>
            </div>
        }
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

// ─── Modal agregar/editar persona ──────────────────────────────────────────────
function PersonaModal({ persona, onClose, onSave }: {
  persona?: PersonaStore
  onClose: () => void
  onSave: (data: Omit<PersonaStore, 'id'>) => void
}) {
  const [form, setForm] = useState<Omit<PersonaStore, 'id'>>({
    nombre:      persona?.nombre      ?? '',
    area:        persona?.area        ?? AREAS[0],
    cargo:       persona?.cargo       ?? '',
    costoMensual:persona?.costoMensual ?? 0,
    email:       persona?.email       ?? '',
    cedula:      persona?.cedula      ?? '',
    clave:       persona?.clave       ?? '',
    foto:        persona?.foto        ?? '',
    permiso:     persona?.permiso     ?? 'Producción',
    jefe:        persona?.jefe        ?? '',
    estado:      persona?.estado      ?? 'Activo',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!form.email?.trim()) { setError('El correo es obligatorio.'); return }
    onSave(form)
  }

  const inp: React.CSSProperties = { height: 36, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const sel: React.CSSProperties = { ...inp, appearance: 'none', cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center', paddingRight: 28 }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, display: 'block' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 540, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{persona ? 'Editar persona' : 'Nueva persona'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Foto */}
            <FotoUploader foto={form.foto} nombre={form.nombre} onChange={b64 => setForm(f => ({ ...f, foto: b64 }))} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Nombre completo *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" style={inp} />
              </div>
              <div>
                <label style={lbl}>Área *</label>
                <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} style={sel}>
                  {AREAS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Cargo</label>
                <select value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} style={inp}>
                  <option value="">Seleccionar cargo...</option>
                  {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Correo electrónico *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="correo@socialexperience.com.co" style={inp} />
                <label style={lbl}>Cédula</label>
                <input value={form.cedula ?? ''} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} placeholder="Número de cédula" style={inp} />
              </div>
              <div>
                <label style={lbl}>Clave de acceso *</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={form.clave} onChange={e => setForm(f => ({ ...f, clave: e.target.value }))} placeholder="Clave para ingresar" style={{ ...inp, paddingRight: 36 }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                    {showPwd ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={lbl}>Permiso</label>
                <select value={form.permiso} onChange={e => setForm(f => ({ ...f, permiso: e.target.value }))} style={sel}>
                  {PERMISOS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Costo mensual (COP)</label>
                <input type="number" value={form.costoMensual || ''} onChange={e => setForm(f => ({ ...f, costoMensual: Number(e.target.value) }))} placeholder="0" style={inp} />
              </div>
              <div>
                <label style={lbl}>Estado</label>
                <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value as 'Activo' | 'Inactivo' }))} style={sel}>
                  <option>Activo</option><option>Inactivo</option>
                </select>
              </div>
            </div>

            {error && <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>{error}</p>}
          </div>

          <div style={{ padding: '14px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ height: 36, padding: '0 16px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ height: 36, padding: '0 20px', background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              {persona ? 'Guardar cambios' : 'Crear persona'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function PersonasPage() {
  const { personasStore, addPersonaStore, updatePersonaStore } = useStore()

  const [search, setSearch]           = useState('')
  const [filtroArea, setFiltroArea]   = useState('Todas')
  const [showModal, setShowModal]     = useState(false)
  const [editando, setEditando]       = useState<PersonaStore | null>(null)
  const [sortAZ, setSortAZ]           = useState(false)

  const personas = personasStore.filter(p => p.estado !== 'Inactivo' || filtroArea !== 'Activos')

  const filtered = personas
    .filter(p => {
      const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || (p.email ?? '').toLowerCase().includes(search.toLowerCase())
      const matchArea   = filtroArea === 'Todas' || p.area === filtroArea
      return matchSearch && matchArea
    })
    .sort((a, b) => sortAZ ? a.nombre.localeCompare(b.nombre, 'es') : 0)

  const totalActivos = personasStore.filter(p => p.estado !== 'Inactivo').length

  const th: React.CSSProperties = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid #F3F4F6', verticalAlign: 'middle' }

  const sel: React.CSSProperties = {
    height: 34, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer', minWidth: 120,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center', paddingRight: 28,
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, boxSizing: 'border-box' }}>

      {showModal && (
        <PersonaModal onClose={() => setShowModal(false)} onSave={data => { addPersonaStore(data); setShowModal(false) }} />
      )}
      {editando && (
        <PersonaModal persona={editando} onClose={() => setEditando(null)}
          onSave={data => { updatePersonaStore(editando.id, data); setEditando(null) }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Equipo</h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>Gestiona las personas de la agencia y sus accesos.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
          <Plus style={{ width: 15, height: 15 }} />
          Nueva persona
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Total personas', value: personasStore.length, Icon: Users, bg: '#EFF6FF', color: '#1D4ED8' },
          { label: 'Activas',        value: totalActivos,          Icon: UserCheck, bg: '#F0FDF4', color: '#059669' },
          { label: 'Con foto',       value: personasStore.filter(p => p.foto).length, Icon: Crown, bg: '#F5F3FF', color: '#7C3AED' },
        ].map(({ label, value, Icon, bg, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ width: 18, height: 18, color }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar persona o correo..."
            style={{ height: 34, paddingLeft: 32, paddingRight: 12, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#374151', outline: 'none', width: 220 }} />
        </div>
        <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} style={sel}>
          {AREAS_FILTRO.map(a => <option key={a}>{a}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>
                <button onClick={() => setSortAZ(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: sortAZ ? '#1A56DB' : '#9CA3AF', padding: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Persona
                  <ChevronsUpDown style={{ width: 13, height: 13 }} />
                </button>
              </th>
              <th style={th}>Área / Cargo</th>
              <th style={th}>Correo</th>
              <th style={th}>Cédula</th>
              <th style={th}>Permiso</th>
              <th style={th}>Clave</th>
              <th style={th}>Costo mensual</th>
              <th style={th}>Estado</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => {
              const ps = PERMISO_STYLE[p.permiso ?? 'Producción'] ?? PERMISO_STYLE['Producción']
              const isLast = idx === filtered.length - 1
              return (
                <tr key={p.id} style={{ borderBottom: isLast ? 'none' : undefined }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: p.foto ? 'transparent' : '#DBEAFE', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {p.foto
                          ? <img src={p.foto} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8' }}>{initials(p.nombre)}</span>
                        }
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{p.nombre}</span>
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ fontSize: 13, color: '#111827' }}>{p.area}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{p.cargo}</div>
                  </td>
                  <td style={{ ...td, fontSize: 12, color: '#6B7280' }}>{p.email ?? '—'}</td>
                  <td style={{ ...td, fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>{p.cedula ?? '—'}</td>
                  <td style={td}>
                    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ps.bg, color: ps.color }}>
                      {p.permiso ?? 'Producción'}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, padding: '2px 8px', borderRadius: 5, background: '#F3F4F6', color: '#374151', letterSpacing: '0.1em' }}>
                      {p.clave ?? '—'}
                    </span>
                  </td>
                  <td style={{ ...td, fontSize: 13, color: '#374151', fontWeight: 500 }}>{formatCOP(p.costoMensual)}</td>
                  <td style={td}>
                    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                      background: p.estado === 'Activo' ? '#F0FDF4' : '#F9FAFB',
                      color: p.estado === 'Activo' ? '#065F46' : '#6B7280' }}>
                      {p.estado ?? 'Activo'}
                    </span>
                  </td>
                  <td style={td}>
                    <button onClick={() => setEditando(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}>
                      <Pencil style={{ width: 12, height: 12 }} />
                      Editar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 13, color: '#9CA3AF' }}>
        Mostrando {filtered.length} de {personasStore.length} personas
      </div>
    </div>
  )
}
