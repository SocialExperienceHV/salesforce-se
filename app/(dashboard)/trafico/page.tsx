'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Calendar, Users, AlertTriangle, ArrowRight, Search, Download, X, ChevronUp, ChevronDown, ChevronsUpDown, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { Proyecto } from '@/lib/store'

// ─── Constantes ────────────────────────────────────────────────────────────────
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Siguiente semana']
const DIAS_FILTRO = ['Todos', ...DIAS_SEMANA]
const DIA_ORDER: Record<string, number> = {
  'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3, 'Viernes': 4, 'Siguiente semana': 5,
}
const DIA_DOT: Record<string, string> = {
  'Lunes': '#3B82F6', 'Martes': '#10B981', 'Miércoles': '#8B5CF6',
  'Jueves': '#F97316', 'Viernes': '#EC4899', 'Siguiente semana': '#9CA3AF',
}
const ESTADO_S: Record<string, { bg: string; text: string }> = {
  'En curso':    { bg: '#DBEAFE', text: '#1D4ED8' },
  'Finalizado':  { bg: '#D1FAE5', text: '#065F46' },
}

const AREAS_CREATIVAS = ['Creatividad', 'Diseño gráfico', 'Diseño industrial', 'Audiovisual', 'Copy']

// ─── Helpers ───────────────────────────────────────────────────────────────────
function clienteColor(nombre: string): string {
  const colors = ['#e53935','#7C3AED','#F59E0B','#F97316','#FBBF24','#DC2626','#0EA5E9','#1D4ED8','#16A34A']
  let h = 0; for (let i = 0; i < nombre.length; i++) h = nombre.charCodeAt(i) + ((h << 5) - h)
  return colors[Math.abs(h) % colors.length]
}
function initiales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ─── MultiSelect personas ───────────────────────────────────────────────────────
function PersonaMultiSelect({ personas, selected, onChange, placeholder }: {
  personas: string[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(p: string) {
    onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p])
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ minWidth: 120, maxWidth: 180, height: 30, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 12, color: selected.length ? '#111827' : '#9CA3AF', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'space-between' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0].split(' ')[0] : `${selected.length} personas`}
        </span>
        <ChevronDown style={{ width: 11, height: 11, flexShrink: 0, color: '#9CA3AF' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 34, left: 0, zIndex: 100, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 180, maxHeight: 220, overflowY: 'auto' }}>
          {personas.length === 0
            ? <div style={{ padding: '12px 14px', fontSize: 12, color: '#9CA3AF' }}>Sin personas en esta área</div>
            : personas.map(p => (
              <button key={p} onClick={() => toggle(p)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#374151', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <div style={{ width: 16, height: 16, border: `2px solid ${selected.includes(p) ? '#1A56DB' : '#D1D5DB'}`, borderRadius: 4, background: selected.includes(p) ? '#1A56DB' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selected.includes(p) && <Check style={{ width: 10, height: 10, color: '#fff' }} />}
                </div>
                {p}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

// ─── Selector de día inline ─────────────────────────────────────────────────────
function DiaSelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const dot = value ? DIA_DOT[value] : '#D1D5DB'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', border: '1px solid transparent', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: value ? '#374151' : '#9CA3AF' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = 'transparent' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        {value ?? 'Sin día'}
        <ChevronDown style={{ width: 10, height: 10, color: '#9CA3AF' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 32, left: 0, zIndex: 100, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 160 }}>
          {DIAS_SEMANA.map(d => (
            <button key={d} onClick={() => { onChange(d); setOpen(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: d === value ? '#EFF6FF' : 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: d === value ? '#1A56DB' : '#374151', textAlign: 'left', fontWeight: d === value ? 600 : 400 }}
              onMouseEnter={e => { if (d !== value) e.currentTarget.style.background = '#F9FAFB' }}
              onMouseLeave={e => { if (d !== value) e.currentTarget.style.background = 'none' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: DIA_DOT[d], flexShrink: 0 }} />
              {d}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Selector de estado inline ──────────────────────────────────────────────────
function EstadoSelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const s = value ? ESTADO_S[value] : null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
          background: s?.bg ?? '#F3F4F6', color: s?.text ?? '#9CA3AF' }}>
        {value ?? 'Sin estado'}
        <ChevronDown style={{ width: 10, height: 10 }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 30, left: 0, zIndex: 100, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: 140 }}>
          {['En curso', 'Finalizado'].map(opt => {
            const os = ESTADO_S[opt]
            return (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false) }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: os.bg, color: os.text }}>{opt}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Celda de acción editable ───────────────────────────────────────────────────
function AccionCell({ value, onChange, placeholder }: { value?: string; onChange: (v: string) => void; placeholder: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  function commit() {
    onChange(draft)
    setEditing(false)
  }

  if (editing) return (
    <div style={{ position: 'relative' }}>
      <textarea ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() } if (e.key === 'Escape') setEditing(false) }}
        rows={2} style={{ width: 160, fontSize: 12, padding: '4px 6px', border: '1px solid #1A56DB', borderRadius: 6, resize: 'none', outline: 'none', fontFamily: 'inherit', lineHeight: 1.4 }} />
    </div>
  )

  return (
    <button onClick={() => { setDraft(value ?? ''); setEditing(true) }}
      style={{ background: 'none', border: '1px dashed transparent', borderRadius: 6, cursor: 'pointer', padding: '3px 4px', fontSize: 12, color: value ? '#374151' : '#D1D5DB', textAlign: 'left', lineHeight: 1.4, maxWidth: 170, display: 'block' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#D1D5DB')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}>
      {value || placeholder}
    </button>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function TraficoPage() {
  const { proyectos, clientes: clientesStore, updateProyecto, personasStore } = useStore()

  const [diaActivo, setDiaActivo] = useState('Todos')
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // Personas por categoría
  const personasProduccion = useMemo(
    () => personasStore.filter(p => p.area === 'Producción').map(p => p.nombre),
    [personasStore]
  )
  const personasCreatividad = useMemo(
    () => personasStore.filter(p => AREAS_CREATIVAS.includes(p.area)).map(p => p.nombre),
    [personasStore]
  )

  // Filtrar
  const filtered = useMemo(() => proyectos.filter(p => {
    const matchDia = diaActivo === 'Todos'
      || (diaActivo === 'Siguiente semana' ? p.diaTrafico === 'Siguiente semana' : p.diaTrafico === diaActivo)
    const matchSearch = !search
      || p.nombre.toLowerCase().includes(search.toLowerCase())
      || p.cliente.toLowerCase().includes(search.toLowerCase())
    return matchDia && matchSearch
  }), [proyectos, diaActivo, search])

  // Ordenar
  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'dia') {
        cmp = (DIA_ORDER[a.diaTrafico ?? ''] ?? 99) - (DIA_ORDER[b.diaTrafico ?? ''] ?? 99)
      } else if (sortCol === 'cliente') {
        cmp = a.cliente.localeCompare(b.cliente, 'es')
      } else if (sortCol === 'proyecto') {
        cmp = a.nombre.localeCompare(b.nombre, 'es')
      } else if (sortCol === 'fechaPres') {
        cmp = (a.fechaPresentacion ?? '').localeCompare(b.fechaPresentacion ?? '', 'es')
      } else if (sortCol === 'fechaEjec') {
        cmp = (a.fechaEntrega ?? '').localeCompare(b.fechaEntrega ?? '', 'es')
      } else if (sortCol === 'estado') {
        cmp = (a.estadoTrafico ?? '').localeCompare(b.estadoTrafico ?? '', 'es')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir])

  // KPIs
  const totalSemana   = proyectos.filter(p => p.diaTrafico && p.diaTrafico !== 'Siguiente semana').length
  const sinDia        = proyectos.filter(p => !p.diaTrafico).length
  const enCurso       = proyectos.filter(p => p.estadoTrafico === 'En curso').length
  const sigSemana     = proyectos.filter(p => p.diaTrafico === 'Siguiente semana').length

  const td = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '11px 12px', fontSize: 13, color: '#374151',
    verticalAlign: 'middle', borderBottom: '1px solid #F3F4F6', ...extra
  })

  const SortTh = ({ label, col, width }: { label: string; col?: string; width?: number }) => (
    <th onClick={() => col && toggleSort(col)}
      style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#6B7280', textAlign: 'left',
        whiteSpace: col ? 'nowrap' : 'normal', width, cursor: col ? 'pointer' : 'default',
        userSelect: 'none', lineHeight: 1.3 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label}
        {col && (sortCol === col
          ? sortDir === 'asc'
            ? <ChevronUp style={{ width: 11, height: 11, color: '#1A56DB' }} />
            : <ChevronDown style={{ width: 11, height: 11, color: '#1A56DB' }} />
          : <ChevronsUpDown style={{ width: 11, height: 11, color: '#D1D5DB' }} />)}
      </span>
    </th>
  )

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Tráfico de la agencia</h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
            Programa los proyectos de la semana y asigna equipos de producción y creatividad.
          </p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
          <Download style={{ width: 15, height: 15 }} />
          Exportar tráfico
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Proyectos esta semana',    value: totalSemana, Icon: Calendar,      bg: '#EFF6FF', ic: '#1A56DB' },
          { label: 'Sin día asignado',         value: sinDia,      Icon: AlertTriangle, bg: '#FEF2F2', ic: '#DC2626' },
          { label: 'En curso',                 value: enCurso,     Icon: Users,         bg: '#F0FDF4', ic: '#16A34A' },
          { label: 'Siguiente semana',         value: sigSemana,   Icon: ArrowRight,    bg: '#F5F3FF', ic: '#7C3AED' },
        ].map(({ label, value, Icon, bg, ic }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ width: 18, height: 18, color: ic }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Tabs días */}
        <div style={{ display: 'flex', gap: 4 }}>
          {DIAS_FILTRO.map(d => (
            <button key={d} onClick={() => setDiaActivo(d)}
              style={{ height: 34, padding: '0 14px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                background: diaActivo === d ? '#1A56DB' : '#fff', color: diaActivo === d ? '#fff' : '#374151',
                boxShadow: diaActivo === d ? 'none' : '0 0 0 1px #E5E7EB inset' }}>
              {d}
            </button>
          ))}
        </div>
        {/* Búsqueda */}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
          <input placeholder="Buscar proyecto o cliente..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ height: 34, paddingLeft: 30, paddingRight: 10, width: 220, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', outline: 'none' }} />
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <SortTh label="Día"         col="dia"       width={130} />
                <SortTh label="Cliente"     col="cliente"   width={140} />
                <SortTh label="Proyecto"    col="proyecto"            />
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#6B7280', width: 80, lineHeight: 1.3 }}>Fecha de<br/>presentación</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#6B7280', width: 80, lineHeight: 1.3 }}>Fecha de<br/>ejecución</th>
                <SortTh label="Estado"      col="estado"    width={120} />
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#6B7280', width: 160 }}>Producción</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#6B7280', width: 160 }}>Creatividad</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#6B7280', width: 180 }}>Acción Producción</th>
                <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#6B7280', width: 180 }}>Acción Creatividad</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>
                    No hay proyectos con los filtros seleccionados.
                  </td>
                </tr>
              ) : sorted.map(p => {
                const color = clientesStore.find(c => c.nombre === p.cliente)?.color ?? clienteColor(p.cliente)
                const logo  = clientesStore.find(c => c.nombre === p.cliente)?.logo
                const es    = p.estadoTrafico ? ESTADO_S[p.estadoTrafico] : null

                return (
                  <tr key={p.id}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    style={{ background: '#fff', transition: 'background 0.1s' }}>

                    {/* Día — editable */}
                    <td style={td()}>
                      <DiaSelect value={p.diaTrafico} onChange={v => updateProyecto(p.id, { diaTrafico: v })} />
                    </td>

                    {/* Cliente */}
                    <td style={td()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {logo ? (
                          <img src={logo} alt={p.cliente} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain', border: '1px solid #E5E7EB' }} />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>{initiales(p.cliente)}</span>
                          </div>
                        )}
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{p.cliente}</span>
                      </div>
                    </td>

                    {/* Proyecto */}
                    <td style={td({ maxWidth: 220 })}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', lineHeight: 1.3 }}>{p.nombre}</span>
                    </td>

                    {/* Fechas */}
                    <td style={td({ color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' })}>{p.fechaPresentacion || '—'}</td>
                    <td style={td({ color: '#6B7280', fontSize: 12, whiteSpace: 'nowrap' })}>{p.fechaEntrega || '—'}</td>

                    {/* Estado — editable */}
                    <td style={td()}>
                      <EstadoSelect value={p.estadoTrafico} onChange={v => updateProyecto(p.id, { estadoTrafico: v })} />
                    </td>

                    {/* Producción */}
                    <td style={td()}>
                      <PersonaMultiSelect
                        personas={personasProduccion}
                        selected={p.personasProduccion ?? []}
                        onChange={v => updateProyecto(p.id, { personasProduccion: v })}
                        placeholder="Asignar..."
                      />
                      {(p.personasProduccion?.length ?? 0) > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                          {p.personasProduccion!.map(nombre => (
                            <span key={nombre} style={{ fontSize: 10, padding: '1px 6px', background: '#FEF3C7', color: '#92400E', borderRadius: 20, fontWeight: 500 }}>
                              {nombre.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Creatividad */}
                    <td style={td()}>
                      <PersonaMultiSelect
                        personas={personasCreatividad}
                        selected={p.personasCreatividad ?? []}
                        onChange={v => updateProyecto(p.id, { personasCreatividad: v })}
                        placeholder="Asignar..."
                      />
                      {(p.personasCreatividad?.length ?? 0) > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                          {p.personasCreatividad!.map(nombre => (
                            <span key={nombre} style={{ fontSize: 10, padding: '1px 6px', background: '#EDE9FE', color: '#6D28D9', borderRadius: 20, fontWeight: 500 }}>
                              {nombre.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Acción Producción */}
                    <td style={td()}>
                      <AccionCell
                        value={p.accionProduccion}
                        onChange={v => updateProyecto(p.id, { accionProduccion: v })}
                        placeholder="Escribir acción..."
                      />
                    </td>

                    {/* Acción Creatividad */}
                    <td style={td()}>
                      <AccionCell
                        value={p.accionCreatividad}
                        onChange={v => updateProyecto(p.id, { accionCreatividad: v })}
                        placeholder="Escribir acción..."
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Mostrando {sorted.length} de {proyectos.length} proyectos</span>
        </div>
      </div>
    </div>
  )
}
