'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { FolderOpen, Plus, Search, MoreHorizontal, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useStore } from '@/lib/store'
import type { Proyecto } from '@/lib/store'

function clienteColor(nombre: string, clientes: { nombre: string; color: string }[]) {
  return clientes.find(c => c.nombre === nombre)?.color ?? '#6B7280'
}
function clienteIni(nombre: string) { return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() }
function clienteLogo(nombre: string, clientes: { nombre: string; logo?: string }[]) {
  return clientes.find(c => c.nombre === nombre)?.logo
}

const estadoConfig: Record<string, string> = {
  'En propuesta':   'bg-blue-50 text-blue-700 border-blue-200',
  'En negociación': 'bg-amber-50 text-amber-700 border-amber-200',
  'Vendido':        'bg-green-50 text-green-700 border-green-200',
  'Perdido':        'bg-red-50 text-red-700 border-red-200',
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const mesesFiltro = ['Todos', ...MESES.map((m, i) => `${m} ${2026 + Math.floor(i / 12)}`).slice(0, 12)]
const tipos = ['Todos', 'Evento 360', 'Logística', 'Activación', 'Experiencias', 'Convención', 'Escenografía/Feria', 'Técnica', 'Litografía', 'Digital', 'Estrategia', 'Otros']
const estadosFiltro = ['Todos', 'En propuesta', 'En negociación', 'Vendido', 'Perdido']

function formatCOP(v: number) { return `$ ${v.toLocaleString('es-CO')}` }

// Extrae el mes del campo fechaEntrega o fechaPresentacion (formatos: DD/MM/YYYY o YYYY-MM-DD)
function mesDeProyecto(p: Proyecto): string {
  const raw = p.fechaEntrega || p.fechaPresentacion
  if (!raw) return ''
  let month = -1
  let year = -1
  if (raw.includes('/')) {
    const parts = raw.split('/')
    month = parseInt(parts[1]) - 1
    year = parseInt(parts[2])
  } else if (raw.includes('-')) {
    const parts = raw.split('-')
    year = parseInt(parts[0])
    month = parseInt(parts[1]) - 1
  }
  if (month < 0) return ''
  return `${MESES[month]} ${year}`
}

// ─── Panel detalle ──────────────────────────────────────────────────────────────
function DetallePanel({ proyecto, onClose, onEstadoChange, onCentroCostoChange, onVentaRealChange, onEditar }: {
  proyecto: Proyecto
  onClose: () => void
  onEstadoChange: (id: string, estado: Proyecto['estadoComercial']) => void
  onCentroCostoChange: (id: string, cc: string) => void
  onVentaRealChange: (id: string, monto: number) => void
  onEditar: () => void
}) {
  const estadoOpts: Proyecto['estadoComercial'][] = ['En propuesta', 'En negociación', 'Vendido', 'Perdido']
  const [cc, setCc] = useState(proyecto.centroCosto ?? '')
  const [venta, setVenta] = useState(proyecto.montoRealVendido ? String(proyecto.montoRealVendido) : '')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 440, height: '100%', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className="text-xs text-muted-foreground mb-1">{proyecto.cliente} · {proyecto.subcliente}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{proyecto.nombre}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2, flexShrink: 0, marginTop: 2 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Estado comercial */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Estado comercial</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {estadoOpts.map(opt => (
                <button key={opt} onClick={() => onEstadoChange(proyecto.id, opt)}
                  style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: '1px solid', cursor: 'pointer',
                    background: proyecto.estadoComercial === opt ? (opt === 'Vendido' ? '#DCFCE7' : opt === 'Perdido' ? '#FEE2E2' : opt === 'En negociación' ? '#FEF3C7' : '#DBEAFE') : '#F9FAFB',
                    color: proyecto.estadoComercial === opt ? (opt === 'Vendido' ? '#15803D' : opt === 'Perdido' ? '#DC2626' : opt === 'En negociación' ? '#92400E' : '#1D4ED8') : '#6B7280',
                    borderColor: proyecto.estadoComercial === opt ? 'currentColor' : '#E5E7EB',
                  }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Centro de costo — solo visible cuando está Vendido */}
          {proyecto.estadoComercial === 'Vendido' && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px' }}>
              <div className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Centro de costo (Gespro)</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={cc}
                  onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setCc(v) }}
                  placeholder="4 dígitos"
                  maxLength={4}
                  style={{ height: 36, width: 100, padding: '0 10px', border: '1px solid #BBF7D0', borderRadius: 7, fontSize: 14, fontWeight: 600, color: '#065F46', textAlign: 'center', outline: 'none', letterSpacing: '0.1em' }}
                />
                <button
                  onClick={() => { if (cc.length === 4) onCentroCostoChange(proyecto.id, cc) }}
                  disabled={cc.length !== 4}
                  style={{ height: 36, padding: '0 14px', background: cc.length === 4 ? '#059669' : '#D1FAE5', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, color: cc.length === 4 ? '#fff' : '#6EE7B7', cursor: cc.length === 4 ? 'pointer' : 'not-allowed' }}>
                  Asignar
                </button>
                {proyecto.centroCosto && (
                  <span style={{ fontSize: 12, color: '#065F46', fontWeight: 600 }}>Actual: {proyecto.centroCosto}</span>
                )}
              </div>
              <p style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>Ingresa el número de 4 dígitos asignado en Gespro.</p>
            </div>
          )}

          {/* Venta Real — solo visible cuando está Vendido */}
          {proyecto.estadoComercial === 'Vendido' && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px' }}>
              <div className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Venta Real</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={venta ? Number(venta).toLocaleString('es-CO') : ''}
                  onChange={e => { const v = e.target.value.replace(/\./g, '').replace(/\D/g, ''); setVenta(v) }}
                  placeholder="Valor total vendido"
                  style={{ height: 36, width: 180, padding: '0 10px', border: '1px solid #BBF7D0', borderRadius: 7, fontSize: 14, fontWeight: 600, color: '#065F46', outline: 'none' }}
                />
                <button
                  onClick={() => { const n = Number(venta); if (n > 0) onVentaRealChange(proyecto.id, n) }}
                  disabled={!venta || Number(venta) === 0}
                  style={{ height: 36, padding: '0 14px', background: venta && Number(venta) > 0 ? '#059669' : '#D1FAE5', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, color: venta && Number(venta) > 0 ? '#fff' : '#6EE7B7', cursor: venta && Number(venta) > 0 ? 'pointer' : 'not-allowed' }}>
                  Guardar
                </button>
              </div>
              {proyecto.montoRealVendido && (
                <p style={{ fontSize: 12, color: '#065F46', fontWeight: 600, marginTop: 6 }}>Actual: {formatCOP(proyecto.montoRealVendido)}</p>
              )}
              <p style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>Ingresa el valor real por el que se cerró la venta.</p>
            </div>
          )}

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Tipo', value: proyecto.tipo || '—' },
              { label: 'Ejecutivo / KAM', value: proyecto.ejecutivo },
              { label: 'F. Presentación', value: proyecto.fechaPresentacion || '—' },
              { label: 'F. Ejecución', value: proyecto.fechaEntrega || '—' },
              { label: 'F. Inicio', value: proyecto.fechaInicio || '—' },
              { label: 'Prioridad', value: proyecto.prioridad },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <div className="text-sm font-medium text-foreground">{value}</div>
              </div>
            ))}
          </div>

          {/* Monto */}
          <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
            <div className="text-xs text-green-700 mb-1">Monto estimado de facturación</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#15803D' }}>{formatCOP(proyecto.monto)}</div>
          </div>

          {/* Descripción */}
          {proyecto.descripcion && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Descripción</div>
              <div className="text-sm text-foreground leading-relaxed">{proyecto.descripcion}</div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
          <Button variant="outline" className="flex-1" onClick={onClose}>Cerrar</Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={onEditar}>Editar proyecto</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Editar Proyecto ──────────────────────────────────────────────────────
function EditarProyectoModal({ proyecto, onClose, clientesStore, kams }: {
  proyecto: Proyecto
  onClose: () => void
  clientesStore: { id: string; nombre: string; subclientes?: string[] }[]
  kams: string[]
}) {
  const { updateProyecto } = useStore()
  const [form, setForm] = useState({
    nombre: proyecto.nombre,
    cliente: proyecto.cliente,
    subcliente: proyecto.subcliente,
    ejecutivo: proyecto.ejecutivo,
    tipo: proyecto.tipo,
    fechaInicio: proyecto.fechaInicio,
    fechaPresentacion: proyecto.fechaPresentacion,
    fechaEntrega: proyecto.fechaEntrega,
    monto: proyecto.monto ? String(proyecto.monto) : '',
    prioridad: proyecto.prioridad,
    descripcion: proyecto.descripcion,
  })
  const [error, setError] = useState('')

  const subclientesDisponibles = clientesStore.find(c => c.nombre === form.cliente)?.subclientes ?? []

  function handleGuardar() {
    if (!form.nombre.trim()) { setError('El nombre del proyecto es obligatorio.'); return }
    if (!form.cliente) { setError('Selecciona un cliente.'); return }
    if (!form.ejecutivo) { setError('Selecciona un ejecutivo.'); return }
    updateProyecto(proyecto.id, {
      nombre: form.nombre.trim(),
      cliente: form.cliente,
      subcliente: form.subcliente,
      ejecutivo: form.ejecutivo,
      tipo: form.tipo,
      fechaInicio: form.fechaInicio,
      fechaPresentacion: form.fechaPresentacion,
      fechaEntrega: form.fechaEntrega,
      monto: Number(form.monto) || 0,
      prioridad: form.prioridad,
      descripcion: form.descripcion,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-foreground mb-4">Editar proyecto</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label className="text-xs">Nombre del proyecto</Label>
            <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Cliente / Marca</Label>
            <Select value={form.cliente} onValueChange={v => v && setForm(f => ({ ...f, cliente: v, subcliente: '' }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{clientesStore.map(c => <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Contacto / Subcliente</Label>
            <Select value={form.subcliente} onValueChange={v => v && setForm(f => ({ ...f, subcliente: v }))} disabled={!form.cliente}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{subclientesDisponibles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">KAM</Label>
            <Select value={form.ejecutivo} onValueChange={v => v && setForm(f => ({ ...f, ejecutivo: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar KAM..." /></SelectTrigger>
              <SelectContent>{kams.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Tipo de proyecto</Label>
            <Select value={form.tipo} onValueChange={v => v && setForm(f => ({ ...f, tipo: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>{tipos.filter(t => t !== 'Todos').map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Prioridad</Label>
            <Select value={form.prioridad} onValueChange={v => v && setForm(f => ({ ...f, prioridad: v as Proyecto['prioridad'] }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Medio">Medio</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Fecha de inicio</Label>
            <Input type="date" value={form.fechaInicio} onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Fecha de presentación</Label>
            <Input type="date" value={form.fechaPresentacion} onChange={e => setForm(f => ({ ...f, fechaPresentacion: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Fecha de ejecución</Label>
            <Input type="date" value={form.fechaEntrega} onChange={e => setForm(f => ({ ...f, fechaEntrega: e.target.value }))} className="h-9 text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Monto estimado de facturación</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value.replace(/\D/g, '') }))} className="h-9 text-sm pl-7" />
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label className="text-xs">Descripción</Label>
            <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3}
              className="text-sm border border-input rounded-md px-3 py-2 outline-none resize-none" />
          </div>
        </div>
        {error && <p className="text-xs text-red-500 mt-3 font-medium">{error}</p>}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleGuardar} className="bg-blue-600 hover:bg-blue-700 text-white px-8">Guardar cambios</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function ProyectosPage() {
  const { proyectos, clientes, updateProyecto, personasStore } = useStore()
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('Todos')
  const [estado, setEstado] = useState('Todos')
  const [ejecutivo, setEjecutivo] = useState('Todos')
  const [cliente, setCliente] = useState('Todos')
  const [mes, setMes] = useState('Todos')
  const [detalle, setDetalle] = useState<Proyecto | null>(null)
  const [editando, setEditando] = useState<Proyecto | null>(null)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const clientesFiltro = ['Todos', ...clientes.map(c => c.nombre)]
  const kamsFiltro = ['Todos', ...personasStore.filter(p => p.area === 'Comercial').map(p => p.nombre)]

  const filtered = proyectos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.cliente.toLowerCase().includes(search.toLowerCase())
    const matchTipo = tipo === 'Todos' || p.tipo === tipo
    const matchEstado = estado === 'Todos' || p.estadoComercial === estado
    const matchEjecutivo = ejecutivo === 'Todos' || p.ejecutivo === ejecutivo
    const matchCliente = cliente === 'Todos' || p.cliente === cliente
    const matchMes = mes === 'Todos' || mesDeProyecto(p) === mes
    return matchSearch && matchTipo && matchEstado && matchEjecutivo && matchCliente && matchMes
  })

  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    return [...filtered].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if (sortCol === 'nombre')           { va = a.nombre;            vb = b.nombre }
      else if (sortCol === 'cliente')     { va = a.cliente;           vb = b.cliente }
      else if (sortCol === 'tipo')        { va = a.tipo;              vb = b.tipo }
      else if (sortCol === 'ejecutivo')   { va = a.ejecutivo;         vb = b.ejecutivo }
      else if (sortCol === 'fechaPres')   { va = a.fechaPresentacion; vb = b.fechaPresentacion }
      else if (sortCol === 'fechaEjec')   { va = a.fechaEntrega;      vb = b.fechaEntrega }
      else if (sortCol === 'monto')       { va = a.monto;             vb = b.monto }
      else if (sortCol === 'estado')      { va = a.estadoComercial;   vb = b.estadoComercial }
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''), 'es')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir])

  // Si el proyecto abierto fue modificado, sincroniza el panel
  const detalleActual = detalle ? (proyectos.find(p => p.id === detalle.id) ?? null) : null
  const editandoActual = editando ? (proyectos.find(p => p.id === editando.id) ?? null) : null

  return (
    <div className="p-6 flex flex-col gap-5">
      {detalleActual && (
        <DetallePanel
          proyecto={detalleActual}
          onClose={() => setDetalle(null)}
          onEstadoChange={(id, est) => updateProyecto(id, { estadoComercial: est })}
          onCentroCostoChange={(id, cc) => updateProyecto(id, { centroCosto: cc })}
          onVentaRealChange={(id, monto) => updateProyecto(id, { montoRealVendido: monto })}
          onEditar={() => setEditando(detalleActual)}
        />
      )}

      {editandoActual && (
        <EditarProyectoModal
          proyecto={editandoActual}
          onClose={() => setEditando(null)}
          clientesStore={clientes}
          kams={kamsFiltro.filter(k => k !== 'Todos')}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Proyectos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona todos los proyectos de la agencia, sus fechas y estado comercial.
          </p>
        </div>
        <Link href="/proyectos/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Nuevo proyecto
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total proyectos', value: filtered.length, color: 'bg-blue-50 text-blue-600' },
          { label: 'En propuesta', value: filtered.filter(p => p.estadoComercial === 'En propuesta').length, color: 'bg-blue-50 text-blue-600' },
          { label: 'En negociación', value: filtered.filter(p => p.estadoComercial === 'En negociación').length, color: 'bg-amber-50 text-amber-600' },
          { label: 'Vendidos', value: filtered.filter(p => p.estadoComercial === 'Vendido').length, color: 'bg-green-50 text-green-600' },
          { label: 'Perdidos', value: filtered.filter(p => p.estadoComercial === 'Perdido').length, color: 'bg-red-50 text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-border rounded-lg p-4 bg-card flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-2xl font-medium">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={cliente} onValueChange={v => v && setCliente(v)}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <span className="text-muted-foreground text-xs mr-1">Cliente:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{clientesFiltro.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={ejecutivo} onValueChange={v => v && setEjecutivo(v)}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <span className="text-muted-foreground text-xs mr-1">KAM:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{kamsFiltro.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={tipo} onValueChange={v => v && setTipo(v)}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <span className="text-muted-foreground text-xs mr-1">Tipo:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={estado} onValueChange={v => v && setEstado(v)}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <span className="text-muted-foreground text-xs mr-1">Estado:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{estadosFiltro.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={mes} onValueChange={v => v && setMes(v)}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <span className="text-muted-foreground text-xs mr-1">Mes:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{mesesFiltro.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar proyecto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 w-56 text-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {([
                { label: 'Proyecto',          col: 'nombre' },
                { label: 'Cliente / Subcliente', col: 'cliente' },
                { label: 'CC',                col: 'centroCosto' },
                { label: 'Tipo',              col: 'tipo' },
                { label: 'KAM',               col: 'ejecutivo' },
                { label: 'F. Presentación',   col: 'fechaPres' },
                { label: 'F. Ejecución',      col: 'fechaEjec' },
                { label: 'Monto estimado',    col: 'monto' },
                { label: 'Estado',            col: 'estado' },
              ] as { label: string; col: string }[]).map(({ label, col }) => (
                <TableHead key={col} className="text-xs font-medium cursor-pointer select-none"
                  onClick={() => toggleSort(col)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {label}
                    {sortCol === col
                      ? sortDir === 'asc'
                        ? <ChevronUp style={{ width: 12, height: 12, color: '#1A56DB' }} />
                        : <ChevronDown style={{ width: 12, height: 12, color: '#1A56DB' }} />
                      : <ChevronsUpDown style={{ width: 12, height: 12, color: '#D1D5DB' }} />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="text-xs font-medium">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                  No hay proyectos que coincidan con los filtros.
                  {proyectos.length === 0 && <Link href="/proyectos/nuevo" className="ml-2 text-blue-600 underline">Crea el primer proyecto</Link>}
                </TableCell>
              </TableRow>
            ) : sorted.map(p => {
              const logo = clienteLogo(p.cliente, clientes)
              const color = clienteColor(p.cliente, clientes)
              return (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="text-sm font-medium max-w-48">
                    <button className="text-left line-clamp-2 text-blue-600 hover:underline" onClick={() => setDetalle(p)}>
                      {p.nombre}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {logo ? (
                        <img src={logo} alt={p.cliente} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain', background: '#F9FAFB', border: '1px solid #E5E7EB', flexShrink: 0 }} />
                      ) : (
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarFallback className="text-xs font-medium text-white" style={{ backgroundColor: color }}>
                            {clienteIni(p.cliente)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <div className="text-sm">{p.cliente}</div>
                        <div className="text-xs text-muted-foreground">{p.subcliente}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.centroCosto
                      ? <span style={{ padding: '2px 7px', borderRadius: 5, background: '#ECFDF5', color: '#065F46', fontSize: 12, fontWeight: 700, border: '1px solid #BBF7D0' }}>{p.centroCosto}</span>
                      : <span style={{ color: '#D1D5DB', fontSize: 12 }}>—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.tipo || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                          {p.ejecutivo.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{p.ejecutivo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.fechaPresentacion || '—'}</TableCell>
                  <TableCell className="text-sm">{p.fechaEntrega || '—'}</TableCell>
                  <TableCell className="text-sm font-medium">{formatCOP(p.monto)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${estadoConfig[p.estadoComercial] ?? ''}`}>
                      {p.estadoComercial}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setDetalle(p)}>
                        Ver
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetalle(p)}>Ver detalle</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditando(p)}>Editar proyecto</DropdownMenuItem>
                          {(['En propuesta','En negociación','Vendido','Perdido'] as Proyecto['estadoComercial'][]).map(opt => (
                            <DropdownMenuItem key={opt} onClick={() => updateProyecto(p.id, { estadoComercial: opt })}>
                              → {opt}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem className="text-red-600">Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Mostrando {filtered.length} de {proyectos.length} proyectos
      </div>
    </div>
  )
}
