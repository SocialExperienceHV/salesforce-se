'use client'

import { useStore } from '@/lib/store'
import { useMemo, useState } from 'react'
import { Search, FileText, CheckCircle, Clock, Edit3, PlusCircle } from 'lucide-react'

const ACCION_ICON: Record<string, React.ReactNode> = {
  'Creada':             <PlusCircle  style={{ width: 13, height: 13, color: '#059669' }} />,
  'Enviada a revisión': <Clock       style={{ width: 13, height: 13, color: '#D97706' }} />,
  'Aprobada':           <CheckCircle style={{ width: 13, height: 13, color: '#1D4ED8' }} />,
  'Editada':            <Edit3       style={{ width: 13, height: 13, color: '#7C3AED' }} />,
}

const ACCION_COLOR: Record<string, { bg: string; color: string }> = {
  'Creada':             { bg: '#F0FDF4', color: '#15803D' },
  'Enviada a revisión': { bg: '#FFF7ED', color: '#C2410C' },
  'Aprobada':           { bg: '#EFF6FF', color: '#1D4ED8' },
  'Editada':            { bg: '#F5F3FF', color: '#7C3AED' },
}

export default function Administracion() {
  const { legalizaciones } = useStore()
  const [busqueda, setBusqueda] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('Todas')

  // Aplanar todos los historial de todas las legalizaciones
  const eventos = useMemo(() => {
    const lista = legalizaciones.flatMap(l =>
      (l.historial ?? []).map(h => ({
        fecha: h.fecha,
        usuario: h.usuario,
        accion: h.accion,
        observacion: h.observacion,
        codigo: l.codigo,
        responsable: l.responsable,
        tipoLeg: l.tipoLegalizacion,
        legId: l.id,
      }))
    )
    // Más reciente primero
    return lista.sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [legalizaciones])

  const acciones = useMemo(() => {
    const set = new Set(eventos.map(e => e.accion))
    return ['Todas', ...Array.from(set)]
  }, [eventos])

  const filtrados = useMemo(() => eventos.filter(e => {
    if (filtroAccion !== 'Todas' && e.accion !== filtroAccion) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return e.usuario.toLowerCase().includes(q) ||
        e.codigo?.toLowerCase().includes(q) ||
        e.responsable.toLowerCase().includes(q) ||
        e.accion.toLowerCase().includes(q)
    }
    return true
  }), [eventos, filtroAccion, busqueda])

  const sel: React.CSSProperties = {
    height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 8,
    fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer',
  }
  const th: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#6B7280',
    textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB',
    background: '#F9FAFB', textTransform: 'uppercase', letterSpacing: '0.04em',
  }
  const td: React.CSSProperties = {
    padding: '11px 14px', fontSize: 13, color: '#374151', borderBottom: '1px solid #F3F4F6',
    verticalAlign: 'middle',
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
          Administración
        </h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>
          Historial y auditoría de acciones sobre legalizaciones.
        </p>
      </div>

      {/* KPI rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total eventos', value: eventos.length, color: '#F9FAFB', border: '#E5E7EB', textColor: '#111827' },
          { label: 'Creadas', value: eventos.filter(e => e.accion === 'Creada').length, color: '#F0FDF4', border: '#BBF7D0', textColor: '#15803D' },
          { label: 'Enviadas a revisión', value: eventos.filter(e => e.accion === 'Enviada a revisión').length, color: '#FFF7ED', border: '#FDE68A', textColor: '#C2410C' },
          { label: 'Aprobadas', value: eventos.filter(e => e.accion === 'Aprobada').length, color: '#EFF6FF', border: '#BFDBFE', textColor: '#1D4ED8' },
        ].map(k => (
          <div key={k.label} style={{ background: k.color, border: `1px solid ${k.border}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.textColor }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px', flex: 1, maxWidth: 320 }}>
          <Search style={{ width: 14, height: 14, color: '#9CA3AF', flexShrink: 0 }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por usuario, código, responsable..."
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#374151', width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>Acción:</span>
          <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)} style={sel}>
            {acciones.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' }}>
          {filtrados.length} evento{filtrados.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabla */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Fecha</th>
              <th style={th}>Código</th>
              <th style={th}>Responsable</th>
              <th style={th}>Tipo</th>
              <th style={th}>Acción</th>
              <th style={th}>Realizado por</th>
              <th style={th}>Observación</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: 'center', color: '#9CA3AF', padding: '48px' }}>
                  No hay eventos registrados.
                </td>
              </tr>
            ) : filtrados.map((e, i) => {
              const colores = ACCION_COLOR[e.accion] ?? { bg: '#F3F4F6', color: '#374151' }
              return (
                <tr key={i}
                  onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = '#FAFAFA'}
                  onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <td style={{ ...td, whiteSpace: 'nowrap', color: '#6B7280', fontSize: 12 }}>
                    {e.fecha}
                  </td>
                  <td style={td}>
                    {e.codigo ? (
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '2px 7px', borderRadius: 5, border: '1px solid #BFDBFE' }}>
                        {e.codigo}
                      </span>
                    ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                  </td>
                  <td style={{ ...td, fontWeight: 500 }}>{e.responsable}</td>
                  <td style={td}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      {e.tipoLeg === 'Legalización de anticipo' ? 'Anticipo' : 'Reembolso'}
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: colores.bg, color: colores.color }}>
                      {ACCION_ICON[e.accion] ?? <FileText style={{ width: 12, height: 12 }} />}
                      {e.accion}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#6B7280' }}>{e.usuario}</td>
                  <td style={{ ...td, color: '#9CA3AF', fontSize: 12 }}>
                    {e.observacion ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
