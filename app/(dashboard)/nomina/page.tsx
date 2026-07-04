'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Download, Clock, TrendingUp, Users, DollarSign } from 'lucide-react'
import { useStore } from '@/lib/store'

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const HORAS_MES = 176

function fmt(n: number) { return `$ ${Math.round(n).toLocaleString('es-CO')}` }
function fmtK(n: number) {
  if (n >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
  return fmt(n)
}

function horasDiff(ini: string, fin: string) {
  const [sh, sm] = ini.split(':').map(Number)
  const [eh, em] = fin.split(':').map(Number)
  return Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60, 0)
}

export default function NominaPage() {
  const { registros, personasStore } = useStore()

  const today = new Date()
  const [mes, setMes] = useState(today.getMonth())
  const [anio, setAnio] = useState(today.getFullYear())

  function navMes(dir: 1 | -1) {
    let m = mes + dir
    let y = anio
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMes(m); setAnio(y)
  }

  const mesISO = `${anio}-${String(mes + 1).padStart(2, '0')}`

  // Registros del mes seleccionado
  const registrosMes = useMemo(
    () => registros.filter(r => r.fecha.startsWith(mesISO)),
    [registros, mesISO]
  )

  // Horas totales por persona en el mes
  const horasPorPersona = useMemo(() => {
    const map: Record<string, number> = {}
    registrosMes.forEach(r => {
      map[r.persona] = (map[r.persona] ?? 0) + horasDiff(r.horaInicio, r.horaFin)
    })
    return map
  }, [registrosMes])

  // Desglose persona → proyecto → horas (para la tabla de detalle y el reporte)
  const desglose = useMemo(() => {
    const map: Record<string, Record<string, { horas: number; proyectoId: string }>> = {}
    registrosMes.forEach(r => {
      if (!map[r.persona]) map[r.persona] = {}
      if (!map[r.persona][r.proyecto]) map[r.persona][r.proyecto] = { horas: 0, proyectoId: r.proyectoId }
      map[r.persona][r.proyecto].horas += horasDiff(r.horaInicio, r.horaFin)
    })
    return map
  }, [registrosMes])

  // Filas de la tabla principal
  const filas = useMemo(() => personasStore.map(p => {
    const horas = horasPorPersona[p.nombre] ?? 0
    const ocupacion = HORAS_MES > 0 ? (horas / HORAS_MES) * 100 : 0
    // costoHora dinámico: costoMensual / horasReales (o 0 si no hay horas)
    const costoHora = horas > 0 ? p.costoMensual / horas : 0
    const costoImputado = p.costoMensual // siempre se paga el total
    return { ...p, horas, ocupacion, costoHora, costoImputado }
  }), [personasStore, horasPorPersona])

  // KPIs
  const totalNomina = personasStore.reduce((s, p) => s + p.costoMensual, 0)
  const totalHoras = filas.reduce((s, f) => s + f.horas, 0)
  const personasActivas = filas.filter(f => f.horas > 0).length
  const ocupacionPromedio = (totalHoras / (personasStore.length * HORAS_MES)) * 100

  // ── Descarga CSV ─────────────────────────────────────────────────────────────
  function descargarCSV() {
    const rows: string[] = [
      'Persona;Área;Cargo;Proyecto;Horas;Costo hora (dinámico);Costo imputado al proyecto'
    ]

    personasStore.forEach(p => {
      const horasTotales = horasPorPersona[p.nombre] ?? 0
      const costoHora = horasTotales > 0 ? p.costoMensual / horasTotales : 0
      const proyectos = desglose[p.nombre] ?? {}

      if (Object.keys(proyectos).length === 0) {
        rows.push(`${p.nombre};${p.area};${p.cargo};Sin registros;0;${Math.round(costoHora)};0`)
      } else {
        Object.entries(proyectos).forEach(([proyecto, { horas }]) => {
          const costoProyecto = costoHora * horas
          rows.push(`${p.nombre};${p.area};${p.cargo};${proyecto};${horas.toFixed(2)};${Math.round(costoHora)};${Math.round(costoProyecto)}`)
        })
      }
    })

    // Totales
    rows.push('')
    rows.push(`TOTAL NÓMINA MES;;;; ;; ${Math.round(totalNomina)}`)

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nomina_${mesISO}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Nómina</h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
            Horas trabajadas y costo real de nómina por persona y proyecto cada mes.
          </p>
        </div>
        <button onClick={descargarCSV}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px', background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
          <Download style={{ width: 15, height: 15 }} />
          Descargar reporte
        </button>
      </div>

      {/* Selector de mes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <button onClick={() => navMes(-1)} style={{ width: 34, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRight: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', color: '#6B7280' }}>
          <ChevronLeft style={{ width: 15, height: 15 }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', padding: '0 18px', whiteSpace: 'nowrap' }}>
          {MESES_ES[mes]} {anio}
        </span>
        <button onClick={() => navMes(1)} style={{ width: 34, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderLeft: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', color: '#6B7280' }}>
          <ChevronRight style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Total nómina del mes', value: fmtK(totalNomina), Icon: DollarSign, bg: '#F5F3FF', ic: '#7C3AED' },
          { label: 'Total horas registradas', value: `${totalHoras.toFixed(1)} h`, Icon: Clock, bg: '#EFF6FF', ic: '#1A56DB' },
          { label: 'Personas con registros', value: `${personasActivas} / ${personasStore.length}`, Icon: Users, bg: '#F0FDF4', ic: '#16A34A' },
          { label: 'Ocupación promedio equipo', value: `${ocupacionPromedio.toFixed(1).replace('.', ',')} %`, Icon: TrendingUp, bg: '#FFFBEB', ic: '#D97706' },
        ].map(({ label, value, Icon, bg, ic }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ width: 19, height: 19, color: ic }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Persona', 'Área', 'Cargo', 'Costo mensual nómina', 'Horas registradas', '% Ocupación', 'Costo/hora real', 'Proyectos del mes'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => {
                const isLast = i === filas.length - 1
                const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#374151', borderBottom: isLast ? 'none' : '1px solid #F3F4F6', verticalAlign: 'middle' }
                const proyectosPersona = Object.keys(desglose[f.nombre] ?? {})
                const ocupPct = Math.min(f.ocupacion, 100)
                const ocupColor = ocupPct >= 80 ? '#16A34A' : ocupPct >= 40 ? '#D97706' : '#DC2626'

                return (
                  <tr key={f.id}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    style={{ background: '#fff', transition: 'background 0.1s' }}>
                    {/* Persona */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8' }}>
                            {f.nombre.split(' ').slice(0, 2).map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span style={{ fontWeight: 500, color: '#111827' }}>{f.nombre}</span>
                      </div>
                    </td>
                    <td style={td}>{f.area}</td>
                    <td style={{ ...td, color: '#6B7280' }}>{f.cargo}</td>
                    {/* Costo nómina */}
                    <td style={{ ...td, fontWeight: 600 }}>{fmt(f.costoMensual)}</td>
                    {/* Horas registradas */}
                    <td style={td}>
                      <span style={{ fontWeight: 600, color: f.horas > 0 ? '#111827' : '#9CA3AF' }}>
                        {f.horas > 0 ? `${f.horas.toFixed(1)} h` : '—'}
                      </span>
                    </td>
                    {/* % Ocupación */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, minWidth: 60, maxWidth: 80, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${ocupPct}%`, background: ocupColor, borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ocupColor, minWidth: 36 }}>
                          {f.horas > 0 ? `${f.ocupacion.toFixed(0)}%` : '0%'}
                        </span>
                      </div>
                    </td>
                    {/* Costo/hora real */}
                    <td style={td}>
                      {f.horas > 0
                        ? <span style={{ fontWeight: 600, color: '#7C3AED' }}>{fmt(f.costoHora)}/h</span>
                        : <span style={{ color: '#D1D5DB', fontSize: 12, fontStyle: 'italic' }}>Sin registros</span>}
                    </td>
                    {/* Proyectos */}
                    <td style={td}>
                      {proyectosPersona.length === 0
                        ? <span style={{ color: '#D1D5DB', fontSize: 12, fontStyle: 'italic' }}>—</span>
                        : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {proyectosPersona.map(proy => (
                              <span key={proy} style={{ fontSize: 11, padding: '2px 8px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap' }}>
                                {proy}
                              </span>
                            ))}
                          </div>
                        )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
