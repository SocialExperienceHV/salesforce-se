'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type Proyecto = {
  id: string
  nombre: string
  cliente: string
  subcliente: string
  ejecutivo: string
  tipo: string
  estado: 'Activo' | 'En pausa' | 'Finalizado' | 'Cancelado'
  prioridad: 'Alta' | 'Medio' | 'Baja'
  fechaInicio: string
  fechaEntrega: string
  fechaPresentacion: string
  monto: number
  estadoComercial: 'En propuesta' | 'En negociación' | 'Vendido' | 'Perdido'
  descripcion: string
  centroCosto?: string             // 4 dígitos, se asigna al vender
  montoRealVendido?: number
  costoCreatividad?: number
  rentabilidadProduccion?: number
  diaTrafico?: string
  estadoTrafico?: string
  personasProduccion?: string[]
  personasCreatividad?: string[]
  accionProduccion?: string
  accionCreatividad?: string
  createdAt: string
}

export type RegistroTiempo = {
  id: string
  proyectoId: string
  proyecto: string
  fecha: string
  horaInicio: string
  horaFin: string
  actividad: string
  persona: string
  area: string
  costoHora: number
  createdAt: string
}

export type PersonaStore = {
  id: string
  nombre: string
  area: string
  cargo: string
  costoMensual: number
  email?: string
  cedula?: string
  clave?: string
  foto?: string        // base64
  permiso?: string
  jefe?: string
  estado?: 'Activo' | 'Inactivo'
}

export type ContactoCliente = {
  id: string
  area: string
  personas: { nombre: string; email: string; telefono: string }[]
}

export type Cliente = {
  id: string
  nombre: string
  iniciales: string
  color: string
  logo?: string
  ejecutivo: string
  subclientes: string[]
  contactos?: ContactoCliente[]
  proyectos: number
  estado: 'Activo' | 'Inactivo'
  createdAt: string
}

export type GastoLegalizacion = {
  id: string
  centroCosto: string
  tipoGasto: string
  tipoFactura: 'FE' | 'Cuenta de cobro'
  cedulaCuentaCobro?: string
  soporteCuentaNombre?: string
  soporteCuentaData?: string  // base64
  ciudadFecha: string
  descripcion: string
  pesos: number
  usd: number
  tasaCambio: number
  total: number
  soporteNombre?: string
  soporteData?: string  // base64
}

export type HistorialLeg = {
  fecha: string
  usuario: string
  accion: string
  observacion?: string
}

export type Legalizacion = {
  id: string
  codigo: string   // SE-LG-001/26
  // Encabezado
  fecha: string
  tipoDocumento: string
  tipoLegalizacion: 'Reembolso' | 'Legalización de anticipo'
  noAnticipo: string
  fechaReembolso: string
  // Responsable
  responsable: string
  cargo: string
  // Proyecto
  proyectoId: string
  proyecto: string
  centroCosto: string
  productor: string
  cliente: string
  // Gastos
  gastos: GastoLegalizacion[]
  anticipo: number
  // Observaciones
  observaciones: string
  // Estado
  estado: 'En revisión' | 'Aprobada'
  observacionContabilidad?: string
  // Trazabilidad
  creadoPor: string
  historial: HistorialLeg[]
  createdAt: string
}

export type TarjetaCorporativa = {
  id: string
  ultimos4: string
  nombre?: string
  activa: boolean
  createdAt: string
}

export type ItemTC = {
  id: string
  centroCosto: string
  monto: number
  responsable: string
  status: 'Entregado' | 'Pendiente'
  descripcion?: string
}

export type DocumentoTC = {
  id: string
  tarjetaId: string
  ultimos4: string
  fecha: string
  items: ItemTC[]
  finalizado: boolean
  createdAt: string
}

export type Notificacion = {
  id: string
  tipo: 'proyecto_nuevo' | 'proyecto_vendido' | 'asignacion'
  titulo: string
  mensaje: string
  para: string | 'todos'
  leida: boolean
  href?: string
  createdAt: string
}

export type Prospecto = {
  id: string
  empresa: string
  contacto: string
  telefono?: string
  email?: string
  cargo?: string
  origen?: string
  fase: string
  primerContactoPersona?: string
  comercial?: string
  ultimoContactoFecha?: string
  ultimoContactoTexto?: string
  proximoSeguimientoFecha?: string
  proximoSeguimientoTexto?: string
  valor: number
  notas: string
  createdAt: string
}

// ─── Initial mock data ─────────────────────────────────────────────────────────

const INIT_PROYECTOS: Proyecto[] = []

const INIT_CLIENTES: Cliente[] = []

const INIT_PERSONAS_STORE: PersonaStore[] = [
  { id: 'ps1',  nombre: 'Santiago González', area: 'Creatividad',       cargo: 'Líder Creativo',        costoMensual: 7800000, email: 'santiago.gonzalez@socialexperience.com.co', clave: '1234', permiso: 'Líder',             estado: 'Activo' },
  { id: 'ps2',  nombre: 'Nicola Aranza',     area: 'Creatividad',       cargo: 'Copy Creativo',         costoMensual: 4500000, email: 'nicola.aranza@socialexperience.com.co',     clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps3',  nombre: 'Nicolás Suárez',    area: 'Audiovisual',       cargo: 'Diseñador Industrial',  costoMensual: 5200000, email: 'nicolas.suarez@socialexperience.com.co',    clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps4',  nombre: 'Luisa Navarro',     area: 'Diseño gráfico',    cargo: 'Líder Gráfico',         costoMensual: 7000000, email: 'luisa.navarro@socialexperience.com.co',     clave: '1234', permiso: 'Líder',             estado: 'Activo' },
  { id: 'ps5',  nombre: 'Álvaro',            area: 'Diseño gráfico',    cargo: 'Diseñador Gráfico',     costoMensual: 4200000, email: 'alvaro@socialexperience.com.co',            clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps6',  nombre: 'Kate',              area: 'Diseño gráfico',    cargo: 'Diseñador Gráfico',     costoMensual: 4200000, email: 'kate@socialexperience.com.co',              clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps7',  nombre: 'Jonathan Ramírez',  area: 'Diseño industrial', cargo: 'Líder Industrial',      costoMensual: 7000000, email: 'jonathan.ramirez@socialexperience.com.co', clave: '1234', permiso: 'Líder',             estado: 'Activo' },
  { id: 'ps8',  nombre: 'Felipe Aguilón',    area: 'Comercial',         cargo: 'KAM',                   costoMensual: 7500000, email: 'felipe.aguilon@socialexperience.com.co',   clave: '1234', permiso: 'KAM',               estado: 'Activo' },
  { id: 'ps9',  nombre: 'Hans Vargas',       area: 'Comercial',         cargo: 'KAM',                   costoMensual: 9600000, email: 'hans@socialexperience.com.co',             clave: 'hans2026', permiso: 'Super Admin',  estado: 'Activo' },
  { id: 'ps10', nombre: 'Iván Londoño',      area: 'Comercial',         cargo: 'KAM',                   costoMensual: 7200000, email: 'ivan.londono@socialexperience.com.co',     clave: '1234', permiso: 'KAM',               estado: 'Activo' },
  { id: 'ps11', nombre: 'Francisco Cárdenas',area: 'Producción',        cargo: 'Director Producción',   costoMensual: 8500000, email: 'francisco.cardenas@socialexperience.com.co',clave: '1234', permiso: 'Líder Producción',  estado: 'Activo' },
  { id: 'ps12', nombre: 'Andrés Arellano',   area: 'Producción',        cargo: 'Productor Sr',          costoMensual: 6600000, email: 'andres.arellano@socialexperience.com.co',  clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps13', nombre: 'Carlos Bustamante', area: 'Producción',        cargo: 'Productor Sr',          costoMensual: 6400000, email: 'carlos.bustamante@socialexperience.com.co',clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps14', nombre: 'Manuel Parra',      area: 'Producción',        cargo: 'Coordinador',           costoMensual: 4800000, email: 'manuel.parra@socialexperience.com.co',     clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps15', nombre: 'Juan Vargas',       area: 'Administración',    cargo: 'Administrativo',        costoMensual: 5000000, email: 'juan.vargas@socialexperience.com.co',      clave: '1234', permiso: 'Administración',    estado: 'Activo' },
]

const INIT_LEGALIZACIONES: Legalizacion[] = []

const INIT_REGISTROS: RegistroTiempo[] = []
const INIT_PROSPECTOS: Prospecto[] = []

// ─── Auth helpers ──────────────────────────────────────────────────────────────

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function saveLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export function getLoggedUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cal2_logged_user_id')
}

export function setLoggedUserId(id: string | null) {
  if (id) localStorage.setItem('cal2_logged_user_id', id)
  else localStorage.removeItem('cal2_logged_user_id')
}

// ─── Context ───────────────────────────────────────────────────────────────────

type StoreCtx = {
  proyectos: Proyecto[]
  addProyecto: (p: Omit<Proyecto, 'id' | 'createdAt'>) => void
  updateProyecto: (id: string, changes: Partial<Proyecto>) => void

  registros: RegistroTiempo[]
  addRegistro: (r: Omit<RegistroTiempo, 'id' | 'createdAt'>) => void
  updateRegistro: (id: string, changes: Partial<RegistroTiempo>) => void
  deleteRegistro: (id: string) => void

  clientes: Cliente[]
  addCliente: (c: Omit<Cliente, 'id' | 'createdAt'>) => void
  updateCliente: (id: string, changes: Partial<Cliente>) => void

  prospectos: Prospecto[]
  addProspecto: (p: Omit<Prospecto, 'id' | 'createdAt'>) => void
  updateProspecto: (id: string, changes: Partial<Prospecto>) => void

  personasStore: PersonaStore[]
  addPersonaStore: (p: Omit<PersonaStore, 'id'>) => void
  updatePersonaStore: (id: string, changes: Partial<PersonaStore>) => void

  currentUser: PersonaStore | null
  setCurrentUser: (p: PersonaStore | null) => void
  ready: boolean

  planOverrides: Record<string, { dias: string[]; estado: 'En proceso' | 'Finalizado' }>
  updatePlanOverride: (key: string, changes: { dias?: string[]; estado?: 'En proceso' | 'Finalizado' }) => void

  legalizaciones: Legalizacion[]
  addLegalizacion: (l: Omit<Legalizacion, 'id' | 'createdAt' | 'codigo'>) => string
  updateLegalizacion: (id: string, changes: Partial<Legalizacion>) => void

  tarjetasCorp: TarjetaCorporativa[]
  addTarjetaCorp: (t: Omit<TarjetaCorporativa, 'id' | 'createdAt'>) => void
  updateTarjetaCorp: (id: string, changes: Partial<TarjetaCorporativa>) => void

  documentosTC: DocumentoTC[]
  addDocumentoTC: (d: Omit<DocumentoTC, 'id' | 'createdAt'>) => string
  updateDocumentoTC: (id: string, changes: Partial<DocumentoTC>) => void
  deleteDocumentoTC: (id: string) => void

  notificaciones: Notificacion[]
  addNotificacion: (n: Omit<Notificacion, 'id' | 'leida' | 'createdAt'>) => void
  marcarLeida: (id: string) => void
  marcarTodasLeidas: () => void
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [proyectos, setProyectos]         = useState<Proyecto[]>(INIT_PROYECTOS)
  const [registros, setRegistros]         = useState<RegistroTiempo[]>(INIT_REGISTROS)
  const [clientes, setClientes]           = useState<Cliente[]>(INIT_CLIENTES)
  const [prospectos, setProspectos]       = useState<Prospecto[]>(INIT_PROSPECTOS)
  const [personasStore, setPersonasStore] = useState<PersonaStore[]>(INIT_PERSONAS_STORE)
  const [planOverrides, setPlanOverrides] = useState<Record<string, { dias: string[]; estado: 'En proceso' | 'Finalizado' }>>({})
  const [legalizaciones, setLegalizaciones] = useState<Legalizacion[]>(INIT_LEGALIZACIONES)
  const [tarjetasCorp, setTarjetasCorp] = useState<TarjetaCorporativa[]>([])
  const [documentosTC, setDocumentosTC] = useState<DocumentoTC[]>([])
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [currentUser, setCurrentUserState] = useState<PersonaStore | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const personas = loadLS('cal2_personas_store', INIT_PERSONAS_STORE)
    setProyectos(loadLS('cal2_proyectos', INIT_PROYECTOS))
    setRegistros(loadLS('cal2_registros', INIT_REGISTROS))
    setClientes(loadLS('cal2_clientes', INIT_CLIENTES))
    setProspectos(loadLS('cal2_prospectos', INIT_PROSPECTOS))
    setPersonasStore(personas)
    setPlanOverrides(loadLS('cal2_plan_overrides', {}))
    setTarjetasCorp(loadLS('cal2_tarjetas_corp', []))
    setDocumentosTC(loadLS('cal2_documentos_tc', []))
    setNotificaciones(loadLS('cal2_notificaciones', []))
    const legsRaw: Legalizacion[] = loadLS('cal2_legalizaciones', INIT_LEGALIZACIONES)
    // Migrar registros sin código consecutivo
    const legsOrdenadas = [...legsRaw].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    let needsSave = false
    const yearCounters: Record<string, number> = {}
    legsOrdenadas.forEach(l => {
      if (!l.codigo) {
        const year = new Date(l.createdAt).getFullYear().toString().slice(2)
        yearCounters[year] = (yearCounters[year] ?? 0) + 1
        l.codigo = `SE-LG-${String(yearCounters[year]).padStart(3, '0')}/${year}`
        needsSave = true
      } else {
        const m = l.codigo.match(/SE-LG-(\d+)\/(\d+)/)
        if (m) yearCounters[m[2]] = Math.max(yearCounters[m[2]] ?? 0, parseInt(m[1], 10))
      }
    })
    // Restaurar orden original (más reciente primero)
    const legsMigradas = legsRaw.map(l => legsOrdenadas.find(o => o.id === l.id) ?? l)
    if (needsSave) saveLS('cal2_legalizaciones', legsMigradas)
    setLegalizaciones(legsMigradas)

    // Restaurar usuario logueado
    const uid = getLoggedUserId()
    if (uid) {
      const found = personas.find((p: PersonaStore) => p.id === uid)
      if (found) setCurrentUserState(found)
    }
    setReady(true)
  }, [])

  function setCurrentUser(p: PersonaStore | null) {
    setCurrentUserState(p)
    setLoggedUserId(p?.id ?? null)
  }

  function addProyecto(p: Omit<Proyecto, 'id' | 'createdAt'>) {
    const newP: Proyecto = { ...p, id: `p${Date.now()}`, createdAt: new Date().toISOString() }
    const next = [newP, ...proyectos]
    setProyectos(next); saveLS('cal2_proyectos', next)
    addNotificacionInternal({
      tipo: 'proyecto_nuevo',
      titulo: 'Nuevo proyecto creado',
      mensaje: `Se creó el proyecto "${p.nombre}" para ${p.cliente}.`,
      para: 'todos',
      href: '/proyectos',
    })
  }

  function updateProyecto(id: string, changes: Partial<Proyecto>) {
    const old = proyectos.find(p => p.id === id)
    if (changes.estadoComercial === 'Vendido' && old?.estadoComercial !== 'Vendido') {
      addNotificacionInternal({
        tipo: 'proyecto_vendido',
        titulo: '¡Proyecto vendido!',
        mensaje: `"${old?.nombre ?? ''}" cambió a Vendido.`,
        para: 'todos',
        href: '/proyectos',
      })
    }
    const next = proyectos.map(p => p.id === id ? { ...p, ...changes } : p)
    setProyectos(next); saveLS('cal2_proyectos', next)
  }

  function addRegistro(r: Omit<RegistroTiempo, 'id' | 'createdAt'>) {
    const newR: RegistroTiempo = { ...r, id: `r${Date.now()}`, createdAt: new Date().toISOString() }
    const next = [newR, ...registros]
    setRegistros(next); saveLS('cal2_registros', next)
  }

  function updateRegistro(id: string, changes: Partial<RegistroTiempo>) {
    const next = registros.map(r => r.id === id ? { ...r, ...changes } : r)
    setRegistros(next); saveLS('cal2_registros', next)
  }

  function deleteRegistro(id: string) {
    const next = registros.filter(r => r.id !== id)
    setRegistros(next); saveLS('cal2_registros', next)
  }

  function addCliente(c: Omit<Cliente, 'id' | 'createdAt'>) {
    const newC: Cliente = { ...c, id: `cl${Date.now()}`, createdAt: new Date().toISOString() }
    const next = [newC, ...clientes]
    setClientes(next); saveLS('cal2_clientes', next)
  }

  function updateCliente(id: string, changes: Partial<Cliente>) {
    const next = clientes.map(c => c.id === id ? { ...c, ...changes } : c)
    setClientes(next); saveLS('cal2_clientes', next)
  }

  function addProspecto(p: Omit<Prospecto, 'id' | 'createdAt'>) {
    const newP: Prospecto = { ...p, id: `pr${Date.now()}`, createdAt: new Date().toISOString() }
    const next = [newP, ...prospectos]
    setProspectos(next); saveLS('cal2_prospectos', next)
  }

  function updateProspecto(id: string, changes: Partial<Prospecto>) {
    const next = prospectos.map(p => p.id === id ? { ...p, ...changes } : p)
    setProspectos(next); saveLS('cal2_prospectos', next)
  }

  function addPersonaStore(p: Omit<PersonaStore, 'id'>) {
    const newP: PersonaStore = { ...p, id: `ps${Date.now()}` }
    const next = [...personasStore, newP]
    setPersonasStore(next); saveLS('cal2_personas_store', next)
  }

  function updatePersonaStore(id: string, changes: Partial<PersonaStore>) {
    const next = personasStore.map(p => p.id === id ? { ...p, ...changes } : p)
    setPersonasStore(next); saveLS('cal2_personas_store', next)
    // Actualizar currentUser si es el mismo
    if (currentUser?.id === id) setCurrentUserState(prev => prev ? { ...prev, ...changes } : prev)
  }

  function updatePlanOverride(key: string, changes: { dias?: string[]; estado?: 'En proceso' | 'Finalizado' }) {
    const current = planOverrides[key] ?? { dias: [], estado: 'En proceso' as const }
    const next = { ...planOverrides, [key]: { ...current, ...changes } }
    setPlanOverrides(next); saveLS('cal2_plan_overrides', next)
  }

  function addLegalizacion(l: Omit<Legalizacion, 'id' | 'createdAt' | 'codigo'>): string {
    const id = `lg${Date.now()}`
    const year = new Date().getFullYear().toString().slice(2)
    // Busca el mayor consecutivo existente para el año en curso
    const maxSeq = legalizaciones.reduce((max, leg) => {
      const m = leg.codigo?.match(/SE-LG-(\d+)\/(\d+)/)
      if (m && m[2] === year) return Math.max(max, parseInt(m[1], 10))
      return max
    }, 0)
    const codigo = `SE-LG-${String(maxSeq + 1).padStart(3, '0')}/${year}`
    const newL: Legalizacion = { ...l, id, codigo, createdAt: new Date().toISOString() }
    const next = [newL, ...legalizaciones]
    setLegalizaciones(next); saveLS('cal2_legalizaciones', next)
    return id
  }

  function updateLegalizacion(id: string, changes: Partial<Legalizacion>) {
    const next = legalizaciones.map(l => l.id === id ? { ...l, ...changes } : l)
    setLegalizaciones(next); saveLS('cal2_legalizaciones', next)
  }

  function addTarjetaCorp(t: Omit<TarjetaCorporativa, 'id' | 'createdAt'>) {
    const newT: TarjetaCorporativa = { ...t, id: `tc${Date.now()}`, createdAt: new Date().toISOString() }
    const next = [...tarjetasCorp, newT]
    setTarjetasCorp(next); saveLS('cal2_tarjetas_corp', next)
  }

  function updateTarjetaCorp(id: string, changes: Partial<TarjetaCorporativa>) {
    const next = tarjetasCorp.map(t => t.id === id ? { ...t, ...changes } : t)
    setTarjetasCorp(next); saveLS('cal2_tarjetas_corp', next)
  }

  function addDocumentoTC(d: Omit<DocumentoTC, 'id' | 'createdAt'>): string {
    const id = `dtc${Date.now()}`
    const newD: DocumentoTC = { ...d, id, createdAt: new Date().toISOString() }
    const next = [newD, ...documentosTC]
    setDocumentosTC(next); saveLS('cal2_documentos_tc', next)
    return id
  }

  function updateDocumentoTC(id: string, changes: Partial<DocumentoTC>) {
    const next = documentosTC.map(d => d.id === id ? { ...d, ...changes } : d)
    setDocumentosTC(next); saveLS('cal2_documentos_tc', next)
  }

  function deleteDocumentoTC(id: string) {
    const next = documentosTC.filter(d => d.id !== id)
    setDocumentosTC(next); saveLS('cal2_documentos_tc', next)
  }

  function addNotificacionInternal(n: Omit<Notificacion, 'id' | 'leida' | 'createdAt'>) {
    const newN: Notificacion = { ...n, id: `notif${Date.now()}`, leida: false, createdAt: new Date().toISOString() }
    setNotificaciones(prev => {
      const next = [newN, ...prev]
      saveLS('cal2_notificaciones', next)
      return next
    })
  }

  function addNotificacion(n: Omit<Notificacion, 'id' | 'leida' | 'createdAt'>) {
    addNotificacionInternal(n)
  }

  function marcarLeida(id: string) {
    setNotificaciones(prev => {
      const next = prev.map(n => n.id === id ? { ...n, leida: true } : n)
      saveLS('cal2_notificaciones', next)
      return next
    })
  }

  function marcarTodasLeidas() {
    setNotificaciones(prev => {
      const next = prev.map(n => ({ ...n, leida: true }))
      saveLS('cal2_notificaciones', next)
      return next
    })
  }

  return (
    <Ctx.Provider value={{
      proyectos, addProyecto, updateProyecto,
      registros, addRegistro, updateRegistro, deleteRegistro,
      clientes, addCliente, updateCliente,
      prospectos, addProspecto, updateProspecto,
      personasStore, addPersonaStore, updatePersonaStore,
      currentUser, setCurrentUser,
      ready,
      planOverrides, updatePlanOverride,
      legalizaciones, addLegalizacion, updateLegalizacion,
      tarjetasCorp, addTarjetaCorp, updateTarjetaCorp,
      documentosTC, addDocumentoTC, updateDocumentoTC, deleteDocumentoTC,
      notificaciones, addNotificacion, marcarLeida, marcarTodasLeidas,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be inside StoreProvider')
  return ctx
}
