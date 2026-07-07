'use client'

import { useState, useMemo, useRef } from 'react'
import { useStore } from '@/lib/store'
import type { Legalizacion, GastoLegalizacion } from '@/lib/store'
import {
  Plus, X, ChevronRight, ChevronLeft, Search, Paperclip,
  FileText, Clock, CheckCircle, AlertCircle, RotateCcw,
  Trash2, Upload, Download, Send, Save, Printer, Eye, Filter
} from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => '$ ' + n.toLocaleString('es-CO')
const today = () => new Date().toISOString().split('T')[0]

const TIPOS_GASTO = ['Transporte', 'Alimentación', 'Hospedaje', 'Material POP', 'Parqueadero', 'Imprevistos', 'Otros']
const ESTADOS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  'En revisión':   { bg: '#FEF3C7', color: '#92400E', label: 'En revisión' },
  'Aprobada':      { bg: '#D1FAE5', color: '#065F46', label: 'Aprobada' },
}

function EstadoBadge({ estado }: { estado: string }) {
  const s = ESTADOS_BADGE[estado] ?? ESTADOS_BADGE['En revisión']
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function totalLegalizacion(l: Legalizacion) {
  return l.gastos.reduce((s, g) => s + g.total, 0)
}

// ─── Panel lateral de detalle ────────────────────────────────────────────────────
function DetallePanel({ leg, onClose, onUpdate }: {
  leg: Legalizacion
  onClose: () => void
  onUpdate: (changes: Partial<Legalizacion>) => void
}) {
  const total = totalLegalizacion(leg)
  const saldo = leg.anticipo - total

  function cambiarEstado(estado: Legalizacion['estado'], obs?: string) {
    const entrada = { fecha: today(), usuario: 'Sistema', accion: estado, observacion: obs }
    const changes: Partial<Legalizacion> = {
      estado,
      historial: [...leg.historial, entrada],
      ...(obs ? { observacionContabilidad: obs } : {}),
    }
    onUpdate(changes)
  }

  return (
    <div style={{ width: 340, borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Detalle de legalización</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
          <X style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Info general */}
        {([
          ['Responsable', leg.responsable],

          ['Tipo de legalización', leg.tipoLegalizacion],
          ['Fecha', leg.fecha],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>{k}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#111827', textAlign: 'right', maxWidth: 160 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Estado</span>
          <EstadoBadge estado={leg.estado} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Anticipo</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{fmt(leg.anticipo)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Total legalizado</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{fmt(total)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E5E7EB' }}>
          <span style={{ fontSize: 12, color: '#6B7280' }}>Saldo</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: saldo >= 0 ? '#059669' : '#DC2626' }}>{fmt(Math.abs(saldo))}{saldo < 0 ? ' (por pagar)' : ''}</span>
        </div>

        {leg.observaciones && (
          <div style={{ marginTop: 12, padding: 12, background: '#F9FAFB', borderRadius: 8, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
            <div style={{ fontWeight: 600, marginBottom: 4, color: '#6B7280', fontSize: 11, textTransform: 'uppercase' }}>Observaciones</div>
            {leg.observaciones}
          </div>
        )}

        {leg.observacionContabilidad && (
          <div style={{ marginTop: 12, padding: 12, background: '#FEF2F2', borderRadius: 8, fontSize: 12, color: '#991B1B', lineHeight: 1.5, border: '1px solid #FECACA' }}>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 11, textTransform: 'uppercase' }}>Obs. contabilidad</div>
            {leg.observacionContabilidad}
          </div>
        )}

        {/* Detalle de gastos */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>Detalle de gastos</span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 11 }}>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', background: '#F9FAFB', padding: '6px 12px', fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <span>Tipo</span><span>Ciudad/Fecha</span><span>Descripción</span><span style={{ textAlign: 'right' }}>Total</span>
            </div>
            {leg.gastos.map((g, i) => (
              <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', padding: '8px 12px', borderTop: i > 0 ? '1px solid #F3F4F6' : 'none', fontSize: 11, color: '#374151', alignItems: 'center' }}>
                <span style={{ fontWeight: 500 }}>{g.tipoGasto}</span>
                <span style={{ color: '#6B7280' }}>{g.ciudadFecha}</span>
                <span style={{ color: '#6B7280' }}>{g.descripcion}</span>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>${g.total.toLocaleString('es-CO')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Soportes */}
        {leg.gastos.some(g => g.soporteNombre || g.soporteCuentaNombre) && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
              Soportes ({leg.gastos.filter(g => g.soporteNombre || g.soporteCuentaNombre).length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {leg.gastos.filter(g => g.soporteNombre && g.tipoFactura !== 'Cuenta de cobro').map(g => (
                <div key={`fe-${g.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, color: '#374151', background: '#F9FAFB' }}>
                  <FileText style={{ width: 12, height: 12, color: '#6B7280' }} />
                  <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.soporteNombre}</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>FE</span>
                  {g.soporteData && (
                    <button onClick={() => { const w = window.open(); w?.document.write(`<iframe src="${g.soporteData}" style="width:100%;height:100vh;border:none"></iframe>`) }}
                      style={{ padding: '2px 6px', border: '1px solid #BFDBFE', borderRadius: 4, color: '#1D4ED8', background: '#EFF6FF', cursor: 'pointer' }}>
                      <Eye style={{ width: 11, height: 11 }} />
                    </button>
                  )}
                </div>
              ))}
              {leg.gastos.filter(g => g.soporteCuentaNombre).map(g => (
                <div key={`cc-${g.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid #BFDBFE', borderRadius: 6, fontSize: 11, color: '#374151', background: '#EFF6FF' }}>
                  <FileText style={{ width: 12, height: 12, color: '#1D4ED8' }} />
                  <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.soporteCuentaNombre}</span>
                  <span style={{ fontSize: 10, color: '#1D4ED8', fontWeight: 600 }}>CC</span>
                  {g.soporteCuentaData && (
                    <button onClick={() => { const w = window.open(); w?.document.write(`<iframe src="${g.soporteCuentaData}" style="width:100%;height:100vh;border:none"></iframe>`) }}
                      style={{ padding: '2px 6px', border: '1px solid #BFDBFE', borderRadius: 4, color: '#1D4ED8', background: '#fff', cursor: 'pointer' }}>
                      <Eye style={{ width: 11, height: 11 }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Historial</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leg.historial.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock style={{ width: 12, height: 12, color: '#6B7280' }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{h.accion}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{h.usuario} · {h.fecha}</div>
                  {h.observacion && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>{h.observacion}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acciones */}
      {leg.estado === 'En revisión' && (
        <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={() => cambiarEstado('Aprobada')}
            style={{ width: '100%', height: 36, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#fff', background: '#059669', cursor: 'pointer' }}>
            Aprobar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Formulario nueva / editar legalización ──────────────────────────────────────
function FormularioLegalizacion({ initial, onSave, onCancel }: {
  initial?: Legalizacion
  onSave: (data: Omit<Legalizacion, 'id' | 'createdAt' | 'codigo'>) => void
  onCancel: () => void
}) {
  const { proyectos, personasStore, currentUser } = useStore()
  const CURRENT_USER = currentUser!

  const [fecha, setFecha] = useState(initial?.fecha ?? today())
  const [tipoDoc, setTipoDoc] = useState(initial?.tipoDocumento ?? 'Legalización')
  const [tipoLeg, setTipoLeg] = useState<Legalizacion['tipoLegalizacion']>(initial?.tipoLegalizacion ?? 'Reembolso')
  const [noAnticipo, setNoAnticipo] = useState(initial?.noAnticipo ?? '')
  const [fechaReembolso, setFechaReembolso] = useState(initial?.fechaReembolso ?? today())

  const [responsable, setResponsable] = useState(initial?.responsable ?? CURRENT_USER.nombre)
  const [cargo, setCargo] = useState(initial?.cargo ?? CURRENT_USER.cargo)

  const [proyectoId, setProyectoId] = useState(initial?.proyectoId ?? '')
  const [centroCosto, setCentroCosto] = useState(initial?.centroCosto ?? '')
  const [productor, setProductor] = useState(initial?.productor ?? '')
  const [cliente, setCliente] = useState(initial?.cliente ?? '')
  const [anticipo, setAnticipo] = useState(initial?.anticipo ?? 0)

  const [gastos, setGastos] = useState<GastoLegalizacion[]>(initial?.gastos ?? [])
  const [observaciones, setObservaciones] = useState(initial?.observaciones ?? '')

  const proyectoSel = proyectos.find(p => p.id === proyectoId)
  const productores = personasStore.filter(p => p.cargo === 'Productor Sr' || p.cargo === 'Director Producción')

  function handleProyecto(id: string) {
    setProyectoId(id)
    const p = proyectos.find(x => x.id === id)
    if (p) {
      setCentroCosto(p.centroCosto ?? '')
      setCliente(p.cliente)
    }
  }

  function addGasto() {
    const g: GastoLegalizacion = { id: `g${Date.now()}`, centroCosto: '', tipoGasto: 'Transporte', tipoFactura: 'FE', ciudadFecha: today(), descripcion: '', pesos: 0, usd: 0, tasaCambio: 0, total: 0 }
    setGastos(prev => [...prev, g])
  }

  function updateGasto(id: string, changes: Partial<GastoLegalizacion>) {
    setGastos(prev => prev.map(g => {
      if (g.id !== id) return g
      const updated = { ...g, ...changes }
      if (changes.pesos !== undefined) {
        updated.total = changes.pesos
      }
      return updated
    }))
  }

  function removeGasto(id: string) {
    setGastos(prev => prev.filter(g => g.id !== id))
  }

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function handleFile(gastoId: string, file: File) {
    const reader = new FileReader()
    reader.onload = e => updateGasto(gastoId, { soporteNombre: file.name, soporteData: e.target?.result as string })
    reader.readAsDataURL(file)
  }

  const totalLeg = gastos.reduce((s, g) => s + g.total, 0)
  const porPagar = Math.max(0, totalLeg - anticipo)
  const sobra = Math.max(0, anticipo - totalLeg)

  const inp: React.CSSProperties = { height: 36, padding: '0 10px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 7, outline: 'none', color: '#111827', background: '#fff', width: '100%', boxSizing: 'border-box' }
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4, display: 'block' }

  const ccInvalidos = gastos.filter(g => g.centroCosto && !proyectos.some(p => p.centroCosto === g.centroCosto))

  function handleGuardar(estado: Legalizacion['estado']) {
    if (ccInvalidos.length > 0) return
    const entrada = { fecha: today(), usuario: CURRENT_USER.nombre, accion: estado === 'En revisión' ? 'Enviada a revisión' : 'Guardada como borrador' }
    const historial = initial?.historial ? [...initial.historial, entrada] : [{ fecha: today(), usuario: CURRENT_USER.nombre, accion: 'Creada' }, entrada]
    onSave({
      fecha, tipoDocumento: tipoDoc, tipoLegalizacion: tipoLeg, noAnticipo: '', fechaReembolso: fecha,
      responsable, cargo, proyectoId: '', proyecto: '', centroCosto: '', productor: '', cliente: '',
      gastos, anticipo, observaciones, estado,
      creadoPor: initial?.creadoPor ?? CURRENT_USER.nombre,
      historial: initial ? historial : [{ fecha: today(), usuario: CURRENT_USER.nombre, accion: 'Creada' }],
      observacionContabilidad: initial?.observacionContabilidad,
    })
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 13 }}>
          <ChevronLeft style={{ width: 16, height: 16 }} /> Volver
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>{initial ? 'Editar legalización' : 'Nueva legalización'}</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: '2px 0 0' }}>Registra los gastos realizados y adjunta los soportes para su legalización.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Sección 1 — Encabezado */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>1</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Encabezado</span>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <label style={label}>Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={label}>Tipo de documento</label>
              <input value={tipoDoc} onChange={e => setTipoDoc(e.target.value)} style={inp} placeholder="Legalización" />
            </div>
            <div>
              <label style={label}>Tipo de legalización</label>
              <select value={tipoLeg} onChange={e => { const v = e.target.value as Legalizacion['tipoLegalizacion']; setTipoLeg(v); if (v === 'Reembolso') setAnticipo(0) }} style={inp}>
                <option>Reembolso</option>
                <option>Legalización de anticipo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sección 2 — Responsable */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>2</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Responsable</span>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={label}>Responsable</label>
              <select value={responsable} onChange={e => {
                setResponsable(e.target.value)
                const p = personasStore.find(x => x.nombre === e.target.value)
                if (p) setCargo(p.cargo)
              }} style={inp}>
                {personasStore.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Cargo / área</label>
              <input value={cargo} onChange={e => setCargo(e.target.value)} style={inp} />
            </div>
          </div>
        </div>

        {/* Sección 3 — Detalle de gastos */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>3</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Detalle de gastos</span>
            </div>
            <button onClick={addGasto}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#374151', background: '#F9FAFB', cursor: 'pointer' }}>
              <Plus style={{ width: 13, height: 13 }} /> Agregar gasto
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Centro costo', 'Tipo de gasto', 'Tipo factura', 'Fecha', 'Descripción', 'Pesos', 'Total', 'Soporte', ''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: '#6B7280', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gastos.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                      No hay gastos. Haz clic en "Agregar gasto" para comenzar.
                    </td>
                  </tr>
                )}
                {gastos.map(g => (
                  <tr key={g.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                      <input value={g.centroCosto} onChange={e => updateGasto(g.id, { centroCosto: e.target.value })}
                        style={{ ...inp, width: 70, borderColor: g.centroCosto && !proyectos.some(p => p.centroCosto === g.centroCosto) ? '#EF4444' : undefined }} />
                      {g.centroCosto && !proyectos.some(p => p.centroCosto === g.centroCosto) && (
                        <div style={{ fontSize: 10, color: '#EF4444', marginTop: 3, width: 70, lineHeight: 1.3 }}>
                          CC no existe
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <select value={g.tipoGasto} onChange={e => updateGasto(g.id, { tipoGasto: e.target.value })}
                        style={{ ...inp, width: 120 }}>
                        {TIPOS_GASTO.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '6px 8px', verticalAlign: 'top' }}>
                      <select value={g.tipoFactura ?? 'FE'} onChange={e => {
                        const nuevo = e.target.value as 'FE' | 'Cuenta de cobro'
                        const cambio: Partial<GastoLegalizacion> = { tipoFactura: nuevo }
                        if (nuevo !== g.tipoFactura) {
                          cambio.cedulaCuentaCobro = ''
                          cambio.soporteCuentaNombre = undefined
                          cambio.soporteCuentaData = undefined
                        }
                        updateGasto(g.id, cambio)
                      }}
                        style={{ ...inp, width: 130 }}>
                        <option value="FE">FE</option>
                        <option value="Cuenta de cobro">Cuenta de cobro</option>
                      </select>
                      {g.tipoFactura === 'Cuenta de cobro' && (
                        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <input
                            value={g.cedulaCuentaCobro ?? ''}
                            onChange={e => updateGasto(g.id, { cedulaCuentaCobro: e.target.value })}
                            placeholder="No. cédula"
                            style={{ ...inp, width: 130, fontSize: 11 }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 28, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, color: g.soporteCuentaNombre ? '#1A56DB' : '#6B7280', background: g.soporteCuentaNombre ? '#EFF6FF' : '#F9FAFB', cursor: 'pointer', flex: 1, overflow: 'hidden', boxSizing: 'border-box' }}>
                              <Paperclip style={{ width: 10, height: 10, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.soporteCuentaNombre ?? 'Adjuntar CC'}</span>
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                                onChange={e => {
                                  const f = e.target.files?.[0]
                                  if (!f) return
                                  const reader = new FileReader()
                                  reader.onload = ev => updateGasto(g.id, { soporteCuentaNombre: f.name, soporteCuentaData: ev.target?.result as string })
                                  reader.readAsDataURL(f)
                                }} />
                            </label>
                            {g.soporteCuentaData && (
                              <button onClick={() => { const w = window.open(); w?.document.write(`<iframe src="${g.soporteCuentaData}" style="width:100%;height:100vh;border:none"></iframe>`) }}
                                style={{ height: 28, padding: '0 7px', border: '1px solid #BFDBFE', borderRadius: 6, color: '#1D4ED8', background: '#EFF6FF', cursor: 'pointer', flexShrink: 0 }}
                                title="Ver CC">
                                <Eye style={{ width: 12, height: 12 }} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input type="date" value={g.ciudadFecha} onChange={e => updateGasto(g.id, { ciudadFecha: e.target.value })}
                        style={{ ...inp, width: 140 }} />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input value={g.descripcion} onChange={e => updateGasto(g.id, { descripcion: e.target.value })}
                        style={{ ...inp, width: 180 }} placeholder="Descripción del gasto" />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input type="number" value={g.pesos || ''} onChange={e => updateGasto(g.id, { pesos: +e.target.value })}
                        style={{ ...inp, width: 90 }} placeholder="0" />
                    </td>
                    <td style={{ padding: '6px 8px', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', color: '#111827' }}>
                      {g.total.toLocaleString('es-CO')}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {g.tipoFactura === 'Cuenta de cobro' ? null : (
                        <>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" ref={el => { fileRefs.current[g.id] = el }}
                            onChange={e => e.target.files?.[0] && handleFile(g.id, e.target.files[0])}
                            style={{ display: 'none' }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button onClick={() => fileRefs.current[g.id]?.click()}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', height: 30, border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, color: g.soporteNombre ? '#1A56DB' : '#6B7280', background: g.soporteNombre ? '#EFF6FF' : '#F9FAFB', cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden' }}>
                              <Paperclip style={{ width: 11, height: 11, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.soporteNombre ?? 'Adjuntar'}</span>
                            </button>
                            {g.soporteData && (
                              <button onClick={() => { const w = window.open(); w?.document.write(`<iframe src="${g.soporteData}" style="width:100%;height:100vh;border:none"></iframe>`) }}
                                style={{ height: 30, padding: '0 7px', border: '1px solid #BFDBFE', borderRadius: 6, fontSize: 11, color: '#1D4ED8', background: '#EFF6FF', cursor: 'pointer' }}
                                title="Ver soporte">
                                <Eye style={{ width: 12, height: 12 }} />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <button onClick={() => removeGasto(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Secciones 5 y 6 — Observaciones + Totales */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>4</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Observaciones</span>
            </div>
            <div style={{ padding: '20px' }}>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                rows={5} placeholder="Observaciones generales de la legalización..."
                style={{ width: '100%', resize: 'vertical', padding: '10px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 7, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'right' }}>
                {120 - observaciones.length} caracteres restantes
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>5</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Totales</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={label}>Anticipo recibido ($)</label>
                {tipoLeg === 'Reembolso' ? (
                  <div style={{ ...inp, display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: 13, background: '#F9FAFB', cursor: 'not-allowed' }}>
                    $ 0 — Reembolso no aplica anticipo
                  </div>
                ) : (
                  <input type="number" value={anticipo || ''} onChange={e => setAnticipo(+e.target.value)}
                    style={inp} placeholder="0" />
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { l: 'Total legalizado', v: totalLeg, color: '#111827' },
                  { l: 'Por pagar', v: porPagar, color: porPagar > 0 ? '#DC2626' : '#9CA3AF' },
                  { l: 'Sobra', v: sobra, color: sobra > 0 ? '#059669' : '#9CA3AF' },
                  { l: 'Saldo', v: Math.abs(totalLeg - anticipo), color: totalLeg > anticipo ? '#DC2626' : '#059669' },
                ].map(item => (
                  <div key={item.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>{item.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{fmt(item.v)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Nota PDF */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
          <FileText style={{ width: 14, height: 14, color: '#16A34A', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#15803D' }}>Después de generar el PDF, podrás imprimirlo con todos los soportes adjuntos.</span>
        </div>
      </div>

      {/* Barra de acciones */}
      <div style={{ position: 'sticky', bottom: 0, background: 'rgba(249,250,251,0.95)', backdropFilter: 'blur(4px)', padding: '16px 0 8px', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
        <button onClick={onCancel}
          style={{ height: 38, padding: '0 18px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={() => handleGuardar('En revisión')} disabled={ccInvalidos.length > 0}
          title={ccInvalidos.length > 0 ? 'Corrige los centros de costo inválidos antes de enviar' : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 24px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', background: ccInvalidos.length > 0 ? '#93C5FD' : '#1D4ED8', cursor: ccInvalidos.length > 0 ? 'not-allowed' : 'pointer', opacity: ccInvalidos.length > 0 ? 0.7 : 1 }}>
          <Send style={{ width: 14, height: 14 }} /> Enviar a revisión
        </button>
      </div>
    </div>
  )
}

// ─── Vista principal — Lista / Dashboard ─────────────────────────────────────────
export default function LegalizacionesPage() {
  const { legalizaciones, addLegalizacion, updateLegalizacion, currentUser, personasStore } = useStore()

  const [vista, setVista] = useState<'lista' | 'formulario'>('lista')
  const [detalle, setDetalle] = useState<Legalizacion | null>(null)
  const [editando, setEditando] = useState<Legalizacion | undefined>(undefined)
  const [printLeg, setPrintLeg] = useState<Legalizacion | null>(null)
  const [soportePopover, setSoportePopover] = useState<string | null>(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('Todos')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroResponsable, setFiltroResponsable] = useState(currentUser?.nombre ?? 'Todos')
  const [filtroMes, setFiltroMes] = useState('Todos')

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  const responsables = useMemo(() => {
    const uniq = Array.from(new Set(legalizaciones.map(l => l.responsable))).sort()
    return ['Todos', ...uniq]
  }, [legalizaciones])

  const mesesDisponibles = useMemo(() => {
    const uniq = Array.from(new Set(legalizaciones.map(l => {
      const d = new Date(l.fecha)
      return isNaN(d.getTime()) ? null : d.getMonth()
    }).filter((m): m is number => m !== null))).sort((a, b) => a - b)
    return uniq.map(m => ({ value: String(m), label: MESES[m] }))
  }, [legalizaciones])

  const legsFiltradas = useMemo(() => {
    return legalizaciones.filter(l => {
      if (filtroEstado !== 'Todos' && l.estado !== filtroEstado) return false
      if (filtroTipo !== 'Todos' && l.tipoLegalizacion !== filtroTipo) return false
      if (filtroResponsable !== 'Todos' && l.responsable !== filtroResponsable) return false
      if (filtroMes !== 'Todos') {
        const d = new Date(l.fecha)
        if (isNaN(d.getTime()) || String(d.getMonth()) !== filtroMes) return false
      }
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (!l.responsable.toLowerCase().includes(q) && !l.proyecto.toLowerCase().includes(q) && !l.centroCosto.includes(q)) return false
      }
      return true
    })
  }, [legalizaciones, filtroEstado, filtroTipo, filtroResponsable, filtroMes, busqueda])

  const totalLeg     = legsFiltradas.reduce((s, l) => s + totalLegalizacion(l), 0)
  const totalAnticip   = legsFiltradas.filter(l => l.tipoLegalizacion === 'Legalización de anticipo').reduce((s, l) => s + totalLegalizacion(l), 0)
  const totalReemb     = legsFiltradas.filter(l => l.tipoLegalizacion === 'Reembolso').reduce((s, l) => s + totalLegalizacion(l), 0)
  const totalCuentaCob = legsFiltradas.reduce((s, l) => s + l.gastos.filter(g => g.tipoFactura === 'Cuenta de cobro').reduce((gs, g) => gs + g.total, 0), 0)
  const pendientes   = legsFiltradas.filter(l => l.estado === 'En revisión').length
  const aprobadas    = legsFiltradas.filter(l => l.estado === 'Aprobada').length

  function handleSaveForm(data: Omit<Legalizacion, 'id' | 'createdAt' | 'codigo'>) {
    if (editando) {
      updateLegalizacion(editando.id, data)
    } else {
      addLegalizacion(data)
    }
    setVista('lista')
    setEditando(undefined)
  }

  function handleUpdateDetalle(changes: Partial<Legalizacion>) {
    if (!detalle) return
    updateLegalizacion(detalle.id, changes)
    setDetalle(prev => prev ? { ...prev, ...changes } : prev)
  }

  if (vista === 'formulario') {
    return (
      <FormularioLegalizacion
        initial={editando}
        onSave={handleSaveForm}
        onCancel={() => { setVista('lista'); setEditando(undefined) }}
      />
    )
  }

  const sel: React.CSSProperties = { height: 34, padding: '0 10px', fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 7, outline: 'none', color: '#374151', background: '#fff' }

  return (
    <div style={{ display: 'flex', minHeight: '100%' }}>
      <div style={{ flex: 1, padding: '28px 28px 40px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Legalizaciones</h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>Digitaliza y controla las legalizaciones de gastos de los proyectos: anticipos, cuentas de cobro y tarjetas de crédito.</p>
          </div>
          <button onClick={() => { setEditando(undefined); setVista('formulario') }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 18px', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', background: '#1A56DB', cursor: 'pointer', flexShrink: 0 }}>
            <Plus style={{ width: 16, height: 16 }} /> Nueva legalización
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total legalizado', value: fmt(totalLeg), icon: '📋', sub: 'Este periodo', trend: '+12,4%' },
            { label: 'Legalización Anticipos', value: fmt(totalAnticip), icon: '💳', sub: 'Este periodo', trend: '+8,7%' },
            { label: 'Reembolso', value: fmt(totalReemb), icon: '💰', sub: 'Este periodo', trend: '+9,1%' },
            { label: 'Cuentas de cobro', value: fmt(totalCuentaCob), icon: '📄', sub: 'Este periodo', trend: '+15,2%' },
            { label: 'Pendientes de revisión', value: `${pendientes} legalizaciones`, icon: '⏰', sub: null, trend: null },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px' }}>
              <div style={{ fontSize: 18, marginBottom: 8 }}>{k.icon}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{k.value}</div>
              {k.sub && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{k.sub}</span>
                  <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>↑ {k.trend}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 34, border: '1px solid #E5E7EB', borderRadius: 7, background: '#fff' }}>
            <Search style={{ width: 13, height: 13, color: '#9CA3AF' }} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar legalización..." style={{ border: 'none', outline: 'none', fontSize: 12, color: '#374151', width: 180 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>Estado:</span>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={sel}>
              <option>Todos</option>
              <option>En revisión</option>
              <option>Aprobada</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>Tipo:</span>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={sel}>
              <option>Todos</option>
              <option>Reembolso</option>
              <option>Legalización de anticipo</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>Responsable:</span>
            <select value={filtroResponsable} onChange={e => setFiltroResponsable(e.target.value)} style={sel}>
              {responsables.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6B7280' }}>Mes:</span>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={sel}>
              <option value="Todos">Todos</option>
              {mesesDisponibles.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9CA3AF' }}>
            Mostrando {legsFiltradas.length} de {legalizaciones.length} legalizaciones
          </div>
        </div>

        {/* Tabla */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Código', 'Fecha', 'Responsable', 'Tipo', 'Anticipo', 'Total legalizado', 'Saldo', 'Estado', 'Soportes', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {legsFiltradas.length === 0 && (
                <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No hay legalizaciones que coincidan con los filtros.</td></tr>
              )}
              {legsFiltradas.map(l => {
                const tot = totalLegalizacion(l)
                const saldo = l.anticipo - tot
                const soportesFE = l.gastos.filter(g => g.soporteNombre && g.tipoFactura !== 'Cuenta de cobro')
                const soportesCC = l.gastos.filter(g => g.soporteCuentaNombre)
                const soportes = soportesFE.length + soportesCC.length
                const activa = detalle?.id === l.id
                return (
                  <tr key={l.id} onClick={() => setDetalle(activa ? null : l)}
                    style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: activa ? '#EFF6FF' : 'transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!activa) (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
                    onMouseLeave={e => { if (!activa) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', padding: '2px 7px', borderRadius: 5, border: '1px solid #BFDBFE' }}>
                        {l.codigo ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{l.fecha}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#1D4ED8' }}>{l.responsable.split(' ').slice(0,2).map(n=>n[0]).join('')}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap' }}>{l.responsable}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: l.tipoLegalizacion === 'Reembolso' ? '#F0FDF4' : '#FFF7ED', color: l.tipoLegalizacion === 'Reembolso' ? '#15803D' : '#C2410C' }}>
                        {l.tipoLegalizacion === 'Legalización de anticipo' ? 'Anticipo' : 'Reembolso'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>{l.anticipo > 0 ? fmt(l.anticipo) : '$ 0'}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{fmt(tot)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: saldo >= 0 ? '#059669' : '#DC2626' }}>
                      {fmt(Math.abs(saldo))}
                    </td>
                    <td style={{ padding: '12px 14px' }}><EstadoBadge estado={l.estado} /></td>
                    <td style={{ padding: '12px 14px', position: 'relative' }} onClick={e => e.stopPropagation()}>
                      {soportes > 0 ? (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            onClick={e => { e.stopPropagation(); setSoportePopover(soportePopover === l.id ? null : l.id) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, color: '#374151', background: '#F9FAFB', cursor: 'pointer' }}>
                            <Paperclip style={{ width: 12, height: 12 }} /> {soportes}
                          </button>
                          {soportePopover === l.id && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 260, padding: 8 }}>
                              <div style={{ fontSize: 10, color: '#9CA3AF', padding: '2px 8px 6px', borderBottom: '1px solid #F3F4F6', marginBottom: 4 }}>
                                Clic → ver · Doble clic → descargar
                              </div>
                              {soportesFE.map(g => (
                                <div key={g.id}
                                  onClick={() => { if (g.soporteData) { const w = window.open(); w?.document.write(`<iframe src="${g.soporteData}" style="width:100%;height:100vh;border:none"></iframe>`) } }}
                                  onDoubleClick={() => { if (g.soporteData && g.soporteNombre) { const a = document.createElement('a'); a.href = g.soporteData; a.download = g.soporteNombre; a.click() } }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                  <FileText style={{ width: 12, height: 12, color: '#6B7280', flexShrink: 0 }} />
                                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151' }}>{g.soporteNombre}</span>
                                  <span style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0 }}>FE</span>
                                </div>
                              ))}
                              {soportesCC.map(g => (
                                <div key={g.id}
                                  onClick={() => { if (g.soporteCuentaData) { const w = window.open(); w?.document.write(`<iframe src="${g.soporteCuentaData}" style="width:100%;height:100vh;border:none"></iframe>`) } }}
                                  onDoubleClick={() => { if (g.soporteCuentaData && g.soporteCuentaNombre) { const a = document.createElement('a'); a.href = g.soporteCuentaData; a.download = g.soporteCuentaNombre; a.click() } }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#EFF6FF'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                  <FileText style={{ width: 12, height: 12, color: '#1D4ED8', flexShrink: 0 }} />
                                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151' }}>{g.soporteCuentaNombre}</span>
                                  <span style={{ fontSize: 10, color: '#1D4ED8', flexShrink: 0, background: '#DBEAFE', padding: '1px 5px', borderRadius: 4 }}>CC</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : <span style={{ fontSize: 12, color: '#D1D5DB' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={e => { e.stopPropagation(); setEditando(l); setVista('formulario') }}
                          style={{ padding: '4px 10px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, color: '#374151', background: '#F9FAFB', cursor: 'pointer' }}>
                          Editar
                        </button>
                        <button onClick={e => { e.stopPropagation(); setPrintLeg(l) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '1px solid #BFDBFE', borderRadius: 6, fontSize: 11, color: '#1E40AF', background: '#EFF6FF', cursor: 'pointer' }}>
                          <Download style={{ width: 11, height: 11 }} /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#9CA3AF' }}>
            Mostrando 1 a {legsFiltradas.length} de {legalizaciones.length} legalizaciones
          </div>
        </div>
      </div>

      {/* Panel lateral detalle */}
      {detalle && (
        <DetallePanel
          leg={detalle}
          onClose={() => setDetalle(null)}
          onUpdate={handleUpdateDetalle}
        />
      )}

      {/* Vista de impresión PDF */}
      {printLeg && <PrintView leg={printLeg} personasStore={personasStore} onClose={() => setPrintLeg(null)} />}
    </div>
  )
}

// ─── Vista de impresión / PDF ────────────────────────────────────────────────────
function buildPrintHTML(leg: Legalizacion, personasStore: import('@/lib/store').PersonaStore[]): string {
  const persona = personasStore.find(p => p.nombre === leg.responsable)
  const total = totalLegalizacion(leg)
  const MIN_ROWS = 18
  const emptyRows = Math.max(0, MIN_ROWS - leg.gastos.length)
  const docNum = leg.codigo ?? `SE-LG-???/${new Date(leg.fecha).getFullYear().toString().slice(2)}`
  const fmtCOP = (n: number) => '$ ' + n.toLocaleString('es-CO')
  const gastoRows = leg.gastos.map(g => `
    <tr>
      <td class="cell tc">${g.centroCosto}</td>
      <td class="cell">${g.tipoGasto}</td>
      <td class="cell tc">${g.ciudadFecha}</td>
      <td class="cell">${(g.descripcion||'').toUpperCase()}</td>
      <td class="cell tr">${g.pesos > 0 ? fmtCOP(g.pesos) : ''}</td>
      <td class="cell tr">${g.total > 0 ? fmtCOP(g.total) : ''}</td>
    </tr>`).join('')
  const emptyRowsHTML = Array.from({ length: emptyRows }).map(() => `
    <tr>
      <td class="cell">&nbsp;</td><td class="cell"></td><td class="cell"></td>
      <td class="cell"></td><td class="cell"></td>
      <td class="cell tr" style="color:#888">$ -</td>
    </tr>`).join('')
  const initials = leg.creadoPor.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,3)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${docNum} – ${leg.responsable}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm 16mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; margin: 0; padding: 0; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .logo-circle { width: 34px; height: 34px; border-radius: 50%; background: #1A56DB; display: inline-flex; align-items: center; justify-content: center; }
    .logo-circle span { color: #fff; font-weight: 900; font-size: 12pt; }
    .logo-info { display: inline-block; margin-left: 6px; }
    .logo-name { font-size: 12pt; font-weight: 800; }
    .logo-sub { font-size: 8pt; color: #6B7280; }
    .docnum { font-size: 10pt; font-weight: 700; letter-spacing: 0.05em; }
    table { border-collapse: collapse; }
    .fields { margin-bottom: 8px; font-size: 9pt; }
    .fields td { padding: 1px 12px 1px 0; }
    .fields td:first-child { font-weight: 700; white-space: nowrap; }
    .cell { border: 1px solid #000; padding: 2px 4px; font-size: 8pt; }
    .hcell { border: 1px solid #000; padding: 2px 4px; font-size: 8pt; font-weight: 700; text-align: center; background: #D9D9D9; }
    .tc { text-align: center; }
    .tr { text-align: right; }
    .gastos-table { width: 100%; margin-bottom: 0; }
    .footer-table { width: 100%; }
    .total-cell { background: #D9D9D9; font-weight: 800; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center">
      <div class="logo-circle"><span>SE</span></div>
      <div class="logo-info">
        <div class="logo-name">Social Experience</div>
      </div>
    </div>
    <div class="docnum">${docNum}</div>
  </div>

  <table class="fields">
    <tr><td>Fecha:</td><td>${leg.fecha}</td></tr>
    <tr><td>Tipo Documento:</td><td>${leg.tipoLegalizacion.toUpperCase()}</td></tr>
    <tr><td>Responsable:</td><td>${leg.responsable.toUpperCase()}</td></tr>
  </table>

  <table style="width:100%;margin-bottom:6px">
    <tr>
      <td class="cell" style="width:120px;font-weight:700">Nombre Contratista:</td>
      <td class="cell" style="width:200px">${leg.responsable.toUpperCase()}</td>
      <td class="cell" style="width:200px">${leg.observaciones || 'Reporte ' + leg.tipoLegalizacion}</td>
      <td class="cell">Plantilla Legalizaciones</td>
    </tr>
    <tr>
      <td class="cell" style="font-weight:700">Cedula:</td>
      <td class="cell">${persona?.cedula ?? ''}</td><td class="cell"></td><td class="cell"></td>
    </tr>
  </table>

  <table class="gastos-table">
    <thead>
      <tr>
        <th class="hcell" style="width:65px">Centro Costos</th>
        <th class="hcell" style="width:85px">Tipo de Gasto</th>
        <th class="hcell" style="width:75px">Fecha</th>
        <th class="hcell">Descripcion</th>
        <th class="hcell" style="width:80px">Pesos</th>
        <th class="hcell" style="width:80px">Total</th>
      </tr>
    </thead>
    <tbody>
      ${gastoRows}
      ${emptyRowsHTML}
    </tbody>
  </table>

  <table class="footer-table">
    <tr>
      <td class="cell" style="width:150px;font-weight:700">Elaborado Por: <span style="font-weight:400">${initials}</span></td>
      <td class="cell" style="width:160px;font-weight:700">Autorizado Por: <span style="font-weight:400">FAA</span></td>
      <td class="cell" style="font-weight:700">Gestionado Por: <span style="font-weight:400">Social Experience SAS</span></td>
      <td class="cell total-cell" style="width:80px">${fmtCOP(total)}</td>
    </tr>
    <tr>
      <td class="cell" colspan="3" style="font-weight:700;text-align:right;padding-right:8px">Anticipo Recibido:</td>
      <td class="cell total-cell" style="width:80px">${fmtCOP(leg.anticipo)}</td>
    </tr>
    <tr>
      <td class="cell" colspan="3" style="font-weight:700;text-align:right;padding-right:8px">Saldo:</td>
      <td class="cell total-cell" style="width:80px;color:${(leg.anticipo - total) >= 0 ? '#166534' : '#991B1B'}">${fmtCOP(Math.abs(leg.anticipo - total))}</td>
    </tr>
  </table>
</body>
</html>`
}

function PrintView({ leg, personasStore, onClose }: { leg: Legalizacion; personasStore: import('@/lib/store').PersonaStore[]; onClose: () => void }) {
  const total = totalLegalizacion(leg)
  const persona = personasStore.find(p => p.nombre === leg.responsable)

  // Rellena hasta 18 filas como en el formato original
  const MIN_ROWS = 18
  const emptyRows = Math.max(0, MIN_ROWS - leg.gastos.length)

  const cell: React.CSSProperties = { border: '1px solid #000', padding: '2px 5px', fontSize: 9 }
  const cellR: React.CSSProperties = { ...cell, textAlign: 'right' }
  const hCell: React.CSSProperties = { ...cell, background: '#D9D9D9', fontWeight: 700, fontSize: 9, textAlign: 'center' }

  // Número de documento tipo SE-LG-001/26
  const docNum = leg.codigo ?? `SE-LG-???/${new Date(leg.fecha).getFullYear().toString().slice(2)}`

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 14mm 16mm; }
        @media print {
          body > * { display: none !important; }
          .print-root { display: block !important; position: fixed; inset: 0; background: white; z-index: 9999; overflow: visible; padding: 0; }
          .no-print { display: none !important; }
          .print-doc { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; width: 100% !important; padding: 0 !important; }
        }
        @media screen {
          .print-root { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 200; display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 32px 24px; }
        }
      `}</style>

      <div className="print-root" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="print-doc" style={{ background: '#fff', width: '100%', maxWidth: 820, borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: '32px 40px', fontFamily: 'Arial, Helvetica, sans-serif' }}>

          {/* Acciones pantalla */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
            <button onClick={onClose} style={{ height: 34, padding: '0 16px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' }}>
              Cerrar
            </button>
            <button onClick={() => {
              const w = window.open('', '_blank', 'width=1100,height=700')
              if (!w) return
              w.document.write(buildPrintHTML(leg, personasStore))
              w.document.close()
              w.focus()
              setTimeout(() => w.print(), 400)
            }} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 16px', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#fff', background: '#1A56DB', cursor: 'pointer' }}>
              <Printer style={{ width: 14, height: 14 }} /> Imprimir / Guardar PDF
            </button>
          </div>

          {/* ── Logo + Nº documento ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            {/* Logo Social Experience */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>SE</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1 }}>Social Experience</div>
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#111827', letterSpacing: '0.05em' }}>{docNum}</div>
          </div>

          {/* ── Campos encabezado ── */}
          <table style={{ borderCollapse: 'collapse', marginBottom: 10, fontSize: 10 }}>
            <tbody>
              {[
                ['Fecha:', leg.fecha],
                ['Tipo Documento:', leg.tipoLegalizacion.toUpperCase()],
                ['Responsable:', leg.responsable.toUpperCase()],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ paddingRight: 16, paddingBottom: 2, fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>{k}</td>
                  <td style={{ paddingBottom: 2, fontWeight: 700, fontSize: 10 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Fila contratista ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6, fontSize: 9 }}>
            <tbody>
              <tr>
                <td style={{ ...cell, width: 100, fontWeight: 700 }}>Nombre Contratista:</td>
                <td style={{ ...cell, width: 200 }}>{leg.responsable.toUpperCase()}</td>
                <td style={{ ...cell, width: 180 }}>{leg.observaciones || `Reporte ${leg.tipoLegalizacion}`}</td>
                <td style={{ ...cell }}>Plantilla Legalizaciones</td>
              </tr>
              <tr>
                <td style={{ ...cell, fontWeight: 700 }}>Cedula:</td>
                <td style={{ ...cell }}>{persona?.cedula ?? ''}</td>
                <td style={{ ...cell }}></td>
                <td style={{ ...cell }}></td>
              </tr>
            </tbody>
          </table>

          {/* ── Tabla de gastos ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <thead>
              <tr>
                <th style={{ ...hCell, width: 65 }}>Centro Costos</th>
                <th style={{ ...hCell, width: 90 }}>Tipo de Gasto</th>
                <th style={{ ...hCell, width: 80 }}>Fecha</th>
                <th style={{ ...hCell }}>Descripcion</th>
                <th style={{ ...hCell, width: 80 }}>Pesos</th>
                <th style={{ ...hCell, width: 80 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {leg.gastos.map(g => (
                <tr key={g.id}>
                  <td style={{ ...cell, textAlign: 'center' }}>{g.centroCosto}</td>
                  <td style={{ ...cell }}>{g.tipoGasto}</td>
                  <td style={{ ...cell, textAlign: 'center' }}>{g.ciudadFecha}</td>
                  <td style={{ ...cell }}>{g.descripcion.toUpperCase()}</td>
                  <td style={{ ...cellR }}>$ {g.pesos > 0 ? g.pesos.toLocaleString('es-CO') : ''}</td>
                  <td style={{ ...cellR }}>$ {g.total.toLocaleString('es-CO')}</td>
                </tr>
              ))}
              {/* Filas vacías para completar la página */}
              {Array.from({ length: emptyRows }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td style={cell}>&nbsp;</td>
                  <td style={cell}></td>
                  <td style={cell}></td>
                  <td style={cell}></td>
                  <td style={cell}></td>
                  <td style={{ ...cellR, color: '#888' }}>$ -</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Pie: elaborado / autorizado / gestionado / total ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <tbody>
              <tr>
                <td style={{ ...cell, width: 140, fontWeight: 700 }}>
                  Elaborado Por: <span style={{ fontWeight: 400 }}>{leg.creadoPor.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,3)}</span>
                </td>
                <td style={{ ...cell, width: 160, fontWeight: 700 }}>
                  Autorizado Por: <span style={{ fontWeight: 400 }}>FAA</span>
                </td>
                <td style={{ ...cell, fontWeight: 700 }}>
                  Gestionado Por: <span style={{ fontWeight: 400 }}>Social Experience SAS</span>
                </td>
                <td style={{ ...cellR, width: 75, fontWeight: 800, background: '#D9D9D9' }}>
                  $ {total.toLocaleString('es-CO')}
                </td>
              </tr>
              <tr>
                <td colSpan={3} style={{ ...cell, fontWeight: 700, textAlign: 'right', paddingRight: 8 }}>
                  Anticipo Recibido:
                </td>
                <td style={{ ...cellR, width: 75, fontWeight: 800, background: '#D9D9D9' }}>
                  $ {leg.anticipo.toLocaleString('es-CO')}
                </td>
              </tr>
              <tr>
                <td colSpan={3} style={{ ...cell, fontWeight: 700, textAlign: 'right', paddingRight: 8 }}>
                  Saldo:
                </td>
                <td style={{ ...cellR, width: 75, fontWeight: 800, background: '#D9D9D9', color: (leg.anticipo - total) >= 0 ? '#166534' : '#991B1B' }}>
                  $ {Math.abs(leg.anticipo - total).toLocaleString('es-CO')}
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </>
  )
}
