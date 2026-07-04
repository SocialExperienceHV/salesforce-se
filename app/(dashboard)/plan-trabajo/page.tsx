'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, Check, Users, CalendarDays, RefreshCw } from 'lucide-react'
import { useStore } from '@/lib/store'

// ─── Constantes ────────────────────────────────────────────────────────────────
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as const
type Dia = typeof DIAS[number]

// "Siguiente semana" solo se usa en el panel de asignación, no en columnas de la matriz
const DIAS_PANEL = [...DIAS, 'Siguiente semana'] as const

const DIA_ORDER: Record<string, number> = { Lunes: 0, Martes: 1, Miércoles: 2, Jueves: 3, Viernes: 4, 'Siguiente semana': 5 }

const ESTADO_S = {
  'En proceso':  { bg: '#DBEAFE', text: '#1D4ED8' },
  'Finalizado':  { bg: '#D1FAE5', text: '#065F46' },
} as const

// ─── Helpers ───────────────────────────────────────────────────────────────────
function todayDia(): Dia | null {
  const d = new Date().getDay() // 0=Dom … 6=Sab
  if (d === 0 || d === 6) return null
  return DIAS[d - 1]
}
function nextDia(dia: Dia): Dia {
  const idx = DIA_ORDER[dia]
  return DIAS[Math.min(idx + 1, 4)]
}
function initiales(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ─── Panel lateral ──────────────────────────────────────────────────────────────
type Asig = {
  key: string
  persona: string
  area: string
  proyectoId: string
  proyectoNombre: string
  clienteNombre: string
  tipo: 'produccion' | 'creatividad'
  dias: Dia[]
  estado: 'En proceso' | 'Finalizado'
}

function DetallePanel({ asig, onClose, onSave, onFinalizar, onReprogramar }: {
  asig: Asig
  onClose: () => void
  onSave: (dias: Dia[]) => void
  onFinalizar: () => void
  onReprogramar: () => void
}) {
  const { personasStore } = useStore()
  const persona = personasStore.find(p => p.nombre === asig.persona)
  const [diasSel, setDiasSel] = useState<Dia[]>(asig.dias)

  useEffect(() => { setDiasSel(asig.dias) }, [asig.key])

  function toggleDia(d: Dia) {
    setDiasSel(prev =>
      prev.includes(d)
        ? prev.filter(x => x !== d)
        : [...prev, d].sort((a, b) => DIA_ORDER[a] - DIA_ORDER[b])
    )
  }

  return (
    <div style={{ width: 360, flexShrink: 0, background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'sticky', top: 0, height: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Detalle del plan</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8' }}>{initiales(asig.persona)}</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{asig.persona}</div>
            <div style={{ fontSize: 13, color: '#6B7280' }}>{persona?.cargo ?? asig.area}</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Proyecto */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Proyecto</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1A56DB', marginTop: 4, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{asig.proyectoNombre}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                Cliente: <span style={{ color: '#1A56DB' }}>{asig.clienteNombre}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Días asignados */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>Días asignados</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DIAS_PANEL.map(d => {
              const sel = diasSel.includes(d as Dia)
              return (
                <button key={d} onClick={() => toggleDia(d as Dia)}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    border: sel ? '2px solid #1A56DB' : '2px solid #E5E7EB',
                    background: sel ? '#EFF6FF' : '#fff',
                    color: sel ? '#1A56DB' : '#6B7280', transition: 'all 0.1s' }}>
                  {d}
                </button>
              )
            })}
          </div>
        </div>

        {/* Estado */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Estado</div>
          <span style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
            background: ESTADO_S[asig.estado].bg, color: ESTADO_S[asig.estado].text }}>
            {asig.estado}
          </span>
        </div>

        <button onClick={() => onSave(diasSel)}
          style={{ width: '100%', height: 38, background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
          Guardar cambio de día
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {asig.estado !== 'Finalizado' && (
          <button onClick={onFinalizar}
            style={{ width: '100%', height: 40, background: '#059669', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Check style={{ width: 15, height: 15 }} />
            Marcar como finalizado
          </button>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, height: 36, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}>
            Cerrar
          </button>
          {asig.estado !== 'Finalizado' && (
            <button onClick={onReprogramar}
              style={{ flex: 1, height: 36, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#6B7280', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <RefreshCw style={{ width: 13, height: 13 }} />
              Reprogramar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tarjeta ───────────────────────────────────────────────────────────────────
function Tarjeta({ nombre, estado, active, onClick }: { nombre: string; estado: 'En proceso' | 'Finalizado'; active: boolean; onClick: () => void }) {
  const s = ESTADO_S[estado]
  const fin = estado === 'Finalizado'
  return (
    <button onClick={onClick}
      style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8,
        border: active ? '2px solid #1A56DB' : fin ? '1px solid #BBF7D0' : '1px solid #E5E7EB',
        background: active ? '#EFF6FF' : fin ? '#F0FDF4' : '#fff',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5,
        boxShadow: active ? '0 0 0 2px #BFDBFE' : 'none', transition: 'all 0.1s',
        opacity: fin ? 0.8 : 1 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: fin ? '#6B7280' : '#111827', lineHeight: 1.3, textDecoration: fin ? 'line-through' : 'none' }}>{nombre}</span>
      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: s.bg, color: s.text, alignSelf: 'flex-start' }}>{estado}</span>
    </button>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function PlanTrabajoPage() {
  const { proyectos, personasStore, planOverrides, updatePlanOverride, currentUser } = useStore()

  const [vista, setVista] = useState<'equipo' | 'misemana'>('equipo')
  const [filtroArea, setFiltroArea] = useState('Todas')
  const [filtroPersona, setFiltroPersona] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [selected, setSelected] = useState<string | null>(null)
  const [semanaOffset, setSemanaOffset] = useState(0)

  // ── Derivar asignaciones desde proyectos ─────────────────────────────────────
  const asignaciones: Asig[] = useMemo(() => {
    const result: Asig[] = []
    proyectos.forEach(p => {
      const diaBase: Dia[] = (p.diaTrafico && DIAS.includes(p.diaTrafico as Dia))
        ? [p.diaTrafico as Dia]
        : []

      function addPersona(nombre: string, tipo: 'produccion' | 'creatividad') {
        const pd = personasStore.find(ps => ps.nombre === nombre)
        const key = `${nombre}__${p.id}`
        const override = planOverrides[key]
        const dias = override?.dias?.filter((d): d is Dia => DIAS.includes(d as Dia)) ?? diaBase
        const estado = override?.estado ?? 'En proceso'
        result.push({
          key, persona: nombre,
          area: pd?.area ?? (tipo === 'produccion' ? 'Producción' : 'Creatividad'),
          proyectoId: p.id, proyectoNombre: p.nombre, clienteNombre: p.cliente,
          tipo, dias, estado,
        })
      }

      ;(p.personasProduccion ?? []).forEach(n => addPersona(n, 'produccion'))
      ;(p.personasCreatividad ?? []).forEach(n => addPersona(n, 'creatividad'))
    })
    return result
  }, [proyectos, personasStore, planOverrides])

  // ── Auto-reprogramación al montar ────────────────────────────────────────────
  useEffect(() => {
    const hoy = todayDia()
    if (!hoy) return
    asignaciones.forEach(a => {
      if (a.estado === 'Finalizado') return
      const pasados = a.dias.filter(d => DIA_ORDER[d] < DIA_ORDER[hoy])
      if (pasados.length === 0) return
      const restantes = a.dias.filter(d => DIA_ORDER[d] >= DIA_ORDER[hoy])
      const reprog = pasados.map(() => nextDia(hoy))
      const merged = [...new Set([...restantes, ...reprog])].sort((a, b) => DIA_ORDER[a] - DIA_ORDER[b]) as Dia[]
      updatePlanOverride(a.key, { dias: merged })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Personas únicas ──────────────────────────────────────────────────────────
  const todasPersonas = useMemo(() => {
    if (vista === 'misemana') return currentUser ? [currentUser.nombre] : []
    const nombres = new Set(asignaciones.map(a => a.persona))
    return [...nombres]
  }, [asignaciones, vista])

  // ── Listas para filtros ──────────────────────────────────────────────────────
  const areas = useMemo(() => {
    const s = new Set(asignaciones.map(a => a.area))
    return ['Todas', ...s]
  }, [asignaciones])

  const personasFiltro = useMemo(() => {
    const s = new Set(asignaciones.map(a => a.persona))
    return ['Todas', ...s]
  }, [asignaciones])

  // ── Personas filtradas ───────────────────────────────────────────────────────
  const personasFiltradas = useMemo(() => {
    let ps = todasPersonas
    if (filtroArea !== 'Todas') {
      const conArea = new Set(asignaciones.filter(a => a.area === filtroArea).map(a => a.persona))
      ps = ps.filter(p => conArea.has(p))
    }
    if (filtroPersona !== 'Todas') ps = ps.filter(p => p === filtroPersona)
    return ps
  }, [todasPersonas, filtroArea, filtroPersona, asignaciones])

  // ── Asignaciones filtradas ───────────────────────────────────────────────────
  // Las finalizadas siempre se muestran (para ver qué hizo la persona en la semana)
  const asigsFiltradas = useMemo(() =>
    asignaciones.filter(a => {
      if (!personasFiltradas.includes(a.persona)) return false
      if (a.estado === 'Finalizado') return true  // siempre visible
      if (filtroEstado === 'Finalizado') return false  // si filtro es solo Finalizado, las "en proceso" no
      return true
    }),
    [asignaciones, personasFiltradas, filtroEstado]
  )

  function asigsPorPersonaDia(persona: string, dia: Dia) {
    return asigsFiltradas.filter(a => a.persona === persona && a.dias.includes(dia))
  }

  const asigSel = selected
    ? asigsFiltradas.find(a => a.key === selected) ?? asignaciones.find(a => a.key === selected) ?? null
    : null

  function handleSaveDias(dias: Dia[]) {
    if (!selected) return
    updatePlanOverride(selected, { dias })
    setSelected(null)
  }
  function handleFinalizar() {
    if (!selected || !asigSel) return
    // Preservar los días actuales para que la tarea siga visible en la matriz
    updatePlanOverride(selected, { dias: asigSel.dias, estado: 'Finalizado' })
    setSelected(null)
  }
  function handleReprogramar() {
    if (!asigSel) return
    const hoy = todayDia()
    const nuevoDia = hoy ? nextDia(hoy) : DIAS[0]
    updatePlanOverride(selected!, { dias: [nuevoDia] })
    setSelected(null)
  }

  // ── Stats rápidas ────────────────────────────────────────────────────────────
  const totalAsigs  = asigsFiltradas.length
  const enProceso   = asigsFiltradas.filter(a => a.estado === 'En proceso').length
  const finalizados = asigsFiltradas.filter(a => a.estado === 'Finalizado').length

  // ── Semana actual (label) ────────────────────────────────────────────────────
  const semanaLabel = (() => {
    const hoy = new Date()
    const lun = new Date(hoy); lun.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) + semanaOffset * 7)
    const vie = new Date(lun); vie.setDate(lun.getDate() + 4)
    const mes = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${lun.getDate()} ${mes[lun.getMonth()]} – ${vie.getDate()} ${mes[vie.getMonth()]} ${vie.getFullYear()}`
  })()

  const sel: React.CSSProperties = {
    height: 34, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 7,
    fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer', minWidth: 110,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center', paddingRight: 28,
    appearance: 'none' as const,
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Título */}
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Plan de trabajo</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
              Organiza la semana de cada persona por día.
            </p>
          </div>

          {/* Controles */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            {/* Semana (cosmético) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 34, border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', padding: '0 4px' }}>
              <button onClick={() => setSemanaOffset(o => o - 1)} style={{ width: 26, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', borderRadius: 6 }}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
                <CalendarDays style={{ width: 13, height: 13, color: '#6B7280' }} />
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{semanaLabel}</span>
              </div>
              <button onClick={() => setSemanaOffset(o => o + 1)} style={{ width: 26, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', borderRadius: 6 }}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Área</span>
              <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} style={sel}>
                {areas.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Persona</span>
              <select value={filtroPersona} onChange={e => setFiltroPersona(e.target.value)} style={sel}>
                {personasFiltro.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Estado</span>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={sel}>
                {['Todos', 'En proceso', 'Finalizado'].map(e => <option key={e}>{e}</option>)}
              </select>
            </div>

            {/* Vista */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {([['equipo', 'Equipo', Users], ['misemana', 'Mi semana', CalendarDays]] as const).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setVista(key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                    background: vista === key ? '#1A56DB' : '#fff', color: vista === key ? '#fff' : '#374151',
                    boxShadow: vista === key ? 'none' : '0 0 0 1px #E5E7EB inset', transition: 'all 0.15s' }}>
                  <Icon style={{ width: 14, height: 14 }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Asignaciones', value: totalAsigs, color: '#1A56DB', bg: '#EFF6FF' },
              { label: 'En proceso', value: enProceso, color: '#B45309', bg: '#FFFBEB' },
              { label: 'Finalizadas', value: finalizados, color: '#065F46', bg: '#F0FDF4' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ padding: '8px 16px', background: bg, borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
                <span style={{ fontSize: 12, color, fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Matriz */}
          {personasFiltradas.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '48px 20px', textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>
              No hay personas con proyectos asignados. Asigna personas desde el módulo <strong>Tráfico</strong>.
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', width: 180, minWidth: 180, borderRight: '1px solid #F3F4F6' }}>Persona</th>
                      {DIAS.map(d => {
                        const esHoy = semanaOffset === 0 && d === todayDia()
                        return (
                          <th key={d} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: esHoy ? '#1A56DB' : '#6B7280', textAlign: 'left', background: esHoy ? '#EFF6FF' : undefined, minWidth: 160 }}>
                            {d}
                            {esHoy && <span style={{ display: 'block', fontSize: 10, fontWeight: 500, color: '#93C5FD', marginTop: 1 }}>Hoy</span>}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {personasFiltradas.map((nombre, idx) => {
                      const pd = personasStore.find(p => p.nombre === nombre)
                      const isLast = idx === personasFiltradas.length - 1
                      return (
                        <tr key={nombre} style={{ borderBottom: isLast ? 'none' : '1px solid #F3F4F6' }}>
                          <td style={{ padding: '12px 16px', verticalAlign: 'top', borderRight: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8' }}>{initiales(nombre)}</span>
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{nombre}</div>
                                <div style={{ fontSize: 11, color: '#6B7280' }}>{pd?.cargo ?? pd?.area ?? '—'}</div>
                              </div>
                            </div>
                          </td>
                          {DIAS.map(dia => {
                            const cards = asigsPorPersonaDia(nombre, dia)
                            const esHoy = semanaOffset === 0 && dia === todayDia()
                            return (
                              <td key={dia} style={{ padding: '10px 12px', verticalAlign: 'top', background: esHoy ? '#F9FBFF' : undefined }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {cards.map(a => (
                                    <Tarjeta
                                      key={a.key}
                                      nombre={a.proyectoNombre}
                                      estado={a.estado}
                                      active={a.key === selected}
                                      onClick={() => setSelected(a.key === selected ? null : a.key)}
                                    />
                                  ))}
                                  {cards.length === 0 && (
                                    <div style={{ height: 32, border: '1px dashed #E5E7EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <span style={{ fontSize: 11, color: '#D1D5DB' }}>—</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Panel lateral ──────────────────────────────────────────────────────── */}
      {asigSel && (
        <DetallePanel
          asig={asigSel}
          onClose={() => setSelected(null)}
          onSave={handleSaveDias}
          onFinalizar={handleFinalizar}
          onReprogramar={handleReprogramar}
        />
      )}
    </div>
  )
}
