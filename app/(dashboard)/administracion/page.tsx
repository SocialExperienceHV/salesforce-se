'use client'

import { useStore } from '@/lib/store'
import { useMemo, useState } from 'react'
import { Search, FileText, CheckCircle, Clock, Edit3, PlusCircle, CreditCard, X, Trash2 } from 'lucide-react'

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
  const { legalizaciones, tarjetasCorp, addTarjetaCorp, updateTarjetaCorp } = useStore()
  const [tab, setTab] = useState<'auditoria' | 'tarjetas'>('auditoria')

  // ── Auditoría ──────────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('')
  const [filtroAccion, setFiltroAccion] = useState('Todas')

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

  // ── Tarjetas Corporativas ──────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [ultimos4, setUltimos4] = useState('')
  const [nombre, setNombre] = useState('')
  const [errDigits, setErrDigits] = useState('')

  function handleAddTarjeta() {
    if (!/^\d{4}$/.test(ultimos4)) { setErrDigits('Ingresa exactamente 4 dígitos'); return }
    if (tarjetasCorp.some(t => t.ultimos4 === ultimos4)) { setErrDigits('Ya existe una tarjeta con ese número'); return }
    addTarjetaCorp({ ultimos4, nombre: nombre.trim() || undefined, activa: true })
    setShowModal(false)
    setUltimos4(''); setNombre(''); setErrDigits('')
  }

  // ── Estilos compartidos ────────────────────────────────────────────────────
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
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>Administración</h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>
          Configuración general y auditoría de la plataforma.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #E5E7EB' }}>
        {[
          { key: 'auditoria', label: 'Auditoría' },
          { key: 'tarjetas',  label: 'Tarjetas Corporativas' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            style={{
              padding: '8px 18px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: 'transparent', borderBottom: tab === t.key ? '2px solid #111827' : '2px solid transparent',
              color: tab === t.key ? '#111827' : '#6B7280', marginBottom: -2,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB AUDITORÍA ── */}
      {tab === 'auditoria' && (
        <>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 12px', flex: 1, maxWidth: 320 }}>
              <Search style={{ width: 14, height: 14, color: '#9CA3AF', flexShrink: 0 }} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por usuario, código, responsable..."
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: '#374151', width: '100%' }} />
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
                  <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#9CA3AF', padding: '48px' }}>No hay eventos registrados.</td></tr>
                ) : filtrados.map((e, i) => {
                  const colores = ACCION_COLOR[e.accion] ?? { bg: '#F3F4F6', color: '#374151' }
                  return (
                    <tr key={i}
                      onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.background = '#FAFAFA'}
                      onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: '#6B7280', fontSize: 12 }}>{e.fecha}</td>
                      <td style={td}>
                        {e.codigo ? (
                          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '2px 7px', borderRadius: 5, border: '1px solid #BFDBFE' }}>{e.codigo}</span>
                        ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                      <td style={{ ...td, fontWeight: 500 }}>{e.responsable}</td>
                      <td style={td}><span style={{ fontSize: 11, color: '#6B7280' }}>{e.tipoLeg === 'Legalización de anticipo' ? 'Anticipo' : 'Reembolso'}</span></td>
                      <td style={td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: colores.bg, color: colores.color }}>
                          {ACCION_ICON[e.accion] ?? <FileText style={{ width: 12, height: 12 }} />}
                          {e.accion}
                        </span>
                      </td>
                      <td style={{ ...td, color: '#6B7280' }}>{e.usuario}</td>
                      <td style={{ ...td, color: '#9CA3AF', fontSize: 12 }}>{e.observacion ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB TARJETAS CORPORATIVAS ── */}
      {tab === 'tarjetas' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                Registra los últimos 4 dígitos de cada tarjeta corporativa para usarlas en el módulo de Tarjeta Crédito.
              </p>
            </div>
            <button onClick={() => setShowModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, height: 36, padding: '0 16px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <PlusCircle style={{ width: 15, height: 15 }} />
              Agregar tarjeta
            </button>
          </div>

          {tarjetasCorp.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CreditCard style={{ width: 28, height: 28, color: '#D97706' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>No hay tarjetas registradas</p>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: '6px 0 0' }}>Agrega las tarjetas corporativas para empezar a registrar gastos.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {tarjetasCorp.map(t => (
                <div key={t.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: t.activa ? '#111827' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CreditCard style={{ width: 22, height: 22, color: t.activa ? '#fff' : '#9CA3AF' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: 2 }}>•••• •••• •••• {t.ultimos4}</div>
                      {t.nombre && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{t.nombre}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                      background: t.activa ? '#F0FDF4' : '#F3F4F6',
                      color: t.activa ? '#15803D' : '#6B7280',
                    }}>
                      {t.activa ? 'Activa' : 'Inactiva'}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => updateTarjetaCorp(t.id, { activa: !t.activa })}
                        style={{ fontSize: 11, padding: '4px 10px', border: '1px solid #E5E7EB', borderRadius: 6, background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
                        {t.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal nueva tarjeta */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Nueva Tarjeta Corporativa</h3>
              <button onClick={() => { setShowModal(false); setUltimos4(''); setNombre(''); setErrDigits('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Últimos 4 dígitos *</label>
                <input
                  value={ultimos4}
                  onChange={e => { setUltimos4(e.target.value.replace(/\D/g, '').slice(0, 4)); setErrDigits('') }}
                  placeholder="1234"
                  maxLength={4}
                  style={{ width: '100%', height: 38, border: `1px solid ${errDigits ? '#EF4444' : '#E5E7EB'}`, borderRadius: 8, padding: '0 12px', fontSize: 20, letterSpacing: 6, fontWeight: 700, color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                />
                {errDigits && <p style={{ fontSize: 11, color: '#EF4444', margin: '4px 0 0' }}>{errDigits}</p>}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Nombre o descripción (opcional)</label>
                <input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Visa Producción"
                  style={{ width: '100%', height: 38, border: '1px solid #E5E7EB', borderRadius: 8, padding: '0 12px', fontSize: 13, color: '#111827', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
              <button onClick={() => { setShowModal(false); setUltimos4(''); setNombre(''); setErrDigits('') }}
                style={{ flex: 1, height: 38, border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleAddTarjeta}
                style={{ flex: 1, height: 38, border: 'none', borderRadius: 8, background: '#111827', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
