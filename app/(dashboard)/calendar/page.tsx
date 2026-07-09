'use client'

import { useState, useMemo } from 'react'
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Plus, X, Clock, ChevronDown, AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { useStore, RegistroTiempo } from '@/lib/store'
import { TrendingUp, TrendingDown, FolderOpen } from 'lucide-react'

// ─── Config ────────────────────────────────────────────────────────────────────
const HOUR_H  = 64
const START_H = 7
const HOURS   = [7,8,9,10,11,12,13,14,15,16,17,18,19]
const HORAS_MES = 176

const PALETTE = [
  { dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  { dot: '#10B981', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  { dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  { dot: '#8B5CF6', bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
  { dot: '#EC4899', bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8' },
  { dot: '#EF4444', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  { dot: '#06B6D4', bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' },
  { dot: '#84CC16', bg: '#F7FEE7', text: '#3F6212', border: '#D9F99D' },
]

function colorForProject(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function toTop(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h - START_H + m / 60) * HOUR_H
}
function toHeight(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60 * HOUR_H
}
function horasDiff(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60
}
function toMins(t: string) {
  const [h, m] = t.split(':').map(Number); return h * 60 + m
}
function formatCOP(v: number) {
  return `$${Math.round(v).toLocaleString('es-CO')}`
}

// Detect overlap between two time ranges
function overlaps(s1: string, e1: string, s2: string, e2: string) {
  return toMins(s1) < toMins(e2) && toMins(e1) > toMins(s2)
}

// ─── Date helpers ──────────────────────────────────────────────────────────────
const DAY_NAMES_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MON_NAMES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MON_SHORT    = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function weekStart(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0,0,0,0)
  return d
}
function addDays(date: Date, n: number) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function fmtShort(date: Date) { return `${date.getDate()} ${MON_SHORT[date.getMonth()]}` }
function isoToDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d)
}
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const timeOpts = Array.from({ length: 35 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2,'0')}:${m}`
}).concat(['24:00'])

// ─── Shared styles ─────────────────────────────────────────────────────────────
const selectStyle = {
  width: '100%', height: 40, paddingLeft: 12, paddingRight: 28,
  border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#111827',
  background: '#fff', cursor: 'pointer', outline: 'none', appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const, backgroundPosition: 'right 10px center',
}

// ─── Panel (Nuevo registro) ────────────────────────────────────────────────────
function Panel({ onClose, onSave, proyectosNombres, registros, currentUser }: {
  onClose: () => void
  onSave: (r: Omit<RegistroTiempo, 'id' | 'createdAt'>) => void
  proyectosNombres: string[]
  registros: RegistroTiempo[]
  currentUser: import('@/lib/store').PersonaStore
}) {
  const CURRENT_USER = currentUser
  const [fecha,      setFecha]      = useState(todayISO())
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFin,    setHoraFin]    = useState('11:00')
  const [proyecto,   setProyecto]   = useState(proyectosNombres[0] ?? '')
  const [actividad,  setActividad]  = useState('')
  const [conflict,   setConflict]   = useState<string | null>(null)

  const costoHora = CURRENT_USER.costoMensual / HORAS_MES
  const horas     = horasDiff(horaInicio, horaFin)
  const costoEst  = costoHora * Math.max(horas, 0)

  function calcDuracion() {
    const mins = Math.round(horas * 60)
    if (mins <= 0) return '—'
    const h = Math.floor(mins / 60), m = mins % 60
    return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`
  }

  function checkAndSave() {
    // Detect overlap with existing registros of same person on same date
    const same = registros.filter(r => r.persona === CURRENT_USER.nombre && r.fecha === fecha)
    const hit  = same.find(r => overlaps(horaInicio, horaFin, r.horaInicio, r.horaFin))
    if (hit) {
      setConflict(`Ya tienes "${hit.actividad}" registrado de ${hit.horaInicio} a ${hit.horaFin}. Elige otro horario.`)
      return
    }
    onSave({
      proyectoId: '',
      proyecto,
      fecha,
      horaInicio,
      horaFin,
      actividad: actividad.trim(),
      persona: CURRENT_USER.nombre,
      area: CURRENT_USER.area,
      costoHora,
    })
    onClose()
  }

  return (
    <div style={{ width: 340, flexShrink: 0, background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Registrar tiempo</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
          <X style={{ width: 17, height: 17 }} />
        </button>
      </div>


      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Conflict alert */}
        {conflict && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
            <AlertTriangle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.4 }}>{conflict}</div>
          </div>
        )}

        {/* Fecha */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Fecha</div>
          <div style={{ position: 'relative' }}>
            <CalIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#6B7280', pointerEvents: 'none' }} />
            <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setConflict(null) }}
              style={{ width: '100%', height: 40, paddingLeft: 32, paddingRight: 12, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#111827', background: '#fff', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Horas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[{ label: 'Hora inicio', val: horaInicio, set: (v: string) => { setHoraInicio(v); setConflict(null) } },
            { label: 'Hora fin',    val: horaFin,    set: (v: string) => { setHoraFin(v);    setConflict(null) } }].map(({ label, val, set }) => (
            <div key={label}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</div>
              <div style={{ position: 'relative' }}>
                <Clock style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#9CA3AF', pointerEvents: 'none' }} />
                <select value={val} onChange={e => set(e.target.value)} style={{ ...selectStyle, paddingLeft: 26 }}>
                  {timeOpts.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Duración */}
        <div style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>Duración total</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{calcDuracion()}</div>
        </div>

        {/* Proyecto */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Proyecto</div>
          <select value={proyecto} onChange={e => setProyecto(e.target.value)} style={selectStyle}>
            {proyectosNombres.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Actividad */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Actividad / labor realizada</div>
          <div style={{ position: 'relative' }}>
            <textarea value={actividad} onChange={e => setActividad(e.target.value.slice(0, 500))} rows={4}
              placeholder="Describe brevemente qué se hizo..."
              style={{ width: '100%', padding: 12, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }} />
            <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 10, color: '#D1D5DB' }}>{actividad.length}/500</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, height: 40, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button
          disabled={!actividad.trim() || !proyecto || horas <= 0}
          onClick={checkAndSave}
          style={{ flex: 1, height: 40, background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: (!actividad.trim() || !proyecto || horas <= 0) ? 0.4 : 1 }}>
          Guardar registro
        </button>
      </div>
    </div>
  )
}

// ─── Edit panel ────────────────────────────────────────────────────────────────
function EditPanel({ registro, registros, proyectosNombres, onClose, onSave, onDelete, currentUser }: {
  registro: RegistroTiempo
  registros: RegistroTiempo[]
  proyectosNombres: string[]
  onClose: () => void
  onSave: (id: string, changes: Partial<RegistroTiempo>) => void
  onDelete: (id: string) => void
  currentUser: import('@/lib/store').PersonaStore
}) {
  const CURRENT_USER = currentUser
  const [fecha,      setFecha]      = useState(registro.fecha)
  const [horaInicio, setHoraInicio] = useState(registro.horaInicio)
  const [horaFin,    setHoraFin]    = useState(registro.horaFin)
  const [proyecto,   setProyecto]   = useState(registro.proyecto)
  const [actividad,  setActividad]  = useState(registro.actividad)
  const [conflict,   setConflict]   = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)

  const costoHora = registro.costoHora
  const horas     = horasDiff(horaInicio, horaFin)
  const costoEst  = costoHora * Math.max(horas, 0)

  function calcDuracion() {
    const mins = Math.round(horas * 60)
    if (mins <= 0) return '—'
    const h = Math.floor(mins / 60), m = mins % 60
    return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`
  }

  function handleSave() {
    const otros = registros.filter(r => r.id !== registro.id && r.persona === CURRENT_USER.nombre && r.fecha === fecha)
    const hit   = otros.find(r => overlaps(horaInicio, horaFin, r.horaInicio, r.horaFin))
    if (hit) {
      setConflict(`Conflicto con "${hit.actividad}" (${hit.horaInicio}–${hit.horaFin}).`)
      return
    }
    onSave(registro.id, { fecha, horaInicio, horaFin, proyecto, actividad })
    onClose()
  }

  const pc = colorForProject(proyecto)

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 360, background: '#fff', borderLeft: '1px solid #E5E7EB', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 24px rgba(0,0,0,0.08)' }}>
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: pc.dot }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Editar registro</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X style={{ width: 17, height: 17 }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {conflict && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8 }}>
              <AlertTriangle style={{ width: 15, height: 15, color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: '#991B1B' }}>{conflict}</div>
            </div>
          )}

          {/* Fecha */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Fecha</div>
            <div style={{ position: 'relative' }}>
              <CalIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#6B7280', pointerEvents: 'none' }} />
              <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); setConflict(null) }}
                style={{ width: '100%', height: 40, paddingLeft: 32, paddingRight: 12, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#111827', background: '#fff', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>

          {/* Horas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{ label: 'Hora inicio', val: horaInicio, set: (v: string) => { setHoraInicio(v); setConflict(null) } },
              { label: 'Hora fin',    val: horaFin,    set: (v: string) => { setHoraFin(v);    setConflict(null) } }].map(({ label, val, set }) => (
              <div key={label}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</div>
                <div style={{ position: 'relative' }}>
                  <Clock style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#9CA3AF', pointerEvents: 'none' }} />
                  <select value={val} onChange={e => set(e.target.value)} style={{ ...selectStyle, paddingLeft: 26 }}>
                    {timeOpts.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {/* Duración */}
          <div style={{ padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 3 }}>Duración total</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{calcDuracion()}</div>
          </div>

          {/* Proyecto */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Proyecto</div>
            <select value={proyecto} onChange={e => setProyecto(e.target.value)} style={selectStyle}>
              {proyectosNombres.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Actividad */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Actividad</div>
            <div style={{ position: 'relative' }}>
              <textarea value={actividad} onChange={e => setActividad(e.target.value.slice(0, 500))} rows={4}
                style={{ width: '100%', padding: 12, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }} />
              <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 10, color: '#D1D5DB' }}>{actividad.length}/500</div>
            </div>
          </div>

          {/* Eliminar */}
          {confirmDel ? (
            <div style={{ padding: '12px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FECACA' }}>
              <p style={{ fontSize: 13, color: '#991B1B', margin: '0 0 10px' }}>¿Eliminar este registro?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConfirmDel(false)} style={{ flex: 1, height: 34, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, color: '#374151', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
                <button onClick={() => { onDelete(registro.id); onClose() }} style={{ flex: 1, height: 34, background: '#DC2626', border: 'none', borderRadius: 7, fontSize: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Eliminar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDel(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <Trash2 style={{ width: 14, height: 14 }} /> Eliminar registro
            </button>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!actividad.trim() || horas <= 0}
            style={{ flex: 1, height: 40, background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', opacity: (!actividad.trim() || horas <= 0) ? 0.4 : 1 }}>
            Guardar cambios
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Event block ───────────────────────────────────────────────────────────────
function EventBlock({ ev, onEdit, compact = false, currentUserNombre }: { ev: RegistroTiempo; onEdit: () => void; compact?: boolean; currentUserNombre: string }) {
  const pc     = colorForProject(ev.proyecto)
  const top    = toTop(ev.horaInicio)
  const height = toHeight(ev.horaInicio, ev.horaFin)
  const horas  = horasDiff(ev.horaInicio, ev.horaFin)
  const costo  = ev.costoHora * horas
  const isOwn  = ev.persona === currentUserNombre

  return (
    <div onClick={isOwn ? onEdit : undefined}
      style={{ position: 'absolute', top: top + 2, left: compact ? 3 : 8, right: compact ? 3 : 8, height: height - 4,
        background: pc.bg, border: `1px solid ${pc.border}`, borderLeft: `3px solid ${pc.dot}`,
        borderRadius: 6, padding: compact ? '4px 6px' : '5px 8px',
        cursor: isOwn ? 'pointer' : 'default', overflow: 'hidden',
        transition: 'filter 0.1s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
        <div style={{ width: compact ? 6 : 7, height: compact ? 6 : 7, borderRadius: '50%', background: pc.dot, flexShrink: 0 }} />
        <span style={{ fontSize: compact ? 10 : 11, fontWeight: 700, color: pc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ev.proyecto}</span>
        {isOwn && height > 40 && <Pencil style={{ width: 10, height: 10, color: pc.text, opacity: 0.5, flexShrink: 0 }} />}
      </div>
      <div style={{ fontSize: compact ? 9 : 10, color: pc.text, opacity: 0.75 }}>
        {ev.horaInicio}–{ev.horaFin} · {ev.persona.split(' ')[0]}
      </div>
      {height > 56 && <div style={{ fontSize: compact ? 9 : 10, color: pc.text, opacity: 0.65, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{ev.actividad}</div>}
    </div>
  )
}

// ─── Week grid ─────────────────────────────────────────────────────────────────
function WeekGrid({ monday, today, registros, onEdit, currentUserNombre }: { monday: Date; today: Date; registros: RegistroTiempo[]; onEdit: (r: RegistroTiempo) => void; currentUserNombre: string }) {
  const cols = Array.from({ length: 5 }, (_, i) => addDays(monday, i))
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(5,1fr)', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ padding: '10px 0', borderRight: '1px solid #F3F4F6', textAlign: 'right', paddingRight: 8 }}>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>GMT-5</span>
        </div>
        {cols.map((d, i) => {
          const isToday = sameDay(d, today)
          return (
            <div key={i} style={{ padding: '10px 0', textAlign: 'center', borderRight: i < 4 ? '1px solid #F3F4F6' : 'none', background: isToday ? '#F8FAFF' : '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: isToday ? '#1A56DB' : '#6B7280' }}>{DAY_NAMES_ES[d.getDay()]}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? '#1A56DB' : '#111827', marginTop: 2 }}>{fmtShort(d)}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(5,1fr)', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
        <div style={{ borderRight: '1px solid #F3F4F6', position: 'relative', height: HOURS.length * HOUR_H }}>
          {HOURS.map(h => (
            <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H - 7, right: 8, fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
              {String(h).padStart(2,'0')}:00
            </div>
          ))}
        </div>
        {cols.map((d, di) => {
          const isToday = sameDay(d, today)
          const dayRegs = registros.filter(r => sameDay(isoToDate(r.fecha), d))
          return (
            <div key={di} style={{ position: 'relative', height: HOURS.length * HOUR_H, borderRight: di < 4 ? '1px solid #F3F4F6' : 'none', background: isToday ? '#FAFBFF' : '#fff' }}>
              {HOURS.map(h => <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H, left: 0, right: 0, borderTop: '1px solid #F3F4F6' }} />)}
              {HOURS.map(h => <div key={`hh${h}`} style={{ position: 'absolute', top: (h - START_H) * HOUR_H + HOUR_H / 2, left: 0, right: 0, borderTop: '1px dashed #F9FAFB' }} />)}
              {dayRegs.map(ev => <EventBlock key={ev.id} ev={ev} onEdit={() => onEdit(ev)} compact currentUserNombre={currentUserNombre} />)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day grid ──────────────────────────────────────────────────────────────────
function DayGrid({ day, today, registros, onEdit, currentUserNombre }: { day: Date; today: Date; registros: RegistroTiempo[]; onEdit: (r: RegistroTiempo) => void; currentUserNombre: string }) {
  const isToday = sameDay(day, today)
  const dayRegs = registros.filter(r => sameDay(isoToDate(r.fecha), day))
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ padding: '10px 0', borderRight: '1px solid #F3F4F6', textAlign: 'right', paddingRight: 8 }}>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>GMT-5</span>
        </div>
        <div style={{ padding: '10px 0', textAlign: 'center', background: isToday ? '#F8FAFF' : '#fff' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: isToday ? '#1A56DB' : '#6B7280' }}>{DAY_NAMES_ES[day.getDay()]}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: isToday ? '#1A56DB' : '#111827', marginTop: 2 }}>{fmtShort(day)}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
        <div style={{ borderRight: '1px solid #F3F4F6', position: 'relative', height: HOURS.length * HOUR_H }}>
          {HOURS.map(h => (
            <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H - 7, right: 8, fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
              {String(h).padStart(2,'0')}:00
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', height: HOURS.length * HOUR_H, background: isToday ? '#FAFBFF' : '#fff' }}>
          {HOURS.map(h => <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H, left: 0, right: 0, borderTop: '1px solid #F3F4F6' }} />)}
          {dayRegs.map(ev => <EventBlock key={ev.id} ev={ev} onEdit={() => onEdit(ev)} currentUserNombre={currentUserNombre} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Month grid ────────────────────────────────────────────────────────────────
function MonthGrid({ month, year, today, registros, onEdit, currentUserNombre }: { month: number; year: number; today: Date; registros: RegistroTiempo[]; onEdit: (r: RegistroTiempo) => void; currentUserNombre: string }) {
  const firstDay   = new Date(year, month, 1)
  const lastDay    = new Date(year, month + 1, 0)
  const startDow   = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const gridStart  = addDays(firstDay, -startDow)
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #E5E7EB' }}>
        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
          <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
        {Array.from({ length: totalCells }, (_, i) => {
          const d = addDays(gridStart, i)
          const inMonth = d.getMonth() === month && d.getFullYear() === year
          const isToday = sameDay(d, today)
          const dayRegs = registros.filter(r => sameDay(isoToDate(r.fecha), d))
          return (
            <div key={i} style={{ minHeight: 90, padding: '6px 8px', borderRight: (i+1)%7===0?'none':'1px solid #F3F4F6', borderBottom: i<totalCells-7?'1px solid #F3F4F6':'none', background: isToday ? '#F0F6FF' : '#fff' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: isToday ? '#1A56DB' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : inMonth ? '#111827' : '#D1D5DB' }}>{d.getDate()}</span>
              </div>
              {dayRegs.slice(0, 2).map(ev => {
                const pc = colorForProject(ev.proyecto)
                const isOwn = ev.persona === currentUserNombre
                return (
                  <div key={ev.id} onClick={isOwn ? () => onEdit(ev) : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 5px', borderRadius: 4, background: pc.bg, marginBottom: 2, cursor: isOwn ? 'pointer' : 'default', overflow: 'hidden' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: pc.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 500, color: pc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.proyecto}</span>
                  </div>
                )
              })}
              {dayRegs.length > 2 && <div style={{ fontSize: 10, color: '#9CA3AF', paddingLeft: 5 }}>+{dayRegs.length - 2} más</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date()
  const [view, setView]           = useState<'Mes' | 'Semana' | 'Día'>('Semana')
  const [cursor, setCursor]       = useState(new Date())
  const [showPanel, setShowPanel] = useState(false)
  const [editing, setEditing]     = useState<RegistroTiempo | null>(null)
  const { proyectos, registros, addRegistro, updateRegistro, deleteRegistro, currentUser, personasStore } = useStore()
  const CURRENT_USER = currentUser!
  const [filtroPersona, setFiltroPersona] = useState(CURRENT_USER.nombre)

  const empleados = useMemo(() => {
    const nombres = Array.from(new Set(registros.map(r => r.persona))).sort()
    return ['Todos', ...nombres]
  }, [registros])

  const registrosFiltrados = useMemo(() =>
    filtroPersona === 'Todos' ? registros : registros.filter(r => r.persona === filtroPersona)
  , [registros, filtroPersona])

  const storeProyectos = proyectos.map(p => p.nombre)

  function navigate(dir: 1 | -1) {
    if (view === 'Semana') setCursor(addDays(cursor, dir * 7))
    else if (view === 'Día') setCursor(addDays(cursor, dir))
    else { const d = new Date(cursor); d.setMonth(d.getMonth() + dir); setCursor(d) }
  }

  function dateLabel() {
    if (view === 'Semana') {
      const mon = weekStart(cursor), fri = addDays(mon, 4)
      return `${fmtShort(mon)} – ${fmtShort(fri)} ${mon.getFullYear()}`
    }
    if (view === 'Día') return `${DAY_NAMES_ES[cursor.getDay()]}, ${fmtShort(cursor)} ${cursor.getFullYear()}`
    return `${MON_NAMES_ES[cursor.getMonth()]} ${cursor.getFullYear()}`
  }

  const semanaActual = useMemo(() => {
    const mon = weekStart(today), sun = addDays(mon, 6)
    return registros.filter(r => { const d = isoToDate(r.fecha); return d >= mon && d <= sun })
  }, [registros])

  // Horas por proyecto esta semana
  const horasPorProyecto = useMemo(() => {
    const map: Record<string, number> = {}
    semanaActual.forEach(r => {
      map[r.proyecto] = (map[r.proyecto] ?? 0) + horasDiff(r.horaInicio, r.horaFin)
    })
    return map
  }, [semanaActual])

  const proyectosSemana   = Object.keys(horasPorProyecto)
  const cantidadProyectos = proyectosSemana.length

  const proyectoMayor = proyectosSemana.length
    ? proyectosSemana.reduce((a, b) => horasPorProyecto[a] >= horasPorProyecto[b] ? a : b)
    : null

  const proyectoMenor = proyectosSemana.length > 1
    ? proyectosSemana.reduce((a, b) => horasPorProyecto[a] <= horasPorProyecto[b] ? a : b)
    : null

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>Calendar</h1>
            <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
              Registra el tiempo del equipo creativo por proyecto para calcular costos de nómina automáticamente.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            {
              label: 'Mayor carga esta semana',
              value: proyectoMayor ?? '—',
              sub: proyectoMayor ? `${horasPorProyecto[proyectoMayor].toFixed(1)} h registradas` : 'Sin registros',
              icon: TrendingUp, bg: '#EFF6FF', ic: '#1A56DB',
            },
            {
              label: 'Proyectos esta semana',
              value: String(cantidadProyectos),
              sub: cantidadProyectos === 1 ? '1 proyecto activo' : `${cantidadProyectos} proyectos activos`,
              icon: FolderOpen, bg: '#F0FDF4', ic: '#16A34A',
            },
            {
              label: 'Menor carga esta semana',
              value: proyectoMenor ?? (proyectoMayor ?? '—'),
              sub: proyectoMenor ? `${horasPorProyecto[proyectoMenor].toFixed(1)} h registradas` : (proyectoMayor ? `${horasPorProyecto[proyectoMayor].toFixed(1)} h registradas` : 'Sin registros'),
              icon: TrendingDown, bg: '#FFFBEB', ic: '#D97706',
            },
          ].map(({ label, value, sub, icon: Icon, bg, ic }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 18, height: 18, color: ic }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7, background: '#fff', fontSize: 13, color: '#374151', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              <CalIcon style={{ width: 13, height: 13, color: '#6B7280' }} />
              {dateLabel()}
              <ChevronDown style={{ width: 12, height: 12, color: '#9CA3AF' }} />
            </div>
            <input type="month"
              value={`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`}
              onChange={e => { if (e.target.value) { const [y,m] = e.target.value.split('-').map(Number); const d = new Date(cursor); d.setFullYear(y); d.setMonth(m-1); setCursor(d) } }}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {[-1, 1].map(dir => (
              <button key={dir} onClick={() => navigate(dir as 1 | -1)}
                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB', borderRadius: 7, background: '#fff', cursor: 'pointer', color: '#374151' }}>
                {dir === -1 ? <ChevronLeft style={{ width: 15, height: 15 }} /> : <ChevronRight style={{ width: 15, height: 15 }} />}
              </button>
            ))}
          </div>
          <button onClick={() => setCursor(new Date())}
            style={{ height: 32, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7, background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
            Hoy
          </button>
          <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginLeft: 'auto' }}>
            {(['Mes','Semana','Día'] as const).map((v, i) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '5px 14px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                  borderRight: i < 2 ? '1px solid #E5E7EB' : 'none',
                  background: view === v ? '#1A56DB' : '#fff',
                  color: view === v ? '#fff' : '#374151' }}>
                {v}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>Empleado:</span>
            <select value={filtroPersona} onChange={e => setFiltroPersona(e.target.value)}
              style={{ height: 32, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer' }}>
              {empleados.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
          <button onClick={() => setShowPanel(true)}
            style={{ height: 34, padding: '0 14px', background: '#1A56DB', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus style={{ width: 14, height: 14 }} /> Registrar tiempo
          </button>
        </div>

        {/* Calendar view */}
        {view === 'Semana' && <WeekGrid monday={weekStart(cursor)} today={today} registros={registrosFiltrados} onEdit={setEditing} currentUserNombre={CURRENT_USER.nombre} />}
        {view === 'Día'    && <DayGrid  day={cursor}               today={today} registros={registrosFiltrados} onEdit={setEditing} currentUserNombre={CURRENT_USER.nombre} />}
        {view === 'Mes'    && <MonthGrid month={cursor.getMonth()} year={cursor.getFullYear()} today={today} registros={registrosFiltrados} onEdit={setEditing} currentUserNombre={CURRENT_USER.nombre} />}
      </div>

      {showPanel && (
        <Panel
          onClose={() => setShowPanel(false)}
          onSave={r => addRegistro({ ...r, proyectoId: proyectos.find(p => p.nombre === r.proyecto)?.id ?? '' })}
          proyectosNombres={storeProyectos}
          registros={registros}
          currentUser={CURRENT_USER}
        />
      )}

      {editing && (
        <EditPanel
          registro={editing}
          registros={registros}
          proyectosNombres={storeProyectos}
          onClose={() => setEditing(null)}
          onSave={updateRegistro}
          onDelete={deleteRegistro}
          currentUser={CURRENT_USER}
        />
      )}
    </div>
  )
}
