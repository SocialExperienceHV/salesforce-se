'use client'

import { useMemo, useState } from 'react'
import { Target, DollarSign, TrendingUp, Percent, Users, Pencil, X, ChevronUp, ChevronDown, ChevronsUpDown, Archive, Search, RotateCcw, Gauge } from 'lucide-react'
import { useStore } from '@/lib/store'
import type { Proyecto, MetaComercial, MetaKam, Cliente } from '@/lib/store'

// ─── Helpers ───────────────────────────────────────────────────────────────────
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmt(n: number) { return `$ ${Math.round(n).toLocaleString('es-CO')}` }
function fmtK(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
  return fmt(n)
}
function pctStr(n: number | null) {
  if (n == null) return '—'
  return `${n.toFixed(1).replace('.', ',')}%`
}
function colorCumplimiento(p: number | null): string {
  if (p == null) return '#9CA3AF'
  if (p >= 100) return '#15803D'
  if (p >= 70) return '#B45309'
  return '#B91C1C'
}
function sumMeses(meses: Record<string, number> | undefined): number {
  if (!meses) return 0
  return Object.values(meses).reduce((s, v) => s + (v || 0), 0)
}
// Suma solo los meses 1..hasta (para comparar lo acumulado a la fecha, no el año completo)
function sumMesesHasta(meses: Record<string, number> | undefined, hasta: number): number {
  if (!meses || hasta <= 0) return 0
  let s = 0
  for (let i = 1; i <= hasta; i++) s += meses[String(i)] ?? 0
  return s
}

// Fecha de venta de un proyecto — mismo criterio que Seguimiento de Proyectos
// (fechaPresentacion → fechaEntrega → fechaInicio), para que el mes/año en el que
// se contabiliza la venta real sea siempre consistente entre los dos módulos.
function fechaVenta(p: Proyecto): { mes: number; anio: number } | null {
  const raw = p.fechaPresentacion || p.fechaEntrega || p.fechaInicio
  if (!raw) return null
  if (raw.includes('/')) {
    const [, m, y] = raw.split('/').map(Number)
    if (!m || !y) return null
    return { mes: m, anio: y }
  }
  if (raw.includes('-')) {
    const [y, m] = raw.split('-').map(Number)
    if (!m || !y) return null
    return { mes: m, anio: y }
  }
  return null
}

// ─── Modal: editor de meta (cliente o global) — 12 meses + reparto rápido ──────
function MetaEditorModal({ titulo, subtitulo, valores, onSave, onClose }: {
  titulo: string
  subtitulo: string
  valores: Record<string, number>
  onSave: (meses: Record<string, number>) => void
  onClose: () => void
}) {
  const [meses, setMeses] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (let i = 1; i <= 12; i++) init[String(i)] = valores[String(i)] ?? 0
    return init
  })
  const [distribuir, setDistribuir] = useState('')

  const total = Object.values(meses).reduce((s, v) => s + (v || 0), 0)

  function aplicarDistribucion() {
    const anual = parseFloat(distribuir.replace(/\./g, '').replace(',', '.'))
    if (isNaN(anual) || anual < 0) return
    const base = Math.floor(anual / 12)
    const resto = anual - base * 12
    const next: Record<string, number> = {}
    for (let i = 1; i <= 12; i++) next[String(i)] = i === 12 ? base + resto : base
    setMeses(next)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 480, maxHeight: '86vh', background: '#fff', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{titulo}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{subtitulo}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', marginTop: 2 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ padding: '18px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: 12, color: '#6B7280', flexShrink: 0 }}>Repartir total anual:</span>
            <input value={distribuir} onChange={e => setDistribuir(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="Ej: 120.000.000"
              style={{ flex: 1, height: 30, padding: '0 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, outline: 'none', color: '#111827' }} />
            <button onClick={aplicarDistribucion} style={{ height: 30, padding: '0 12px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Aplicar
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {MESES_ES.map((nombre, i) => {
              const key = String(i + 1)
              return (
                <div key={key}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 3 }}>{nombre}</div>
                  <input
                    value={meses[key] ? meses[key].toLocaleString('es-CO') : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
                      setMeses(prev => ({ ...prev, [key]: raw ? parseInt(raw, 10) : 0 }))
                    }}
                    placeholder="0"
                    style={{ width: '100%', height: 34, padding: '0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, outline: 'none', color: '#111827' }}
                  />
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#EFF6FF', borderRadius: 10 }}>
            <span style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 500 }}>Total anual</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1D4ED8' }}>{fmt(total)}</span>
          </div>
        </div>

        <div style={{ padding: '16px 22px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onSave(meses)} style={{ flex: 1, height: 40, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: '#1A56DB', cursor: 'pointer' }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: clientes inactivos para proyección (buscar y reactivar) ───────────
function ClientesInactivosModal({ clientes, onReactivar, onClose }: {
  clientes: Cliente[]
  onReactivar: (id: string) => void
  onClose: () => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 460, maxHeight: '80vh', background: '#fff', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Clientes inactivos para proyección</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>No aparecen en el listado principal de este módulo. Reactívalos si vuelven a aplicar.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', marginTop: 2, flexShrink: 0 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ padding: '14px 22px 0' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar cliente..." autoFocus
              style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none', color: '#111827' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>
              {clientes.length === 0 ? 'No hay clientes inactivos.' : 'Sin resultados para tu búsqueda.'}
            </div>
          ) : filtrados.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 10px', border: '1px solid #F3F4F6', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>{c.iniciales}</span>
                </div>
                <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nombre}</span>
              </div>
              <button onClick={() => onReactivar(c.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}>
                <RotateCcw style={{ width: 11, height: 11 }} />
                Reactivar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Gráfico de barras mensual (proyección vs venta real) ──────────────────────
function GraficoMensual({ datos }: { datos: { mes: number; proyeccion: number; ventaReal: number; pct: number | null }[] }) {
  const max = Math.max(1, ...datos.map(d => Math.max(d.proyeccion, d.ventaReal)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px' }}>
      {datos.map(d => (
        <div key={d.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <div style={{ width: '100%', height: 110, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
            <div title={`Proyección: ${fmt(d.proyeccion)}`} style={{ width: '38%', height: `${(d.proyeccion / max) * 100}%`, background: '#DBEAFE', borderRadius: '3px 3px 0 0', minHeight: d.proyeccion > 0 ? 2 : 0 }} />
            <div title={`Venta real: ${fmt(d.ventaReal)}`} style={{ width: '38%', height: `${(d.ventaReal / max) * 100}%`, background: d.pct != null && d.pct >= 100 ? '#16A34A' : '#1A56DB', borderRadius: '3px 3px 0 0', minHeight: d.ventaReal > 0 ? 2 : 0 }} />
          </div>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{MESES_CORTO[d.mes - 1]}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardComercialPage() {
  const {
    proyectos: proyectosStore, clientes: clientesStore, updateCliente, personasStore,
    metasComerciales, upsertMetaComercial, metasGlobales, upsertMetaGlobal,
    metasKam, upsertMetaKam,
  } = useStore()
  // Igual que Proyectos y Seguimiento: los "OT" de re-numeración no cuentan aquí.
  const proyectos = useMemo(() => proyectosStore.filter(p => !p.excluirDeReportes), [proyectosStore])

  const today = new Date()
  const anios = useMemo(() => {
    const set = new Set<number>([today.getFullYear()])
    proyectos.forEach(p => { const f = fechaVenta(p); if (f) set.add(f.anio) })
    metasComerciales.forEach(m => set.add(m.anio))
    metasGlobales.forEach(m => set.add(m.anio))
    metasKam.forEach(m => set.add(m.anio))
    return Array.from(set).sort((a, b) => b - a)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectos, metasComerciales, metasGlobales, metasKam])

  const [anio, setAnio] = useState(today.getFullYear())
  const [mes, setMes] = useState('Todos')
  const [kam, setKam] = useState('Todos')
  const [clienteFiltro, setClienteFiltro] = useState('Todos')
  const [editCliente, setEditCliente] = useState<string | null>(null)
  const [editGlobal, setEditGlobal] = useState(false)
  const [editKam, setEditKam] = useState<string | null>(null)
  const [showInactivos, setShowInactivos] = useState(false)
  const [sortCol, setSortCol] = useState<string | null>('proyeccion')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [sortColKam, setSortColKam] = useState<string | null>('ventaReal')
  const [sortDirKam, setSortDirKam] = useState<'asc' | 'desc'>('desc')

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  function toggleSortKam(col: string) {
    if (sortColKam === col) setSortDirKam(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortColKam(col); setSortDirKam('desc') }
  }

  const kamsFiltro = ['Todos', ...personasStore.filter(p => p.area === 'Comercial').map(p => p.nombre)]
  const clientesFiltroOpts = ['Todos', ...clientesStore.filter(c => !c.inactivoComercial).map(c => c.nombre)]
  const mesesFiltro = ['Todos', ...MESES_ES]
  const clientesInactivos = useMemo(() => clientesStore.filter(c => c.inactivoComercial), [clientesStore])

  const mesKey = mes === 'Todos' ? null : String(MESES_ES.indexOf(mes) + 1)

  // Mes hasta el cual comparar "lo que debería llevar acumulado a la fecha" —
  // usa el mes calendario real de hoy, no el filtro de Mes (ese es para ver un
  // mes puntual; esto es "cómo vamos respecto a hoy", independiente del filtro).
  const mesRitmo = anio < today.getFullYear() ? 12 : anio > today.getFullYear() ? 0 : today.getMonth() + 1
  const mesRitmoLabel = mesRitmo >= 1 && mesRitmo <= 12 ? MESES_CORTO[mesRitmo - 1] : null

  // Venta real (proyectos Vendidos) por cliente y mes, del año seleccionado —
  // se alimenta automáticamente de Seguimiento de Proyectos, nunca se edita aquí.
  const ventaPorClienteMes = useMemo(() => {
    const map = new Map<string, Record<string, number>>()
    proyectos.forEach(p => {
      if (p.estadoComercial !== 'Vendido') return
      const f = fechaVenta(p)
      if (!f || f.anio !== anio) return
      const cur = map.get(p.cliente) ?? {}
      const key = String(f.mes)
      cur[key] = (cur[key] ?? 0) + (p.montoRealVendido ?? 0)
      map.set(p.cliente, cur)
    })
    return map
  }, [proyectos, anio])

  const metaPorCliente = useMemo(() => {
    const map = new Map<string, MetaComercial>()
    metasComerciales.filter(m => m.anio === anio).forEach(m => map.set(m.cliente, m))
    return map
  }, [metasComerciales, anio])

  const metaGlobalActual = metasGlobales.find(m => m.anio === anio)
  const metaGlobalValor = mesKey ? (metaGlobalActual?.meses[mesKey] ?? 0) : sumMeses(metaGlobalActual?.meses)

  const clientesFiltrados = useMemo(() => {
    return clientesStore.filter(c => {
      if (c.estado !== 'Activo') return false
      if (c.inactivoComercial) return false
      if (kam !== 'Todos' && c.ejecutivo !== kam) return false
      if (clienteFiltro !== 'Todos' && c.nombre !== clienteFiltro) return false
      return true
    })
  }, [clientesStore, kam, clienteFiltro])

  const filas = useMemo(() => {
    return clientesFiltrados.map(c => {
      const meta = metaPorCliente.get(c.nombre)
      const ventaMeses = ventaPorClienteMes.get(c.nombre)
      const proyeccion = mesKey ? (meta?.meses[mesKey] ?? 0) : sumMeses(meta?.meses)
      const ventaReal = mesKey ? (ventaMeses?.[mesKey] ?? 0) : sumMeses(ventaMeses)
      const pctCliente = proyeccion > 0 ? (ventaReal / proyeccion) * 100 : null
      const pctGlobal = metaGlobalValor > 0 ? (ventaReal / metaGlobalValor) * 100 : null
      // Ritmo: lo vendido hasta hoy vs. lo que debería llevar acumulado a la
      // fecha según la meta mensual (no el año completo dividido en 12).
      const metaHastaHoy = sumMesesHasta(meta?.meses, mesRitmo)
      const ventaHastaHoy = sumMesesHasta(ventaMeses, mesRitmo)
      const pctRitmo = metaHastaHoy > 0 ? (ventaHastaHoy / metaHastaHoy) * 100 : null
      return { cliente: c, proyeccion, ventaReal, pctCliente, pctGlobal, ventaHastaHoy, pctRitmo }
    })
  }, [clientesFiltrados, metaPorCliente, ventaPorClienteMes, mesKey, metaGlobalValor, mesRitmo])

  const filasOrdenadas = useMemo(() => {
    if (!sortCol) return filas
    return [...filas].sort((a, b) => {
      let va: string | number = 0
      let vb: string | number = 0
      if      (sortCol === 'cliente')     { va = a.cliente.nombre;    vb = b.cliente.nombre }
      else if (sortCol === 'kam')         { va = a.cliente.ejecutivo; vb = b.cliente.ejecutivo }
      else if (sortCol === 'proyeccion')  { va = a.proyeccion;        vb = b.proyeccion }
      else if (sortCol === 'ventaReal')   { va = a.ventaReal;         vb = b.ventaReal }
      else if (sortCol === 'pctCliente')  { va = a.pctCliente ?? -1;  vb = b.pctCliente ?? -1 }
      else if (sortCol === 'pctGlobal')   { va = a.pctGlobal ?? -1;   vb = b.pctGlobal ?? -1 }
      else if (sortCol === 'pctRitmo')    { va = a.pctRitmo ?? -1;    vb = b.pctRitmo ?? -1 }
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filas, sortCol, sortDir])

  const metaPorKam = useMemo(() => {
    const map = new Map<string, MetaKam>()
    metasKam.filter(m => m.anio === anio).forEach(m => map.set(m.kam, m))
    return map
  }, [metasKam, anio])

  // Cumplimiento por KAM — meta propia del KAM (independiente de sus clientes,
  // igual que la meta global), cruzada contra la suma de venta real de las
  // cuentas que tiene asignadas dentro del filtro actual.
  const filasKam = useMemo(() => {
    const nombresKam = kam === 'Todos'
      ? Array.from(new Set(personasStore.filter(p => p.area === 'Comercial').map(p => p.nombre)))
      : [kam]
    return nombresKam.map(nombreKam => {
      const clientesDelKam = filas.filter(f => f.cliente.ejecutivo === nombreKam)
      const ventaReal = clientesDelKam.reduce((s, f) => s + f.ventaReal, 0)
      const meta = metaPorKam.get(nombreKam)
      const proyeccion = mesKey ? (meta?.meses[mesKey] ?? 0) : sumMeses(meta?.meses)
      const pctKam = proyeccion > 0 ? (ventaReal / proyeccion) * 100 : null
      const pctGlobal = metaGlobalValor > 0 ? (ventaReal / metaGlobalValor) * 100 : null
      const metaHastaHoy = sumMesesHasta(meta?.meses, mesRitmo)
      const ventaHastaHoy = clientesDelKam.reduce((s, f) => s + f.ventaHastaHoy, 0)
      const pctRitmo = metaHastaHoy > 0 ? (ventaHastaHoy / metaHastaHoy) * 100 : null
      return { kam: nombreKam, numClientes: clientesDelKam.length, proyeccion, ventaReal, pctKam, pctGlobal, pctRitmo }
    })
  }, [kam, personasStore, filas, metaPorKam, mesKey, metaGlobalValor, mesRitmo])

  const filasKamOrdenadas = useMemo(() => {
    if (!sortColKam) return filasKam
    return [...filasKam].sort((a, b) => {
      let va: string | number = 0
      let vb: string | number = 0
      if      (sortColKam === 'kam')         { va = a.kam;            vb = b.kam }
      else if (sortColKam === 'proyeccion')  { va = a.proyeccion;     vb = b.proyeccion }
      else if (sortColKam === 'ventaReal')   { va = a.ventaReal;      vb = b.ventaReal }
      else if (sortColKam === 'pctKam')      { va = a.pctKam ?? -1;   vb = b.pctKam ?? -1 }
      else if (sortColKam === 'pctGlobal')   { va = a.pctGlobal ?? -1; vb = b.pctGlobal ?? -1 }
      else if (sortColKam === 'pctRitmo')    { va = a.pctRitmo ?? -1;  vb = b.pctRitmo ?? -1 }
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
      return sortDirKam === 'asc' ? cmp : -cmp
    })
  }, [filasKam, sortColKam, sortDirKam])

  const proyeccionTotal = filas.reduce((s, f) => s + f.proyeccion, 0)
  const ventaRealTotal = filas.reduce((s, f) => s + f.ventaReal, 0)
  const pctCumplimientoGlobal = metaGlobalValor > 0 ? (ventaRealTotal / metaGlobalValor) * 100 : null
  const clientesConVenta = filas.filter(f => f.ventaReal > 0).length

  // Ritmo global: lo vendido hasta hoy (de todos los clientes filtrados) vs. lo
  // que la meta global dice que deberíamos llevar acumulado a esta fecha.
  const metaGlobalHastaHoy = sumMesesHasta(metaGlobalActual?.meses, mesRitmo)
  const ventaHastaHoyTotal = filas.reduce((s, f) => s + f.ventaHastaHoy, 0)
  const pctRitmoGlobal = metaGlobalHastaHoy > 0 ? (ventaHastaHoyTotal / metaGlobalHastaHoy) * 100 : null

  const vistaMensual = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const key = String(m)
      let proyeccionMes = 0
      let ventaMes = 0
      clientesFiltrados.forEach(c => {
        proyeccionMes += metaPorCliente.get(c.nombre)?.meses[key] ?? 0
        ventaMes += ventaPorClienteMes.get(c.nombre)?.[key] ?? 0
      })
      const pctMes = proyeccionMes > 0 ? (ventaMes / proyeccionMes) * 100 : null
      return { mes: m, proyeccion: proyeccionMes, ventaReal: ventaMes, pct: pctMes }
    })
  }, [clientesFiltrados, metaPorCliente, ventaPorClienteMes])

  const kpis = [
    { label: 'Meta global', value: fmtK(metaGlobalValor), Icon: Target, bg: '#F5F3FF', ic: '#7C3AED' },
    { label: 'Proyección total', value: fmtK(proyeccionTotal), Icon: DollarSign, bg: '#EFF6FF', ic: '#1A56DB' },
    { label: 'Venta real total', value: fmtK(ventaRealTotal), Icon: TrendingUp, bg: '#ECFDF5', ic: '#0D9488' },
    { label: '% Cumplimiento global', value: pctStr(pctCumplimientoGlobal), Icon: Percent, bg: '#F0FDF4', ic: '#16A34A' },
    { label: `% Ritmo del año${mesRitmoLabel ? ` (a ${mesRitmoLabel})` : ''}`, value: pctStr(pctRitmoGlobal), Icon: Gauge, bg: '#FFFBEB', ic: '#D97706' },
    { label: 'Clientes con venta', value: `${clientesConVenta} / ${filas.length}`, Icon: Users, bg: '#FFF7ED', ic: '#EA580C' },
  ]

  const selectStyle = (width: number): React.CSSProperties => ({
    height: 32, width, flexShrink: 0, padding: '0 24px 0 8px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 12, color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  })

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {editCliente && (
        <MetaEditorModal
          titulo={`Meta comercial · ${editCliente}`}
          subtitulo={`Proyección mensual de venta · ${anio}`}
          valores={metaPorCliente.get(editCliente)?.meses ?? {}}
          onSave={meses => { upsertMetaComercial(editCliente, anio, meses); setEditCliente(null) }}
          onClose={() => setEditCliente(null)}
        />
      )}
      {editGlobal && (
        <MetaEditorModal
          titulo="Meta global de la agencia"
          subtitulo={`Proyección mensual · ${anio}`}
          valores={metaGlobalActual?.meses ?? {}}
          onSave={meses => { upsertMetaGlobal(anio, meses); setEditGlobal(false) }}
          onClose={() => setEditGlobal(false)}
        />
      )}
      {editKam && (
        <MetaEditorModal
          titulo={`Meta comercial · ${editKam}`}
          subtitulo={`Cuota mensual del KAM · ${anio}`}
          valores={metaPorKam.get(editKam)?.meses ?? {}}
          onSave={meses => { upsertMetaKam(editKam, anio, meses); setEditKam(null) }}
          onClose={() => setEditKam(null)}
        />
      )}
      {showInactivos && (
        <ClientesInactivosModal
          clientes={clientesInactivos}
          onReactivar={id => updateCliente(id, { inactivoComercial: false })}
          onClose={() => setShowInactivos(false)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Dashboard Comercial</h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4, margin: '4px 0 0' }}>
            Cumplimiento de metas comerciales por cliente y KAM, frente a la venta real de Seguimiento de Proyectos.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setShowInactivos(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: '#fff', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Archive style={{ width: 14, height: 14 }} />
            Clientes inactivos ({clientesInactivos.length})
          </button>
          <button onClick={() => setEditGlobal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Target style={{ width: 14, height: 14 }} />
            Editar meta global
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', overflowX: 'auto' }}>
        <select value={anio} onChange={e => setAnio(parseInt(e.target.value, 10))} title="Año" style={selectStyle(90)}>
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {[
          { label: 'Mes', value: mes, set: setMes, opts: mesesFiltro, width: 130 },
          { label: 'KAM', value: kam, set: setKam, opts: kamsFiltro, width: 140 },
          { label: 'Cliente', value: clienteFiltro, set: setClienteFiltro, opts: clientesFiltroOpts, width: 150 },
        ].map(({ label, value, set, opts, width }) => (
          <select key={label} value={value} onChange={e => set(e.target.value)} title={label} style={selectStyle(width)}>
            {opts.map(o => <option key={o} value={o}>{label}: {o}</option>)}
          </select>
        ))}
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
              <div style={{ fontSize: value.startsWith('$') ? 16 : 22, fontWeight: 700, color: '#111827', lineHeight: 1.1, whiteSpace: 'nowrap' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cumplimiento por KAM */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Cumplimiento por KAM</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 4 }}>Cuota propia de cada KAM frente a la venta real de sus cuentas.</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {([
                  { label: 'KAM',                        col: 'kam' },
                  { label: 'Clientes' },
                  { label: 'Meta KAM',                   col: 'proyeccion' },
                  { label: 'Venta real',                 col: 'ventaReal' },
                  { label: '% Cumpl. KAM',                col: 'pctKam' },
                  { label: '% Cumpl. global',             col: 'pctGlobal' },
                  { label: `% Ritmo${mesRitmoLabel ? ` (a ${mesRitmoLabel})` : ''}`, col: 'pctRitmo', title: 'Compara lo vendido hasta hoy contra lo que debería llevar acumulado a esta fecha, según la meta mensual.' },
                  { label: 'Acción' },
                ] as { label: string; col?: string; title?: string }[]).map(({ label, col, title }) => (
                  <th key={label} onClick={col ? () => toggleSortKam(col) : undefined} title={title}
                    style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', whiteSpace: 'nowrap', cursor: col ? 'pointer' : 'default', userSelect: 'none' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {label}
                      {col && (sortColKam === col
                        ? sortDirKam === 'asc'
                          ? <ChevronUp style={{ width: 12, height: 12, color: '#1A56DB' }} />
                          : <ChevronDown style={{ width: 12, height: 12, color: '#1A56DB' }} />
                        : <ChevronsUpDown style={{ width: 12, height: 12, color: '#D1D5DB' }} />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasKamOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>
                    No hay KAM con los filtros seleccionados.
                  </td>
                </tr>
              ) : filasKamOrdenadas.map((k, i) => {
                const isLast = i === filasKamOrdenadas.length - 1
                const td = { padding: '12px 14px', fontSize: 13, color: '#374151', borderBottom: isLast ? 'none' : '1px solid #F3F4F6', verticalAlign: 'middle' as const }
                return (
                  <tr key={k.kam} onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')} style={{ background: '#fff', transition: 'background 0.1s' }}>
                    {/* KAM */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#1D4ED8' }}>{k.kam.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                        </div>
                        <span style={{ fontWeight: 500, color: '#111827', fontSize: 13 }}>{k.kam}</span>
                      </div>
                    </td>
                    {/* Clientes */}
                    <td style={{ ...td, color: '#6B7280' }}>{k.numClientes}</td>
                    {/* Meta KAM */}
                    <td style={{ ...td, fontWeight: 600, color: k.proyeccion > 0 ? '#111827' : '#D1D5DB', fontStyle: k.proyeccion > 0 ? 'normal' : 'italic' }}>
                      {k.proyeccion > 0 ? fmt(k.proyeccion) : 'Sin meta'}
                    </td>
                    {/* Venta real */}
                    <td style={{ ...td, fontWeight: 600, color: k.ventaReal > 0 ? '#15803D' : '#D1D5DB', fontStyle: k.ventaReal > 0 ? 'normal' : 'italic' }}>
                      {k.ventaReal > 0 ? fmt(k.ventaReal) : '—'}
                    </td>
                    {/* % Cumpl. KAM */}
                    <td style={td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
                        <span style={{ fontWeight: 600, color: colorCumplimiento(k.pctKam), fontSize: 13 }}>{pctStr(k.pctKam)}</span>
                        {k.pctKam != null && (
                          <div style={{ width: '100%', height: 4, background: '#F3F4F6', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(k.pctKam, 100)}%`, height: '100%', background: colorCumplimiento(k.pctKam) }} />
                          </div>
                        )}
                      </div>
                    </td>
                    {/* % Cumpl. global */}
                    <td style={{ ...td, fontWeight: 500, color: k.pctGlobal != null ? '#374151' : '#D1D5DB' }}>
                      {pctStr(k.pctGlobal)}
                    </td>
                    {/* % Ritmo */}
                    <td style={{ ...td, fontWeight: 600, color: colorCumplimiento(k.pctRitmo) }}>
                      {pctStr(k.pctRitmo)}
                    </td>
                    {/* Acción */}
                    <td style={td}>
                      <button onClick={() => setEditKam(k.kam)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: '4px 6px' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                        <Pencil style={{ width: 12, height: 12 }} />
                        Editar meta
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla principal */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {([
                  { label: 'Cliente',                      col: 'cliente', width: 150 },
                  { label: 'KAM',                           col: 'kam' },
                  { label: 'Proyección',                    col: 'proyeccion' },
                  { label: 'Venta real',                    col: 'ventaReal' },
                  { label: '% Cumpl. cliente',              col: 'pctCliente' },
                  { label: '% Cumpl. global',                col: 'pctGlobal' },
                  { label: `% Ritmo${mesRitmoLabel ? ` (a ${mesRitmoLabel})` : ''}`, col: 'pctRitmo', title: 'Compara lo vendido hasta hoy contra lo que debería llevar acumulado a esta fecha, según la meta mensual.' },
                  { label: 'Acción' },
                ] as { label: string; col?: string; width?: number; title?: string }[]).map(({ label, col, width, title }) => (
                  <th key={label} onClick={col ? () => toggleSort(col) : undefined} title={title}
                    style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', whiteSpace: 'nowrap', cursor: col ? 'pointer' : 'default', userSelect: 'none', width }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {label}
                      {col && (sortCol === col
                        ? sortDir === 'asc'
                          ? <ChevronUp style={{ width: 12, height: 12, color: '#1A56DB' }} />
                          : <ChevronDown style={{ width: 12, height: 12, color: '#1A56DB' }} />
                        : <ChevronsUpDown style={{ width: 12, height: 12, color: '#D1D5DB' }} />)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>
                    No hay clientes activos con los filtros seleccionados.
                  </td>
                </tr>
              ) : filasOrdenadas.map((f, i) => {
                const isLast = i === filasOrdenadas.length - 1
                const td = { padding: '12px 14px', fontSize: 13, color: '#374151', borderBottom: isLast ? 'none' : '1px solid #F3F4F6', verticalAlign: 'middle' as const }
                return (
                  <tr key={f.cliente.id} onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')} onMouseLeave={e => (e.currentTarget.style.background = '#fff')} style={{ background: '#fff', transition: 'background 0.1s' }}>
                    {/* Cliente */}
                    <td style={{ ...td, width: 150, maxWidth: 150 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }} title={f.cliente.nombre}>
                        {f.cliente.logo ? (
                          <img src={f.cliente.logo} alt={f.cliente.nombre} style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain', background: '#F9FAFB', border: '1px solid #E5E7EB', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: f.cliente.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>{f.cliente.iniciales}</span>
                          </div>
                        )}
                        <span style={{ fontWeight: 500, color: '#111827', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.cliente.nombre}</span>
                      </div>
                    </td>
                    {/* KAM */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: '#1D4ED8' }}>{f.cliente.ejecutivo.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                        </div>
                        <span style={{ fontSize: 13 }}>{f.cliente.ejecutivo}</span>
                      </div>
                    </td>
                    {/* Proyección */}
                    <td style={{ ...td, fontWeight: 600, color: f.proyeccion > 0 ? '#111827' : '#D1D5DB', fontStyle: f.proyeccion > 0 ? 'normal' : 'italic' }}>
                      {f.proyeccion > 0 ? fmt(f.proyeccion) : 'Sin meta'}
                    </td>
                    {/* Venta real */}
                    <td style={{ ...td, fontWeight: 600, color: f.ventaReal > 0 ? '#15803D' : '#D1D5DB', fontStyle: f.ventaReal > 0 ? 'normal' : 'italic' }}>
                      {f.ventaReal > 0 ? fmt(f.ventaReal) : '—'}
                    </td>
                    {/* % Cumpl. cliente */}
                    <td style={td}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
                        <span style={{ fontWeight: 600, color: colorCumplimiento(f.pctCliente), fontSize: 13 }}>{pctStr(f.pctCliente)}</span>
                        {f.pctCliente != null && (
                          <div style={{ width: '100%', height: 4, background: '#F3F4F6', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(f.pctCliente, 100)}%`, height: '100%', background: colorCumplimiento(f.pctCliente) }} />
                          </div>
                        )}
                      </div>
                    </td>
                    {/* % Cumpl. global */}
                    <td style={{ ...td, fontWeight: 500, color: f.pctGlobal != null ? '#374151' : '#D1D5DB' }}>
                      {pctStr(f.pctGlobal)}
                    </td>
                    {/* % Ritmo */}
                    <td style={{ ...td, fontWeight: 600, color: colorCumplimiento(f.pctRitmo) }}>
                      {pctStr(f.pctRitmo)}
                    </td>
                    {/* Acción */}
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <button onClick={() => setEditCliente(f.cliente.nombre)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: '4px 6px' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                          <Pencil style={{ width: 12, height: 12 }} />
                          Editar meta
                        </button>
                        <button onClick={() => updateCliente(f.cliente.id, { inactivoComercial: true })}
                          title="Marcar inactivo para proyección"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#B91C1C' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9CA3AF' }}>
                          <Archive style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Mostrando {filasOrdenadas.length} clientes activos para proyección</span>
          {clientesInactivos.length > 0 && (
            <button onClick={() => setShowInactivos(true)} style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
              {clientesInactivos.length} cliente{clientesInactivos.length === 1 ? '' : 's'} inactivo{clientesInactivos.length === 1 ? '' : 's'} para proyección
            </button>
          )}
        </div>
      </div>

      {/* Vista mensual */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Comportamiento mensual · {anio}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Proyección vs. venta real de los clientes filtrados, mes a mes.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: '#DBEAFE', display: 'inline-block' }} /> Proyección
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B7280' }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: '#1A56DB', display: 'inline-block' }} /> Venta real
            </span>
          </div>
        </div>

        <GraficoMensual datos={vistaMensual} />

        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                {['Mes', 'Proyección', 'Venta real', '% Cumplimiento'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vistaMensual.map((d, i) => (
                <tr key={d.mes} style={{ background: mesKey === String(d.mes) ? '#EFF6FF' : '#fff' }}>
                  <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 500, color: '#111827', borderBottom: i < 11 ? '1px solid #F3F4F6' : 'none' }}>{MESES_ES[d.mes - 1]}</td>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: '#374151', borderBottom: i < 11 ? '1px solid #F3F4F6' : 'none' }}>{d.proyeccion > 0 ? fmt(d.proyeccion) : '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: 12, color: '#15803D', fontWeight: 500, borderBottom: i < 11 ? '1px solid #F3F4F6' : 'none' }}>{d.ventaReal > 0 ? fmt(d.ventaReal) : '—'}</td>
                  <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, color: colorCumplimiento(d.pct), borderBottom: i < 11 ? '1px solid #F3F4F6' : 'none' }}>{pctStr(d.pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
