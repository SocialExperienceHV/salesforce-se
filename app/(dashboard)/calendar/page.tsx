'use client'

import { useState } from 'react'
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Plus, X, Clock, Search, ChevronDown, Info } from 'lucide-react'
import { useStore } from '@/lib/store'

// ─── Config ────────────────────────────────────────────────────────────────────
const HOUR_H = 64   // px per hour
const START_H = 7   // 07:00
const HOURS = [7,8,9,10,11,12,13,14,15,16,17,18,19]

function toTop(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h - START_H + m / 60) * HOUR_H
}
function toHeight(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60 * HOUR_H
}

// ─── Project colors ────────────────────────────────────────────────────────────
const projectColors: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  'Activación Mundial Banco Falabella':      { dot: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  'Campaña Aniversario Éxito 82 años':       { dot: '#10B981', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  'Lanzamiento Desinfectante Lysol Clean':   { dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  'Catálogo Primavera Homecenter':           { dot: '#8B5CF6', bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
  'Educación Financiera Q4':                 { dot: '#EC4899', bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8' },
}

// ─── Events ────────────────────────────────────────────────────────────────────
const events = [
  // Lunes 22
  { id:1, day:0, proyecto:'Activación Mundial Banco Falabella',    start:'09:00', end:'11:00', tarea:'Ajustes deck' },
  { id:2, day:0, proyecto:'Campaña Aniversario Éxito 82 años',     start:'12:00', end:'13:30', tarea:'Seguimiento cliente' },
  { id:3, day:0, proyecto:'Catálogo Primavera Homecenter',         start:'14:00', end:'16:00', tarea:'Revisión producción' },
  // Martes 23
  { id:4, day:1, proyecto:'Activación Mundial Banco Falabella',    start:'09:00', end:'11:00', tarea:'Ajustes de presentación' },
  { id:5, day:1, proyecto:'Campaña Aniversario Éxito 82 años',     start:'11:30', end:'13:00', tarea:'Desarrollo concepto' },
  { id:6, day:1, proyecto:'Lanzamiento Desinfectante Lysol Clean', start:'15:00', end:'16:30', tarea:'Reunión interna' },
  // Miércoles 24
  { id:7, day:2, proyecto:'Lanzamiento Desinfectante Lysol Clean', start:'08:00', end:'10:00', tarea:'Desarrollo concepto' },
  { id:8, day:2, proyecto:'Activación Mundial Banco Falabella',    start:'11:30', end:'12:00', tarea:'Revisión feedback' },
  { id:9, day:2, proyecto:'Catálogo Primavera Homecenter',         start:'14:00', end:'16:00', tarea:'Ajustes piezas' },
  // Jueves 25
  { id:10, day:3, proyecto:'Campaña Aniversario Éxito 82 años',    start:'09:00', end:'11:00', tarea:'Aprobación piezas' },
  { id:11, day:3, proyecto:'Lanzamiento Desinfectante Lysol Clean', start:'11:30', end:'13:00', tarea:'Revisión producción' },
  { id:12, day:3, proyecto:'Activación Mundial Banco Falabella',   start:'15:00', end:'17:00', tarea:'Coordinación interna' },
  // Viernes 26
  { id:13, day:4, proyecto:'Catálogo Primavera Homecenter',        start:'09:00', end:'11:00', tarea:'Cierre contenidos' },
  { id:14, day:4, proyecto:'Campaña Aniversario Éxito 82 años',    start:'14:00', end:'16:00', tarea:'Informe final' },
]

const DAYS = [
  { label: 'Lunes',      date: '22 sep', isToday: false },
  { label: 'Martes',     date: '23 sep', isToday: true  },
  { label: 'Miércoles',  date: '24 sep', isToday: false },
  { label: 'Jueves',     date: '25 sep', isToday: false },
  { label: 'Viernes',    date: '26 sep', isToday: false },
]

const proyectosList = [
  'Activación Mundial Banco Falabella',
  'Campaña Aniversario Éxito 82 años',
  'Lanzamiento Desinfectante Lysol Clean',
  'Catálogo Primavera Homecenter',
  'Educación Financiera Q4',
]

// ─── Time options ───────────────────────────────────────────────────────────
const timeOpts = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 7
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2,'0')}:${m}`
})

// ─── Panel ─────────────────────────────────────────────────────────────────────
function Panel({ onClose, addRegistro, storeProyectos }: { onClose: () => void; addRegistro: (r: { proyectoId: string; proyecto: string; fecha: string; horaInicio: string; horaFin: string; actividad: string; persona: string }) => void; storeProyectos: string[] }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFin, setHoraFin] = useState('11:00')
  const [proyecto, setProyecto] = useState(storeProyectos[0] ?? proyectosList[0])
  const [actividad, setActividad] = useState('')
  const listaProyectos = storeProyectos.length > 0 ? storeProyectos : proyectosList

  function calcDuracion() {
    const [sh, sm] = horaInicio.split(':').map(Number)
    const [eh, em] = horaFin.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    if (mins <= 0) return '—'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`
  }

  const pc = projectColors[proyecto]

  const TimeSelect = ({ value, set }: { value: string; set: (v: string) => void }) => (
    <div style={{ position: 'relative', flex: 1 }}>
      <Clock style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF', pointerEvents: 'none' }} />
      <select value={value} onChange={e => set(e.target.value)}
        style={{ width: '100%', height: 40, paddingLeft: 32, paddingRight: 28, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, color: '#111827', background: '#fff', cursor: 'pointer', outline: 'none', appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
        {timeOpts.map(t => <option key={t}>{t}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{ width: 320, flexShrink: 0, background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Registrar tiempo</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 0' }}>
        {/* Fecha */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Fecha</div>
          <div style={{ position: 'relative' }}>
            <CalIcon style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#6B7280', pointerEvents: 'none' }} />
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              style={{ width: '100%', height: 40, paddingLeft: 32, paddingRight: 12, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, color: '#111827', background: '#fff', cursor: 'pointer', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Horas */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Hora inicio</div>
            <TimeSelect value={horaInicio} set={setHoraInicio} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Hora fin</div>
            <TimeSelect value={horaFin} set={setHoraFin} />
          </div>
        </div>

        {/* Duración */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Duración total</div>
          <div style={{ height: 40, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 8, background: '#F9FAFB' }}>
            <Clock style={{ width: 15, height: 15, color: '#9CA3AF' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{calcDuracion()}</span>
          </div>
        </div>

        {/* Proyecto */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Proyecto</div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF', pointerEvents: 'none' }} />
            {pc && <div style={{ position: 'absolute', left: 30, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, borderRadius: '50%', background: pc.dot, pointerEvents: 'none' }} />}
            <select value={proyecto} onChange={e => setProyecto(e.target.value)}
              style={{ width: '100%', height: 40, paddingLeft: 46, paddingRight: 28, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#111827', background: '#fff', cursor: 'pointer', outline: 'none', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
              {listaProyectos.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Info style={{ width: 11, height: 11 }} />
            Los proyectos se cargan automáticamente desde el módulo de Proyectos.
          </div>
        </div>

        {/* Actividad */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Actividad / labor realizada</div>
          <div style={{ position: 'relative' }}>
            <textarea value={actividad} onChange={e => setActividad(e.target.value.slice(0, 500))}
              rows={4}
              style={{ width: '100%', padding: 12, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' }} />
            <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, color: '#9CA3AF' }}>{actividad.length} / 500</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, height: 40, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={() => {
          if (!actividad.trim()) { alert('Escribe la actividad realizada.'); return }
          addRegistro({ proyectoId: '', proyecto, fecha, horaInicio, horaFin, actividad: actividad.trim(), persona: 'Juan Camilo' })
          onClose()
        }} style={{ flex: 1, height: 40, background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
          Guardar registro
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const DAY_NAMES_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MON_NAMES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MON_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

/** Monday of the week containing `date` */
function weekStart(date: Date) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0,0,0,0)
  return d
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function fmtShort(date: Date) {
  return `${date.getDate()} ${MON_SHORT[date.getMonth()]}`
}

/** Attach events to real dates: events array uses day=0..4 for Mon-Fri of the reference week (22–26 sep 2026) */
const REF_WEEK_MON = new Date(2026, 8, 22) // 22 sep 2026 (month 8 = sep)

function getEventDate(ev: typeof events[0]) {
  return addDays(REF_WEEK_MON, ev.day)
}

// ─── Week grid ─────────────────────────────────────────────────────────────────
function WeekGrid({ monday, today }: { monday: Date; today: Date }) {
  const cols = Array.from({ length: 5 }, (_, i) => addDays(monday, i))
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
      {/* Headers */}
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
      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(5,1fr)', overflowY: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
        <div style={{ borderRight: '1px solid #F3F4F6', position: 'relative', height: HOURS.length * HOUR_H }}>
          {HOURS.map(h => (
            <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H - 7, right: 8, fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
              {String(h).padStart(2,'0')}:00
            </div>
          ))}
        </div>
        {cols.map((d, di) => {
          const isToday = sameDay(d, today)
          const dayEvs = events.filter(ev => sameDay(getEventDate(ev), d))
          return (
            <div key={di} style={{ position: 'relative', height: HOURS.length * HOUR_H, borderRight: di < 4 ? '1px solid #F3F4F6' : 'none', background: isToday ? '#FAFBFF' : '#fff' }}>
              {HOURS.map(h => <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H, left: 0, right: 0, borderTop: '1px solid #F3F4F6' }} />)}
              {HOURS.map(h => <div key={`hh${h}`} style={{ position: 'absolute', top: (h - START_H) * HOUR_H + HOUR_H / 2, left: 0, right: 0, borderTop: '1px dashed #F9FAFB' }} />)}
              {dayEvs.map(ev => {
                const pc = projectColors[ev.proyecto] ?? { dot: '#9CA3AF', bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }
                const top = toTop(ev.start)
                const height = toHeight(ev.start, ev.end)
                return (
                  <div key={ev.id} style={{ position: 'absolute', top: top + 2, left: 4, right: 4, height: height - 4,
                    background: pc.bg, border: `1px solid ${pc.border}`, borderLeft: `3px solid ${pc.dot}`,
                    borderRadius: 6, padding: '5px 7px', cursor: 'pointer', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: pc.dot, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: pc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.proyecto}</span>
                    </div>
                    <div style={{ fontSize: 10, color: pc.text, opacity: 0.8, marginBottom: 1 }}>{ev.start} – {ev.end}</div>
                    {height > 48 && <div style={{ fontSize: 10, color: pc.text, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.tarea}</div>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Day grid ──────────────────────────────────────────────────────────────────
function DayGrid({ day, today }: { day: Date; today: Date }) {
  const isToday = sameDay(day, today)
  const dayEvs = events.filter(ev => sameDay(getEventDate(ev), day))
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
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', overflowY: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
        <div style={{ borderRight: '1px solid #F3F4F6', position: 'relative', height: HOURS.length * HOUR_H }}>
          {HOURS.map(h => (
            <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H - 7, right: 8, fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
              {String(h).padStart(2,'0')}:00
            </div>
          ))}
        </div>
        <div style={{ position: 'relative', height: HOURS.length * HOUR_H, background: isToday ? '#FAFBFF' : '#fff' }}>
          {HOURS.map(h => <div key={h} style={{ position: 'absolute', top: (h - START_H) * HOUR_H, left: 0, right: 0, borderTop: '1px solid #F3F4F6' }} />)}
          {dayEvs.map(ev => {
            const pc = projectColors[ev.proyecto] ?? { dot: '#9CA3AF', bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }
            const top = toTop(ev.start)
            const height = toHeight(ev.start, ev.end)
            return (
              <div key={ev.id} style={{ position: 'absolute', top: top + 2, left: 8, right: 8, height: height - 4,
                background: pc.bg, border: `1px solid ${pc.border}`, borderLeft: `3px solid ${pc.dot}`,
                borderRadius: 6, padding: '6px 10px', cursor: 'pointer', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: pc.dot }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: pc.text }}>{ev.proyecto}</span>
                </div>
                <div style={{ fontSize: 12, color: pc.text, opacity: 0.8, marginBottom: 2 }}>{ev.start} – {ev.end}</div>
                {height > 48 && <div style={{ fontSize: 12, color: pc.text, opacity: 0.7 }}>{ev.tarea}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Month grid ────────────────────────────────────────────────────────────────
function MonthGrid({ month, year, today }: { month: number; year: number; today: Date }) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Start from Monday before or on the 1st
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const gridStart = addDays(firstDay, -startDow)
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
      {/* Weekday headers */}
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
          const dayEvs = events.filter(ev => sameDay(getEventDate(ev), d))
          return (
            <div key={i} style={{ minHeight: 90, padding: '6px 8px', borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid #F3F4F6', borderBottom: i < totalCells - 7 ? '1px solid #F3F4F6' : 'none', background: isToday ? '#F0F6FF' : '#fff' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: isToday ? '#1A56DB' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : inMonth ? '#111827' : '#D1D5DB' }}>{d.getDate()}</span>
              </div>
              {dayEvs.slice(0, 2).map(ev => {
                const pc = projectColors[ev.proyecto] ?? { dot: '#9CA3AF', bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }
                return (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 5px', borderRadius: 4, background: pc.bg, marginBottom: 2, cursor: 'pointer', overflow: 'hidden' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: pc.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, fontWeight: 500, color: pc.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.tarea}</span>
                  </div>
                )
              })}
              {dayEvs.length > 2 && <div style={{ fontSize: 10, color: '#9CA3AF', paddingLeft: 5 }}>+{dayEvs.length - 2} más</div>}
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
  const [view, setView] = useState<'Mes' | 'Semana' | 'Día'>('Semana')
  const [cursor, setCursor] = useState(new Date(2026, 8, 22)) // 22 sep 2026 as demo start
  const [showPanel, setShowPanel] = useState(false)
  const { proyectos, addRegistro } = useStore()
  const storeProyectos = proyectos.map(p => p.nombre)

  // Navigation step depends on view
  function navigate(dir: 1 | -1) {
    if (view === 'Semana') setCursor(addDays(cursor, dir * 7))
    else if (view === 'Día') setCursor(addDays(cursor, dir))
    else {
      const d = new Date(cursor)
      d.setMonth(d.getMonth() + dir)
      setCursor(d)
    }
  }

  function goToday() { setCursor(new Date()) }

  // Label in date picker
  function dateLabel() {
    const mon = weekStart(cursor)
    if (view === 'Semana') {
      const fri = addDays(mon, 4)
      return `${fmtShort(mon)} – ${fmtShort(fri)} ${mon.getFullYear()}`
    }
    if (view === 'Día') return `${DAY_NAMES_ES[cursor.getDay()]}, ${fmtShort(cursor)} ${cursor.getFullYear()}`
    return `${MON_NAMES_ES[cursor.getMonth()]} ${cursor.getFullYear()}`
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>Calendar</h1>
            <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6 }}>
              Registra el tiempo dedicado a cada proyecto, organiza tu jornada y lleva control de las horas trabajadas por día, semana o mes.
            </p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 200 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalIcon style={{ width: 19, height: 19, color: '#7C3AED' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>Proyectos registrados</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{events.length}</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7, background: '#fff', fontSize: 13, color: '#374151', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              <CalIcon style={{ width: 13, height: 13, color: '#6B7280' }} />
              {dateLabel()}
              <ChevronDown style={{ width: 12, height: 12, color: '#9CA3AF' }} />
            </div>
            <input type="month"
              value={`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`}
              onChange={e => { if (e.target.value) { const [y,m] = e.target.value.split('-').map(Number); const d = new Date(cursor); d.setFullYear(y); d.setMonth(m-1); setCursor(d) } }}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB', borderRadius: 7, background: '#fff', cursor: 'pointer', color: '#374151' }}>
              <ChevronLeft style={{ width: 15, height: 15 }} />
            </button>
            <button onClick={() => navigate(1)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB', borderRadius: 7, background: '#fff', cursor: 'pointer', color: '#374151' }}>
              <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          </div>
          <button onClick={goToday} style={{ height: 32, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 7, background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
            Hoy
          </button>
          <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginLeft: 'auto' }}>
            {(['Mes','Semana','Día'] as const).map((v, i) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding: '5px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                  borderRight: i < 2 ? '1px solid #E5E7EB' : 'none',
                  background: view === v ? '#1A56DB' : '#fff',
                  color: view === v ? '#fff' : '#374151' }}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setShowPanel(true)}
            style={{ height: 34, padding: '0 16px', background: '#1A56DB', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus style={{ width: 15, height: 15 }} />Registrar tiempo
          </button>
        </div>

        {/* Calendar view */}
        {view === 'Semana' && <WeekGrid monday={weekStart(cursor)} today={today} />}
        {view === 'Día'    && <DayGrid day={cursor} today={today} />}
        {view === 'Mes'    && <MonthGrid month={cursor.getMonth()} year={cursor.getFullYear()} today={today} />}
      </div>

      {showPanel && <Panel onClose={() => setShowPanel(false)} addRegistro={addRegistro} storeProyectos={storeProyectos} />}
    </div>
  )
}
