'use client'

import { useState, useMemo } from 'react'
import { Folder, DollarSign, ShoppingCart, XCircle, Target, ChevronLeft, ChevronRight, Search, MoreHorizontal, X, TrendingUp, Pencil, Check, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { Proyecto } from '@/lib/store'

// ─── Helpers ───────────────────────────────────────────────────────────────────
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const PERIODOS = ['Mes', 'Trimestre', 'Semestre', 'Año']

function fmt(n: number) { return `$ ${n.toLocaleString('es-CO')}` }
function fmtK(n: number) {
  if (n >= 1_000_000_000) return `$ ${(n / 1_000_000_000).toFixed(1).replace('.', ',')} B`
  if (n >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
  return fmt(n)
}

// Parsea fecha DD/MM/YYYY o YYYY-MM-DD → { month (0-based), year }
function parseFecha(raw: string): { month: number; year: number } | null {
  if (!raw) return null
  if (raw.includes('/')) {
    const [, m, y] = raw.split('/').map(Number)
    return { month: m - 1, year: y }
  }
  if (raw.includes('-')) {
    const [y, m] = raw.split('-').map(Number)
    return { month: m - 1, year: y }
  }
  return null
}

// Verifica si un proyecto cae dentro del rango (mes cursor + periodo)
function enRango(p: Proyecto, periodo: string, cursorMonth: number, cursorYear: number): boolean {
  const raw = p.fechaPresentacion || p.fechaEntrega || p.fechaInicio
  const f = parseFecha(raw)
  if (!f) return true
  const { month, year } = f
  const pMonth = year * 12 + month
  const cMonth = cursorYear * 12 + cursorMonth

  if (periodo === 'Mes') return pMonth === cMonth
  if (periodo === 'Trimestre') return pMonth >= cMonth && pMonth < cMonth + 3
  if (periodo === 'Semestre') return pMonth >= cMonth && pMonth < cMonth + 6
  return year === cursorYear // Año
}

function periodoLabel(periodo: string, month: number, year: number): string {
  if (periodo === 'Mes') return `${MESES_ES[month]} ${year}`
  if (periodo === 'Trimestre') {
    const end = (month + 2) % 12
    const endY = month + 2 > 11 ? year + 1 : year
    return `${MESES_ES[month]} – ${MESES_ES[end]} ${endY}`
  }
  if (periodo === 'Semestre') {
    const end = (month + 5) % 12
    const endY = month + 5 > 11 ? year + 1 : year
    return `${MESES_ES[month]} – ${MESES_ES[end]} ${endY}`
  }
  return `${year}`
}

function navStep(periodo: string): number {
  if (periodo === 'Mes') return 1
  if (periodo === 'Trimestre') return 3
  if (periodo === 'Semestre') return 6
  return 12
}

const estadoStyle: Record<string, { bg: string; text: string }> = {
  'En propuesta':   { bg: '#EFF6FF', text: '#1D4ED8' },
  'En negociación': { bg: '#FEF3C7', text: '#B45309' },
  'Vendido':        { bg: '#F0FDF4', text: '#15803D' },
  'Perdido':        { bg: '#FEF2F2', text: '#B91C1C' },
}

// ─── Edición inline de número ───────────────────────────────────────────────────
function EditableNumber({ value, enabled, placeholder, onSave, format, color }: {
  value?: number
  enabled: boolean
  placeholder: string
  onSave: (v: number) => void
  format: (v: number) => string
  color?: string
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')

  function startEdit() {
    if (!enabled) return
    setRaw(value != null ? String(value) : '')
    setEditing(true)
  }

  function save() {
    const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
    if (!isNaN(n) && n >= 0) onSave(n)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input autoFocus value={raw} onChange={e => setRaw(e.target.value.replace(/[^0-9.,]/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          style={{ width: 100, height: 28, padding: '0 6px', border: '1px solid #1A56DB', borderRadius: 6, fontSize: 13, outline: 'none', color: '#111827' }} />
        <button onClick={save} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A56DB', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
          <Check style={{ width: 12, height: 12, color: '#fff' }} />
        </button>
      </div>
    )
  }

  if (value != null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontWeight: 600, color: color ?? '#111827', fontSize: 13 }}>{format(value)}</span>
        {enabled && (
          <button onClick={startEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex' }}>
            <Pencil style={{ width: 11, height: 11 }} />
          </button>
        )}
      </div>
    )
  }

  return (
    <button onClick={startEdit} style={{ fontSize: 12, color: enabled ? '#9CA3AF' : '#E5E7EB', background: 'none', border: enabled ? '1px dashed #D1D5DB' : 'none', borderRadius: 5, padding: '2px 8px', cursor: enabled ? 'pointer' : 'default', fontStyle: 'italic' }}>
      {placeholder}
    </button>
  )
}

function CentroCostoCell({ value, onSave }: { value?: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')

  function start() { setRaw(value ?? ''); setEditing(true) }
  function save() { if (raw.trim()) onSave(raw.trim()); setEditing(false) }

  if (editing) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input autoFocus value={raw} onChange={e => setRaw(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
        style={{ width: 72, height: 28, padding: '0 6px', border: '1px solid #1A56DB', borderRadius: 6, fontSize: 13, outline: 'none', color: '#111827', textAlign: 'center', fontWeight: 700, letterSpacing: '0.06em' }} />
      <button onClick={save} style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A56DB', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
        <Check style={{ width: 12, height: 12, color: '#fff' }} />
      </button>
    </div>
  )

  if (value) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ padding: '2px 8px', borderRadius: 5, background: '#ECFDF5', color: '#065F46', fontSize: 12, fontWeight: 700, border: '1px solid #BBF7D0', letterSpacing: '0.06em' }}>{value}</span>
      <button onClick={start} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0, display: 'flex' }}>
        <Pencil style={{ width: 11, height: 11 }} />
      </button>
    </div>
  )

  return (
    <button onClick={start} style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: '1px dashed #D1D5DB', borderRadius: 5, padding: '2px 10px', cursor: 'pointer', fontStyle: 'italic' }}>
      Ingresar
    </button>
  )
}

// ─── Panel detalle ──────────────────────────────────────────────────────────────
function DetallePanel({ p, clientes, onClose }: { p: Proyecto; clientes: { nombre: string; color: string; logo?: string }[]; onClose: () => void }) {
  const cl = clientes.find(c => c.nombre === p.cliente)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 420, height: '100%', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>{p.cliente} · {p.subcliente}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{p.nombre}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', flexShrink: 0, marginTop: 2 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Estado */}
          <div style={{ display: 'inline-flex', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: estadoStyle[p.estadoComercial]?.bg, color: estadoStyle[p.estadoComercial]?.text, alignSelf: 'flex-start' }}>
            {p.estadoComercial}
          </div>

          {/* Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'Tipo', value: p.tipo || '—' },
              { label: 'Ejecutivo', value: p.ejecutivo },
              { label: 'F. Creación', value: p.fechaInicio || '—' },
              { label: 'F. Presentación', value: p.fechaPresentacion || '—' },
              { label: 'F. Ejecución', value: p.fechaEntrega || '—' },
              { label: 'Prioridad', value: p.prioridad },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Monto */}
          <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0' }}>
            <div style={{ fontSize: 12, color: '#15803D', marginBottom: 4 }}>Monto estimado de facturación</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#15803D' }}>{fmt(p.monto)}</div>
          </div>

          {p.descripcion && (
            <div>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Descripción</div>
              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{p.descripcion}</div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={onClose} style={{ width: '100%', height: 38, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function SeguimientoPage() {
  const { proyectos, clientes: clientesStore, updateProyecto, registros, personasStore } = useStore()

  // Costo creatividad por proyecto — Opción B: costoHora dinámico por persona-mes
  // costoHora = costoMensual / totalHorasRegistradasEnEseMes
  // Así el 100% del salario siempre queda imputado a proyectos al cierre del mes
  const costoCreatividadMap = useMemo(() => {
    function horasDiff(ini: string, fin: string) {
      const [sh, sm] = ini.split(':').map(Number)
      const [eh, em] = fin.split(':').map(Number)
      return Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60, 0)
    }

    // 1. Total horas por persona-mes
    const horasPorPersonaMes: Record<string, number> = {}
    registros.forEach(r => {
      const mes = r.fecha.substring(0, 7) // YYYY-MM
      const key = `${r.persona}|${mes}`
      horasPorPersonaMes[key] = (horasPorPersonaMes[key] ?? 0) + horasDiff(r.horaInicio, r.horaFin)
    })

    // 2. Sumar costo real a cada proyecto
    const map: Record<string, number> = {}
    registros.forEach(r => {
      const mes = r.fecha.substring(0, 7)
      const key = `${r.persona}|${mes}`
      const totalHorasMes = horasPorPersonaMes[key] ?? 0
      if (totalHorasMes === 0) return

      const persona = personasStore.find(p => p.nombre === r.persona)
      if (!persona) return

      const costoHora = persona.costoMensual / totalHorasMes
      const horas = horasDiff(r.horaInicio, r.horaFin)
      map[r.proyectoId] = (map[r.proyectoId] ?? 0) + costoHora * horas
    })

    return map
  }, [registros, personasStore])

  const today = new Date()
  const [periodo, setPeriodo] = useState('Año')
  const [cursorMonth, setCursorMonth] = useState(today.getMonth())
  const [cursorYear, setCursorYear] = useState(today.getFullYear())
  const [cliente, setCliente] = useState('Todos')
  const [ejecutivo, setEjecutivo] = useState('Todos')
  const [estado, setEstado] = useState('Todos')
  const [search, setSearch] = useState('')
  const [detalle, setDetalle] = useState<Proyecto | null>(null)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const clientesFiltro = ['Todos', ...clientesStore.map(c => c.nombre)]
  const ejecutivosFiltro = ['Todos', ...personasStore.filter(p => p.area === 'Comercial').map(p => p.nombre)]
  const estadosFiltro = ['Todos', 'En propuesta', 'En negociación', 'Vendido', 'Perdido']

  function navPeriodo(dir: 1 | -1) {
    const step = navStep(periodo)
    let m = cursorMonth + dir * step
    let y = cursorYear
    while (m < 0) { m += 12; y-- }
    while (m > 11) { m -= 12; y++ }
    setCursorMonth(m)
    setCursorYear(y)
  }

  const filtered = proyectos.filter(p => {
    const ms = p.nombre.toLowerCase().includes(search.toLowerCase()) || p.cliente.toLowerCase().includes(search.toLowerCase())
    const mc = cliente === 'Todos' || p.cliente === cliente
    const me = ejecutivo === 'Todos' || p.ejecutivo === ejecutivo
    const mst = estado === 'Todos' || p.estadoComercial === estado
    const mr = enRango(p, periodo, cursorMonth, cursorYear)
    return ms && mc && me && mst && mr
  })

  // KPIs calculados
  const vendidos = filtered.filter(p => p.estadoComercial === 'Vendido')
  const perdidos = filtered.filter(p => p.estadoComercial === 'Perdido')
  const valorEstimado = filtered.reduce((s, p) => s + p.monto, 0)
  const valorVendido = vendidos.reduce((s, p) => s + p.monto, 0)
  const tasaCierre = filtered.length > 0 ? (vendidos.length / filtered.length) * 100 : 0

  const kpis = [
    { label: 'Proyectos en período', value: filtered.length.toString(), Icon: Folder, bg: '#EFF6FF', ic: '#1A56DB' },
    { label: 'Valor estimado total', value: fmtK(valorEstimado), Icon: DollarSign, bg: '#F5F3FF', ic: '#7C3AED' },
    { label: 'Proyectos vendidos', value: vendidos.length.toString(), Icon: ShoppingCart, bg: '#F0FDF4', ic: '#16A34A' },
    { label: 'Valor vendido real', value: fmtK(vendidos.reduce((s, p) => s + (p.montoRealVendido ?? 0), 0)), Icon: TrendingUp, bg: '#ECFDF5', ic: '#0D9488' },
    { label: 'Proyectos perdidos', value: perdidos.length.toString(), Icon: XCircle, bg: '#FFF7ED', ic: '#EA580C' },
    { label: 'Tasa de cierre', value: `${tasaCierre.toFixed(1).replace('.', ',')}%`, Icon: Target, bg: '#EFF6FF', ic: '#2563EB' },
  ]

  const sorted = useMemo(() => {
    if (!sortCol) return filtered
    return [...filtered].sort((a, b) => {
      let va: string | number = ''
      let vb: string | number = ''
      if      (sortCol === 'cliente')   { va = a.cliente;           vb = b.cliente }
      else if (sortCol === 'nombre')    { va = a.nombre;            vb = b.nombre }
      else if (sortCol === 'ejecutivo') { va = a.ejecutivo;         vb = b.ejecutivo }
      else if (sortCol === 'fechaPres') { va = a.fechaPresentacion; vb = b.fechaPresentacion }
      else if (sortCol === 'fechaEjec') { va = a.fechaEntrega;      vb = b.fechaEntrega }
      else if (sortCol === 'estado')    { va = a.estadoComercial;   vb = b.estadoComercial }
      else if (sortCol === 'monto')     { va = a.monto;             vb = b.monto }
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortCol, sortDir])

  const detalleActual = detalle ? (proyectos.find(p => p.id === detalle.id) ?? null) : null

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {detalleActual && (
        <DetallePanel p={detalleActual} clientes={clientesStore} onClose={() => setDetalle(null)} />
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Seguimiento de proyectos</h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4, margin: '4px 0 0' }}>
          Monitorea el estado comercial de cada proyecto y cruza esta información con la rentabilidad.
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        {/* Periodo tabs */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Ver por periodo</div>
          <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden' }}>
            {PERIODOS.map((p, i) => (
              <button key={p} onClick={() => setPeriodo(p)}
                style={{ padding: '5px 14px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                  borderRight: i < PERIODOS.length - 1 ? '1px solid #E5E7EB' : 'none',
                  background: periodo === p ? '#1A56DB' : '#fff',
                  color: periodo === p ? '#fff' : '#374151' }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Navegador de fecha */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>&nbsp;</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 34, border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            <button onClick={() => navPeriodo(-1)} style={{ width: 30, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRight: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', color: '#6B7280' }}>
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: 500, padding: '0 10px', whiteSpace: 'nowrap', minWidth: 140, textAlign: 'center' }}>
              {periodoLabel(periodo, cursorMonth, cursorYear)}
            </span>
            <button onClick={() => navPeriodo(1)} style={{ width: 30, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderLeft: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', color: '#6B7280' }}>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>

        <div style={{ width: 1, height: 34, background: '#E5E7EB' }} />

        {/* Filtros */}
        {[
          { label: 'Cliente', value: cliente, set: setCliente, opts: clientesFiltro },
          { label: 'Ejecutivo', value: ejecutivo, set: setEjecutivo, opts: ejecutivosFiltro },
          { label: 'Estado', value: estado, set: setEstado, opts: estadosFiltro },
        ].map(({ label, value, set, opts }) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{label}</div>
            <div style={{ position: 'relative' }}>
              <select value={value} onChange={e => set(e.target.value)}
                style={{ height: 34, padding: '0 28px 0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none', appearance: 'none', minWidth: 120,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center' }}>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        ))}

        {/* Search */}
        <div style={{ marginLeft: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>&nbsp;</div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
            <input placeholder="Buscar proyecto..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ height: 34, paddingLeft: 30, paddingRight: 12, width: 192, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
        {kpis.map(({ label, value, Icon, bg, ic }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ width: 19, height: 19, color: ic }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: value.startsWith('$') ? 16 : 24, fontWeight: 700, color: '#111827', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1300 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {([
                  { label: 'Cliente',              col: 'cliente' },
                  { label: 'Proyecto',             col: 'nombre' },
                  { label: 'KAM',                  col: 'ejecutivo' },
                  { label: 'F. Presentación',      col: 'fechaPres' },
                  { label: 'F. Ejecución',         col: 'fechaEjec' },
                  { label: 'Estado',               col: 'estado' },
                  { label: 'Monto estimado',       col: 'monto' },
                ] as { label: string; col: string }[]).map(({ label, col }) => (
                  <th key={col} onClick={() => toggleSort(col)}
                    style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {label}
                      {sortCol === col
                        ? sortDir === 'asc'
                          ? <ChevronUp style={{ width: 12, height: 12, color: '#1A56DB' }} />
                          : <ChevronDown style={{ width: 12, height: 12, color: '#1A56DB' }} />
                        : <ChevronsUpDown style={{ width: 12, height: 12, color: '#D1D5DB' }} />}
                    </span>
                  </th>
                ))}
                {['Centro costos', 'Monto real vendido', 'Costo creatividad', 'Rent. producción %', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>
                    No hay proyectos en este período con los filtros seleccionados.
                  </td>
                </tr>
              ) : sorted.map((p, i) => {
                const est = estadoStyle[p.estadoComercial] ?? { bg: '#F3F4F6', text: '#6B7280' }
                const isLast = i === filtered.length - 1
                const td = { padding: '12px 14px', fontSize: 13, color: '#374151', borderBottom: isLast ? 'none' : '1px solid #F3F4F6', verticalAlign: 'middle' as const }
                const cl = clientesStore.find(c => c.nombre === p.cliente)
                const isVendido = p.estadoComercial === 'Vendido'
                return (
                  <tr key={p.id} onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')} style={{ background: '#fff', transition: 'background 0.1s' }}>
                    {/* Cliente */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {cl?.logo ? (
                          <img src={cl.logo} alt={p.cliente} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain', background: '#F9FAFB', border: '1px solid #E5E7EB' }} />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: cl?.color ?? '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>{p.cliente.split(' ').slice(0,2).map(w=>w[0]).join('')}</span>
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 500, color: '#111827', fontSize: 13 }}>{p.cliente}</div>
                          {p.subcliente && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{p.subcliente}</div>}
                        </div>
                      </div>
                    </td>
                    {/* Proyecto */}
                    <td style={{ ...td, maxWidth: 180 }}>
                      <button onClick={() => setDetalle(p)} style={{ fontWeight: 500, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                        {p.nombre}
                      </button>
                    </td>
                    {/* Ejecutivo */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: '#1D4ED8' }}>{p.ejecutivo.split(' ').map(n=>n[0]).join('').slice(0,2)}</span>
                        </div>
                        <span style={{ fontSize: 13 }}>{p.ejecutivo}</span>
                      </div>
                    </td>
                    <td style={{ ...td, color: '#6B7280' }}>{p.fechaPresentacion || '—'}</td>
                    <td style={{ ...td, color: '#6B7280' }}>{p.fechaEntrega || '—'}</td>
                    {/* Estado */}
                    <td style={td}>
                      <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: est.bg, color: est.text, whiteSpace: 'nowrap' }}>
                        {p.estadoComercial}
                      </span>
                    </td>
                    {/* Monto estimado */}
                    <td style={{ ...td, fontWeight: 600 }}>{fmt(p.monto)}</td>
                    {/* Centro de costos — editable siempre */}
                    <td style={td}>
                      <CentroCostoCell value={p.centroCosto} onSave={v => updateProyecto(p.id, { centroCosto: v })} />
                    </td>
                    {/* Monto real vendido — editable solo si Vendido */}
                    <td style={td}>
                      <EditableNumber
                        value={p.montoRealVendido}
                        enabled={isVendido}
                        placeholder={isVendido ? 'Ingresar...' : '—'}
                        onSave={v => updateProyecto(p.id, { montoRealVendido: v })}
                        format={fmt}
                        color="#15803D"
                      />
                    </td>
                    {/* Costo creatividad — calculado en tiempo real desde registros del Calendar */}
                    {(() => {
                      const costo = costoCreatividadMap[p.id]
                      return (
                        <td style={{ ...td, color: costo ? '#374151' : '#D1D5DB', fontStyle: costo ? 'normal' : 'italic', fontSize: 12 }}>
                          {costo ? fmt(Math.round(costo)) : 'Sin registros'}
                        </td>
                      )
                    })()}
                    {/* Rentabilidad producción — editable siempre */}
                    <td style={td}>
                      <EditableNumber
                        value={p.rentabilidadProduccion}
                        enabled={true}
                        placeholder="Ingresar %"
                        onSave={v => updateProyecto(p.id, { rentabilidadProduccion: v })}
                        format={v => `${v.toFixed(1).replace('.', ',')}%`}
                        color={p.rentabilidadProduccion && p.rentabilidadProduccion >= 30 ? '#15803D' : '#B45309'}
                      />
                    </td>
                    {/* Acción */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <button onClick={() => setDetalle(p)} style={{ fontSize: 13, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: '2px 6px' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                          Ver
                        </button>
                        <button style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                          <MoreHorizontal style={{ width: 15, height: 15 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Mostrando {filtered.length} de {proyectos.length} proyectos</span>
        </div>
      </div>
    </div>
  )
}
