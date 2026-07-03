'use client'

import { useState } from 'react'
import { Calendar, Users, AlertTriangle, ArrowRight, LayoutGrid, Search, Download, Plus, X, Info, ChevronDown, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '@/lib/store'

// ─── Datos mock de tráfico ──────────────────────────────────────────────────────
const FILAS = [
  { id: 1, dia: 'Lunes',    cliente: 'Grupo Éxito',    clienteColor: '#e53935', clienteIni: 'GÉ', clienteLogo: '', subcliente: 'Éxito Retail',        proyecto: 'Campaña Aniversario Éxito 82 años',         ejecutivo: 'María Torres',  ejecutivoIni: 'MT', fechaPresent: '19/09/2026', fechaEjec: '05/09/2026', prioridad: 'Alta',  estado: 'En curso',               areas: ['Comercial','Creativo'],          resp: ['MT','SG','LN','FC','NS'], pendiente: false,
    asignaciones: [
      { area: 'Comercial',     areaColor: '#DBEAFE', areaText: '#1D4ED8', persona: 'María Torres',      ini: 'MT', tarea: 'Seguimiento cliente',    dia: 'Lunes',      estado: 'En curso'    },
      { area: 'Creativo',      areaColor: '#EDE9FE', areaText: '#6D28D9', persona: 'Santiago González', ini: 'SG', tarea: 'Desarrollo concepto',   dia: 'Lunes',      estado: 'Pendiente'   },
      { area: 'Diseño gráfico',areaColor: '#FCE7F3', areaText: '#9D174D', persona: 'Luisa Navarro',     ini: 'LN', tarea: 'Ajuste KV y deck',       dia: 'Martes',     estado: 'Pendiente'   },
      { area: 'Producción',    areaColor: '#FEF3C7', areaText: '#92400E', persona: 'Francisco Cárdenas',ini: 'FC', tarea: 'Revisión producción',    dia: 'Miércoles',  estado: 'Pendiente'   },
      { area: 'Audiovisual',   areaColor: '#D1FAE5', areaText: '#065F46', persona: 'Nicolás Suárez',    ini: 'NS', tarea: 'Edición piezas video',  dia: 'Jueves',     estado: 'En revisión' },
    ],
  },
  { id: 2, dia: 'Martes',   cliente: 'SC Johnson',     clienteColor: '#7C3AED', clienteIni: 'SC', clienteLogo: '', subcliente: 'Hogar',                 proyecto: 'Lanzamiento Desinfectante Lysol Clean',     ejecutivo: 'Juan Camilo',   ejecutivoIni: 'JC', fechaPresent: '22/09/2026', fechaEjec: '08/09/2026', prioridad: 'Medio', estado: 'Programado',             areas: ['Gráfico','Producción'],         resp: ['JC','LN','FC'], pendiente: false, asignaciones: [] },
  { id: 3, dia: 'Martes',   cliente: 'Mercado Libre',  clienteColor: '#F59E0B', clienteIni: 'ML', clienteLogo: '', subcliente: 'Mercado Pago',          proyecto: 'Campaña Agosto - Compra con Beneficios',    ejecutivo: 'Laura Medina',  ejecutivoIni: 'LM', fechaPresent: '18/09/2026', fechaEjec: '02/09/2026', prioridad: 'Medio', estado: 'En revisión',            areas: ['Creativo','Digital'],           resp: ['LM','SG'], pendiente: false, asignaciones: [] },
  { id: 4, dia: 'Miércoles',cliente: 'Homecenter',     clienteColor: '#F97316', clienteIni: 'HC', clienteLogo: '', subcliente: 'Homecenter Colombia',   proyecto: 'Catálogo Primavera Homecenter',             ejecutivo: 'Felipe Agudelo',ejecutivoIni: 'FA', fechaPresent: '25/09/2026', fechaEjec: '11/09/2026', prioridad: 'Alta',  estado: 'En curso',               areas: ['Diseño gráfico','Producción'],  resp: ['FA','LN','FC'], pendiente: false, asignaciones: [] },
  { id: 5, dia: 'Miércoles',cliente: 'Bancolombia',    clienteColor: '#FBBF24', clienteIni: 'BC', clienteLogo: '', subcliente: 'Personas',              proyecto: 'Educación Financiera Q4',                   ejecutivo: 'Hans Vargas',   ejecutivoIni: 'HV', fechaPresent: '24/09/2026', fechaEjec: '09/09/2026', prioridad: 'Medio', estado: 'Programado',             areas: ['Comercial','Creativo'],         resp: ['HV','SG'], pendiente: false, asignaciones: [] },
  { id: 6, dia: 'Jueves',   cliente: 'Avianca',        clienteColor: '#DC2626', clienteIni: 'AV', clienteLogo: '', subcliente: 'Avianca Plus',           proyecto: 'Campaña Acumulación de Millas',             ejecutivo: 'Laura Medina',  ejecutivoIni: 'LM', fechaPresent: '23/09/2026', fechaEjec: '10/09/2026', prioridad: 'Alta',  estado: 'Reprogramado',           areas: ['Comercial','Audiovisual'],      resp: ['LM','NS'], pendiente: false, asignaciones: [] },
  { id: 7, dia: 'Viernes',  cliente: 'Grupo Nutresa',  clienteColor: '#0EA5E9', clienteIni: 'GN', clienteLogo: '', subcliente: 'Comidas al Paso',       proyecto: 'Nuevos Productos Zenú Snacks',              ejecutivo: 'David Ruiz',    ejecutivoIni: 'DR', fechaPresent: '26/09/2026', fechaEjec: '16/09/2026', prioridad: 'Medio', estado: 'Programado',             areas: ['Diseño gráfico','Producción'],  resp: ['DR','LN','FC'], pendiente: false, asignaciones: [] },
  { id: 8, dia: 'Viernes',  cliente: 'Banco de Bogotá',clienteColor: '#1D4ED8', clienteIni: 'BB', clienteLogo: '', subcliente: 'Pymes',                 proyecto: 'Crédito Digital para Pymes',                ejecutivo: 'María Torres',  ejecutivoIni: 'MT', fechaPresent: '28/09/2026', fechaEjec: '17/09/2026', prioridad: 'Baja',  estado: 'Completado',             areas: ['Comercial','Digital'],          resp: ['MT'], pendiente: false, asignaciones: [] },
  { id: 9, dia: 'Pendiente', cliente: 'Banco Falabella',clienteColor: '#16A34A', clienteIni: 'BF', clienteLogo: '', subcliente: 'Bienestar',             proyecto: 'Activación Mundial Banco Falabella',        ejecutivo: 'Hans Vargas',   ejecutivoIni: 'HV', fechaPresent: '15/09/2026', fechaEjec: '22/09/2026', prioridad: 'Alta',  estado: 'Pendiente de programar', areas: [],                               resp: [], pendiente: true, asignaciones: [] },
]

// ─── Estilos ────────────────────────────────────────────────────────────────────
const DIA_DOT: Record<string, string> = {
  'Lunes': '#3B82F6', 'Martes': '#10B981', 'Miércoles': '#8B5CF6',
  'Jueves': '#F97316', 'Viernes': '#EC4899', 'Pendiente': '#9CA3AF',
}
const PRIORIDAD_S: Record<string, { bg: string; text: string }> = {
  'Alta':  { bg: '#FEE2E2', text: '#B91C1C' },
  'Medio': { bg: '#FEF9C3', text: '#854D0E' },
  'Baja':  { bg: '#DCFCE7', text: '#15803D' },
}
const ESTADO_S: Record<string, { bg: string; text: string }> = {
  'En curso':               { bg: '#DBEAFE', text: '#1D4ED8' },
  'Programado':             { bg: '#D1FAE5', text: '#065F46' },
  'En revisión':            { bg: '#FEF3C7', text: '#92400E' },
  'Reprogramado':           { bg: '#EDE9FE', text: '#6D28D9' },
  'Completado':             { bg: '#D1FAE5', text: '#047857' },
  'Pendiente de programar': { bg: '#FEF9C3', text: '#B45309' },
}
const AREA_S: Record<string, { bg: string; text: string }> = {
  'Comercial':     { bg: '#DBEAFE', text: '#1D4ED8' },
  'Creativo':      { bg: '#EDE9FE', text: '#6D28D9' },
  'Gráfico':       { bg: '#FCE7F3', text: '#9D174D' },
  'Diseño gráfico':{ bg: '#FCE7F3', text: '#9D174D' },
  'Producción':    { bg: '#FEF3C7', text: '#92400E' },
  'Audiovisual':   { bg: '#D1FAE5', text: '#065F46' },
  'Digital':       { bg: '#CCFBF1', text: '#0F766E' },
}
const ESTADO_ASIG_S: Record<string, { bg: string; text: string }> = {
  'En curso':    { bg: '#DBEAFE', text: '#1D4ED8' },
  'Pendiente':   { bg: '#FEF3C7', text: '#92400E' },
  'En revisión': { bg: '#EDE9FE', text: '#6D28D9' },
  'Completado':  { bg: '#D1FAE5', text: '#047857' },
}

const DIAS_FILTRO = ['Todos','Lunes','Martes','Miércoles','Jueves','Viernes','Siguiente semana']
const AREAS_FILTRO = ['Todas','Comercial','Creativo','Gráfico','Diseño gráfico','Producción','Audiovisual','Digital']
const ESTADOS_FILTRO = ['Todos','En curso','Programado','En revisión','Reprogramado','Completado','Pendiente de programar']

type Fila = typeof FILAS[0]

// ─── Componentes pequeños ───────────────────────────────────────────────────────
function Av({ ini, size = 26, bg = '#DBEAFE', tc = '#1D4ED8' }: { ini: string; size?: number; bg?: string; tc?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid #fff' }}>
      <span style={{ fontSize: size * 0.33, fontWeight: 700, color: tc }}>{ini}</span>
    </div>
  )
}
function Bdg({ label, bg, text, small }: { label: string; bg: string; text: string; small?: boolean }) {
  return <span style={{ display: 'inline-flex', padding: small ? '2px 7px' : '3px 10px', borderRadius: 20, fontSize: small ? 11 : 12, fontWeight: 500, background: bg, color: text, whiteSpace: 'nowrap' }}>{label}</span>
}
function DropSel({ label, value, set, opts }: { label: string; value: string; set: (v: string) => void; opts: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={e => set(e.target.value)}
          style={{ height: 34, padding: '0 28px 0 10px', border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer', outline: 'none', appearance: 'none', minWidth: 120,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── Panel lateral ──────────────────────────────────────────────────────────────
function Panel({ p, onClose }: { p: Fila; onClose: () => void }) {
  const [tab, setTab] = useState<'asig' | 'info'>('asig')
  const pr = PRIORIDAD_S[p.prioridad] ?? { bg: '#F3F4F6', text: '#6B7280' }

  return (
    <div style={{ width: 380, flexShrink: 0, background: '#fff', borderLeft: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Detalle de tráfico</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: p.clienteColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{p.clienteIni}</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{p.proyecto}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{p.cliente} · {p.subcliente}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Fecha presentación</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{p.fechaPresent}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Fecha ejecución</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{p.fechaEjec}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Prioridad</div>
            <Bdg label={p.prioridad} bg={pr.bg} text={pr.text} small />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB' }}>
        {[['asig', 'Asignaciones'], ['info', 'Información general']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as 'asig' | 'info')}
            style={{ flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer',
              color: tab === key ? '#1A56DB' : '#6B7280',
              borderBottom: tab === key ? '2px solid #1A56DB' : '2px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'asig' ? (
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Header tabla */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 70px 80px', gap: 8, padding: '6px 8px', background: '#F9FAFB', borderRadius: 6, marginBottom: 6 }}>
              {['Área','Persona asignada','Tarea','Día','Estado'].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {p.asignaciones.length > 0 ? p.asignaciones.map((a, i) => {
              const es = ESTADO_ASIG_S[a.estado] ?? { bg: '#F3F4F6', text: '#6B7280' }
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 70px 80px', gap: 8, padding: '10px 8px', borderBottom: '1px solid #F3F4F6', alignItems: 'center' }}>
                  <Bdg label={a.area} bg={a.areaColor} text={a.areaText} small />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Av ini={a.ini} size={22} />
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{a.persona}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#374151' }}>{a.tarea}</span>
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{a.dia}</span>
                  <Bdg label={a.estado} bg={es.bg} text={es.text} small />
                </div>
              )
            }) : (
              <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>Sin asignaciones aún</div>
            )}

            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, padding: '8px 0', border: '1px dashed #D1D5DB', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151', width: '100%' }}>
              <Plus style={{ width: 14, height: 14 }} />
              Asignar área o persona
            </button>

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '12px 10px', background: '#F0F9FF', borderRadius: 8, marginTop: 10 }}>
              <Info style={{ width: 14, height: 14, color: '#0284C7', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 11, color: '#0369A1', margin: 0, lineHeight: 1.5 }}>
                Las asignaciones se reflejan automáticamente en el dashboard de cada persona, junto con sus tareas y fechas.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Ejecutivo', value: p.ejecutivo },
              { label: 'Día de la semana', value: p.dia },
              { label: 'Prioridad', value: p.prioridad },
              { label: 'Estado tráfico', value: p.estado },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{value}</div>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Áreas activas</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {p.areas.length > 0 ? p.areas.map(a => {
                  const s = AREA_S[a] ?? { bg: '#F3F4F6', text: '#6B7280' }
                  return <Bdg key={a} label={a} bg={s.bg} text={s.text} small />
                }) : <span style={{ fontSize: 13, color: '#D1D5DB' }}>Sin definir</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, height: 38, border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#374151', background: '#fff', cursor: 'pointer' }}>
          Cerrar
        </button>
        <button style={{ flex: 1, height: 38, background: '#1A56DB', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function TraficoPage() {
  const { clientes: clientesStore } = useStore()

  const [diaActivo, setDiaActivo] = useState('Todos')
  const [semana, setSemana] = useState('22 sep – 26 sep 2026')
  const [filtroCliente, setFiltroCliente] = useState('Todos')
  const [filtroEjecutivo, setFiltroEjecutivo] = useState('Todos')
  const [filtroArea, setFiltroArea] = useState('Todas')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Fila | null>(null)

  // Clientes del store + los del mock que no estén
  const clientesNombres = Array.from(new Set([...clientesStore.map(c => c.nombre), ...FILAS.map(f => f.cliente)]))
  const clientesFiltroList = ['Todos', ...clientesNombres]
  const ejecutivosFiltroList = ['Todos', ...Array.from(new Set(FILAS.map(f => f.ejecutivo)))]

  const filasFiltradas = FILAS.filter(f => {
    const matchDia = diaActivo === 'Todos' || f.dia === diaActivo || (diaActivo === 'Siguiente semana' && f.pendiente)
    const matchCliente = filtroCliente === 'Todos' || f.cliente === filtroCliente
    const matchEjec = filtroEjecutivo === 'Todos' || f.ejecutivo === filtroEjecutivo
    const matchArea = filtroArea === 'Todas' || f.areas.includes(filtroArea)
    const matchEstado = filtroEstado === 'Todos' || f.estado === filtroEstado
    const matchSearch = !search || f.proyecto.toLowerCase().includes(search.toLowerCase()) || f.cliente.toLowerCase().includes(search.toLowerCase())
    return matchDia && matchCliente && matchEjec && matchArea && matchEstado && matchSearch
  })

  // KPIs
  const kpis = [
    { label: 'Proyectos esta semana', value: FILAS.filter(f => !f.pendiente).length, Icon: Calendar, bg: '#EFF6FF', ic: '#1A56DB' },
    { label: 'Pendientes por asignar', value: FILAS.filter(f => f.resp.length === 0).length, Icon: Users, bg: '#FFF7ED', ic: '#EA580C' },
    { label: 'Urgentes', value: FILAS.filter(f => f.prioridad === 'Alta').length, Icon: AlertTriangle, bg: '#FEF2F2', ic: '#DC2626' },
    { label: 'Pasados a sig. semana', value: FILAS.filter(f => f.estado === 'Reprogramado').length, Icon: ArrowRight, bg: '#F5F3FF', ic: '#7C3AED' },
    { label: 'Áreas activas', value: Array.from(new Set(FILAS.flatMap(f => f.areas))).length, Icon: LayoutGrid, bg: '#F0FDF4', ic: '#16A34A' },
  ]

  const td = (extra?: object) => ({ padding: '13px 14px', fontSize: 13, color: '#374151', verticalAlign: 'middle' as const, borderBottom: '1px solid #F3F4F6', ...extra })

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main */}
      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 18, overflowY: 'auto', minWidth: 0 }}>
        {/* Header */}
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>Tráfico de la agencia</h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
            Programa los proyectos de la semana, asigna áreas y responsables, y organiza la carga operativa del equipo.
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
          {kpis.map(({ label, value, Icon, bg, ic }) => (
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

        {/* Controles: semana + días + filtros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Fila 1: semana picker + tabs días */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 34, border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', padding: '0 2px' }}>
              <button style={{ width: 26, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', borderRadius: 6 }}>
                <ChevronLeft style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
                <Calendar style={{ width: 13, height: 13, color: '#6B7280' }} />
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{semana}</span>
              </div>
              <button style={{ width: 26, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', borderRadius: 6 }}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              {DIAS_FILTRO.map(d => (
                <button key={d} onClick={() => setDiaActivo(d)}
                  style={{ height: 34, padding: '0 14px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                    background: diaActivo === d ? '#1A56DB' : '#fff',
                    color: diaActivo === d ? '#fff' : '#374151',
                    boxShadow: diaActivo === d ? 'none' : '0 0 0 1px #E5E7EB inset',
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Fila 2: filtros */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
            <DropSel label="Cliente" value={filtroCliente} set={setFiltroCliente} opts={clientesFiltroList} />
            <DropSel label="Ejecutivo" value={filtroEjecutivo} set={setFiltroEjecutivo} opts={ejecutivosFiltroList} />
            <DropSel label="Área" value={filtroArea} set={setFiltroArea} opts={AREAS_FILTRO} />
            <DropSel label="Estado" value={filtroEstado} set={setFiltroEstado} opts={ESTADOS_FILTRO} />

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9CA3AF' }} />
                <input placeholder="Buscar proyecto..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ height: 34, paddingLeft: 30, paddingRight: 10, width: 180, border: '1px solid #E5E7EB', borderRadius: 7, fontSize: 13, color: '#374151', background: '#fff', outline: 'none' }} />
              </div>
              {/* Exportar */}
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', background: '#1A56DB', border: 'none', borderRadius: 7, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <Download style={{ width: 14, height: 14 }} />
                Exportar tráfico
              </button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {['Día','Cliente','Subcliente','Proyecto','Ejecutivo','Fecha presentación','Fecha ejecución','Prioridad','Estado tráfico','Áreas activas','Responsables','Acción'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.map(f => {
                  const dot = DIA_DOT[f.dia] ?? '#9CA3AF'
                  const pr = PRIORIDAD_S[f.prioridad] ?? { bg: '#F3F4F6', text: '#6B7280' }
                  const es = ESTADO_S[f.estado] ?? { bg: '#F3F4F6', text: '#6B7280' }
                  const rowBg = f.pendiente ? '#FFFBEB' : '#fff'
                  const cl = clientesStore.find(c => c.nombre === f.cliente)
                  const respShow = f.resp.slice(0, 3)
                  const respExtra = f.resp.length - 3

                  return (
                    <tr key={f.id} style={{ background: rowBg, transition: 'background 0.1s' }}
                      onMouseEnter={e => { if (!f.pendiente) e.currentTarget.style.background = '#F9FAFB' }}
                      onMouseLeave={e => { e.currentTarget.style.background = rowBg }}>
                      {/* Día */}
                      <td style={td()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 500, color: f.pendiente ? '#9CA3AF' : '#374151' }}>{f.dia}</span>
                        </div>
                      </td>
                      {/* Cliente */}
                      <td style={td()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          {cl?.logo ? (
                            <img src={cl.logo} alt={f.cliente} style={{ width: 26, height: 26, borderRadius: 5, objectFit: 'contain', background: '#F9FAFB', border: '1px solid #E5E7EB' }} />
                          ) : (
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: f.clienteColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>{f.clienteIni}</span>
                            </div>
                          )}
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{f.cliente}</span>
                        </div>
                      </td>
                      {/* Subcliente */}
                      <td style={td({ color: '#6B7280' })}>{f.subcliente}</td>
                      {/* Proyecto */}
                      <td style={td({ maxWidth: 180 })}>
                        <button onClick={() => setSelected(f === selected ? null : f)}
                          style={{ color: '#1A56DB', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, textAlign: 'left', padding: 0 }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                          {f.proyecto}
                        </button>
                      </td>
                      {/* Ejecutivo */}
                      <td style={td()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Av ini={f.ejecutivoIni} size={24} />
                          <span style={{ fontSize: 13 }}>{f.ejecutivo}</span>
                        </div>
                      </td>
                      <td style={td({ color: '#6B7280' })}>{f.fechaPresent}</td>
                      <td style={td({ color: '#6B7280' })}>{f.fechaEjec}</td>
                      {/* Prioridad */}
                      <td style={td()}>
                        <Bdg label={f.prioridad} bg={pr.bg} text={pr.text} small />
                      </td>
                      {/* Estado tráfico */}
                      <td style={td()}>
                        {f.pendiente
                          ? <Bdg label={f.estado} bg="#FEF9C3" text="#B45309" small />
                          : <Bdg label={f.estado} bg={es.bg} text={es.text} small />}
                      </td>
                      {/* Áreas */}
                      <td style={td()}>
                        {f.areas.length > 0 ? (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {f.areas.map(a => {
                              const s = AREA_S[a] ?? { bg: '#F3F4F6', text: '#6B7280' }
                              return <Bdg key={a} label={a} bg={s.bg} text={s.text} small />
                            })}
                          </div>
                        ) : <span style={{ fontSize: 12, color: '#D1D5DB' }}>Sin definir</span>}
                      </td>
                      {/* Responsables */}
                      <td style={td()}>
                        {f.resp.length > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {respShow.map((ini, i) => (
                              <div key={i} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: respShow.length - i }}>
                                <Av ini={ini} size={26} />
                              </div>
                            ))}
                            {respExtra > 0 && (
                              <div style={{ marginLeft: -6, width: 26, height: 26, borderRadius: '50%', background: '#F3F4F6', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#6B7280' }}>+{respExtra}</span>
                              </div>
                            )}
                          </div>
                        ) : <span style={{ fontSize: 12, color: '#D1D5DB' }}>Sin asignar</span>}
                      </td>
                      {/* Acción */}
                      <td style={td()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button onClick={() => setSelected(f === selected ? null : f)}
                            style={{ fontSize: 12, fontWeight: 500, color: '#1A56DB', background: '#EFF6FF', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            Ver detalle
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: 13, color: '#6B7280' }}>Mostrando 1 a {filasFiltradas.length} de {FILAS.length} proyectos</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {['‹', '1', '›'].map((b, i) => (
                <button key={i} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, fontSize: 13, border: '1px solid #E5E7EB', cursor: 'pointer', background: b === '1' ? '#1A56DB' : '#fff', color: b === '1' ? '#fff' : '#6B7280', fontWeight: b === '1' ? 600 : 400 }}>
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Panel lateral */}
      {selected && <Panel p={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
