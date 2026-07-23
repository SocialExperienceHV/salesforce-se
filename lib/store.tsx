'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'

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
  centroCosto?: string
  montoRealVendido?: number
  costoCreatividad?: number
  diaTrafico?: string
  estadoTrafico?: string
  personasProduccion?: string[]
  personasCreatividad?: string[]
  accionProduccion?: string
  accionCreatividad?: string
  // Proyectos "OT" de re-numeración/transición que ya se contaron una vez bajo
  // otro centro de costo: se ocultan de Proyectos y Seguimiento (listas y KPIs)
  // para no duplicar valores en los reportes, sin borrar el registro (Gespro
  // sigue necesitando el centro de costo para sus propios cruces).
  excluirDeReportes?: boolean
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
  email: string
  clave: string
  permiso: string
  estado: 'Activo' | 'Inactivo'
  foto?: string
  cedula?: string
  jefe?: string
}

export type ContactoCliente = {
  id: string
  area: string
  personas: { nombre: string; email?: string; telefono?: string }[]
}

export type Cliente = {
  id: string
  nombre: string
  iniciales: string
  color: string
  logo?: string
  ejecutivo: string
  subclientes: string[]
  proyectos: number
  estado: 'Activo' | 'Inactivo'
  createdAt: string
  contactos?: ContactoCliente[]
  // Clientes históricos a los que ya no se les vende, pero que se mantienen en
  // el sistema (Clientes, Proyectos, Seguimiento no se ven afectados). Solo se
  // usa para sacarlos del listado de Dashboard Comercial, evitando llenarlo de
  // cuentas que ya no aplican para proyección; se puede reactivar en cualquier
  // momento desde ese mismo módulo.
  inactivoComercial?: boolean
}

export type GastoLegalizacion = {
  tipoFactura: 'FE' | 'Documento equivalente' | 'Documento en el exterior' | 'Cuenta de cobro'
  id: string
  centroCosto: string
  tipoGasto: string
  ciudadFecha: string
  descripcion: string
  pesos: number
  usd: number
  tasaCambio: number
  total: number
  soporteNombre?: string
  soporteData?: string
  soporteCuentaNombre?: string
  soporteCuentaData?: string
  cedulaCuentaCobro?: string
}

export type HistorialLeg = {
  fecha: string
  usuario: string
  accion: string
  observacion?: string
}

export type Legalizacion = {
  id: string
  codigo: string
  fecha: string
  tipoDocumento: string
  tipoLegalizacion: string
  noAnticipo: string
  fechaReembolso: string
  responsable: string
  cargo: string
  proyectoId: string
  proyecto: string
  centroCosto: string
  productor: string
  cliente: string
  gastos: GastoLegalizacion[]
  anticipo: number
  observaciones: string
  estado: string
  observacionContabilidad?: string
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
  item?: string
  fechaItem?: string
  gespro?: 'Cargado' | 'No Cargado'
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
  tipo: 'proyecto_nuevo' | 'proyecto_vendido' | 'asignacion' | 'prospecto_nuevo'
  titulo: string
  mensaje: string
  para: string | 'todos'
  leida: boolean
  href?: string
  createdAt: string
}

// Meta de venta de un cliente para un año dado, desglosada por mes ('1'..'12' → monto).
// El total anual es simplemente la suma de los 12 meses.
export type MetaComercial = {
  id: string
  cliente: string
  anio: number
  meses: Record<string, number>
  createdAt: string
}

// Meta global de la agencia para un año, con el mismo desglose mensual. Es un
// número independiente (no la suma de las metas por cliente).
export type MetaGlobal = {
  id: string
  anio: number
  meses: Record<string, number>
  createdAt: string
}

// Meta de venta de un KAM para un año, igual de independiente que la meta global
// (no es la suma de las metas de sus clientes) — es la cuota propia del KAM.
export type MetaKam = {
  id: string
  kam: string
  anio: number
  meses: Record<string, number>
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

// ─── Initial personas (seed only if DB is empty) ───────────────────────────────

const INIT_PERSONAS_STORE: PersonaStore[] = [
  { id: 'ps1',  nombre: 'Santiago González', area: 'Creatividad',       cargo: 'Líder Creativo',        costoMensual: 7800000, email: 'santiago.gonzalez@socialexperience.com.co', clave: '1234', permiso: 'Líder',             estado: 'Activo' },
  { id: 'ps2',  nombre: 'Nicola Aranza',     area: 'Creatividad',       cargo: 'Copy Creativo',         costoMensual: 4500000, email: 'nicola.aranza@socialexperience.com.co',     clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps3',  nombre: 'Nicolás Suárez',    area: 'Audiovisual',       cargo: 'Diseñador Industrial',  costoMensual: 5200000, email: 'nicolas.suarez@socialexperience.com.co',    clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps4',  nombre: 'Luisa Navarro',     area: 'Diseño gráfico',    cargo: 'Líder Gráfico',         costoMensual: 7000000, email: 'luisa.navarro@socialexperience.com.co',     clave: '1234', permiso: 'Líder',             estado: 'Activo' },
  { id: 'ps5',  nombre: 'Álvaro',            area: 'Diseño gráfico',    cargo: 'Diseñador Gráfico',     costoMensual: 4200000, email: 'alvaro@socialexperience.com.co',            clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps6',  nombre: 'Kate',              area: 'Diseño gráfico',    cargo: 'Diseñador Gráfico',     costoMensual: 4200000, email: 'kate@socialexperience.com.co',              clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps7',  nombre: 'Jonathan Ramírez',  area: 'Diseño industrial', cargo: 'Líder Industrial',      costoMensual: 7000000, email: 'jonathan.ramirez@socialexperience.com.co', clave: '1234', permiso: 'Líder',             estado: 'Activo' },
  { id: 'ps8',  nombre: 'Felipe Aguilón',    area: 'Comercial',         cargo: 'KAM',                   costoMensual: 7500000, email: 'felipe@socialexperience.com.co',           clave: 'FA123456', permiso: 'Super Admin',   estado: 'Activo' },
  { id: 'ps9',  nombre: 'Hans Vargas',       area: 'Comercial',         cargo: 'KAM',                   costoMensual: 9600000, email: 'hans@socialexperience.com.co',             clave: 'hans2026', permiso: 'Super Admin',   estado: 'Activo' },
  { id: 'ps10', nombre: 'Iván Londoño',      area: 'Comercial',         cargo: 'KAM',                   costoMensual: 7200000, email: 'ivan.londono@socialexperience.com.co',     clave: '1234', permiso: 'KAM',               estado: 'Activo' },
  { id: 'ps11', nombre: 'Francisco Cárdenas',area: 'Producción',        cargo: 'Director Producción',   costoMensual: 8500000, email: 'francisco.cardenas@socialexperience.com.co',clave: '1234', permiso: 'Líder Producción',  estado: 'Activo' },
  { id: 'ps12', nombre: 'Andrés Arellano',   area: 'Producción',        cargo: 'Productor Sr',          costoMensual: 6600000, email: 'andres.arellano@socialexperience.com.co',  clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps13', nombre: 'Carlos Bustamante', area: 'Producción',        cargo: 'Productor Sr',          costoMensual: 6400000, email: 'carlos.bustamante@socialexperience.com.co',clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps14', nombre: 'Manuel Parra',      area: 'Producción',        cargo: 'Coordinador',           costoMensual: 4800000, email: 'manuel.parra@socialexperience.com.co',     clave: '1234', permiso: 'Producción',        estado: 'Activo' },
  { id: 'ps15', nombre: 'Juan Vargas',       area: 'Administración',    cargo: 'Administrativo',        costoMensual: 5000000, email: 'juan.vargas@socialexperience.com.co',      clave: '1234', permiso: 'Administración',    estado: 'Activo' },
]

// ─── Auth helpers ──────────────────────────────────────────────────────────────

export function getLoggedUserId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('cal2_logged_user_id')
}

export function setLoggedUserId(id: string | null) {
  if (id) localStorage.setItem('cal2_logged_user_id', id)
  else localStorage.removeItem('cal2_logged_user_id')
}

// ─── Supabase helpers ──────────────────────────────────────────────────────────

// Supabase/PostgREST solo devuelve 1000 filas por consulta por defecto. Sin
// paginar, cualquier tabla que supere ese tamaño (como ya le pasó a
// "proyectos") pierde filas en silencio para todos los usuarios.
async function sbGet<T>(table: string): Promise<T[]> {
  const PAGE = 1000
  const all: { data: T }[] = []
  let from = 0
  for (;;) {
    const { data } = await supabase.from(table).select('data').range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    all.push(...(data as { data: T }[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return all.map(r => r.data)
}

async function sbGetOverrides(): Promise<Record<string, { dias: string[]; estado: 'En proceso' | 'Finalizado' }>> {
  const PAGE = 1000
  type Row = { key: string; data: { dias: string[]; estado: 'En proceso' | 'Finalizado' } }
  const all: Row[] = []
  let from = 0
  for (;;) {
    const { data } = await supabase.from('plan_overrides').select('key, data').range(from, from + PAGE - 1)
    if (!data || data.length === 0) break
    all.push(...(data as Row[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  const result: Record<string, { dias: string[]; estado: 'En proceso' | 'Finalizado' }> = {}
  all.forEach(r => { result[r.key] = r.data })
  return result
}

async function sbInsert(table: string, id: string, data: unknown) {
  await supabase.from(table).insert({ id, data })
}

async function sbUpdate(table: string, id: string, data: unknown) {
  await supabase.from(table).update({ data }).eq('id', id)
}

async function sbDelete(table: string, id: string) {
  await supabase.from(table).delete().eq('id', id)
}

async function sbUpsert(table: string, id: string, data: unknown) {
  await supabase.from(table).upsert({ id, data })
}

async function sbUpsertOverride(key: string, data: unknown) {
  await supabase.from('plan_overrides').upsert({ key, data })
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

  metasComerciales: MetaComercial[]
  upsertMetaComercial: (cliente: string, anio: number, meses: Record<string, number>) => void

  metasGlobales: MetaGlobal[]
  upsertMetaGlobal: (anio: number, meses: Record<string, number>) => void

  metasKam: MetaKam[]
  upsertMetaKam: (kam: string, anio: number, meses: Record<string, number>) => void
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [proyectos, setProyectos]         = useState<Proyecto[]>([])
  const [registros, setRegistros]         = useState<RegistroTiempo[]>([])
  const [clientes, setClientes]           = useState<Cliente[]>([])
  const [prospectos, setProspectos]       = useState<Prospecto[]>([])
  const [personasStore, setPersonasStore] = useState<PersonaStore[]>([])
  const [planOverrides, setPlanOverrides] = useState<Record<string, { dias: string[]; estado: 'En proceso' | 'Finalizado' }>>({})
  const [legalizaciones, setLegalizaciones] = useState<Legalizacion[]>([])
  const [tarjetasCorp, setTarjetasCorp]   = useState<TarjetaCorporativa[]>([])
  const [documentosTC, setDocumentosTC]   = useState<DocumentoTC[]>([])
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [metasComerciales, setMetasComerciales] = useState<MetaComercial[]>([])
  const [metasGlobales, setMetasGlobales] = useState<MetaGlobal[]>([])
  const [metasKam, setMetasKam] = useState<MetaKam[]>([])
  const [currentUser, setCurrentUserState] = useState<PersonaStore | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function loadAll() {
      const [
        personasData, proyectosData, clientesData, prospectosData,
        legalizacionesData, tarjetasData, documentosTCData,
        registrosData, notificacionesData, overridesData,
        metasComercialesData, metasGlobalesData, metasKamData
      ] = await Promise.all([
        sbGet<PersonaStore>('personas'),
        sbGet<Proyecto>('proyectos'),
        sbGet<Cliente>('clientes'),
        sbGet<Prospecto>('prospectos'),
        sbGet<Legalizacion>('legalizaciones'),
        sbGet<TarjetaCorporativa>('tarjetas_corp'),
        sbGet<DocumentoTC>('documentos_tc'),
        sbGet<RegistroTiempo>('registros_tiempo'),
        sbGet<Notificacion>('notificaciones'),
        sbGetOverrides(),
        sbGet<MetaComercial>('metas_comerciales'),
        sbGet<MetaGlobal>('metas_globales'),
        sbGet<MetaKam>('metas_kam'),
      ])

      // Seed personas if DB is empty
      let personas = personasData
      if (personas.length === 0) {
        await Promise.all(INIT_PERSONAS_STORE.map(p => sbInsert('personas', p.id, p)))
        personas = INIT_PERSONAS_STORE
      }

      setPersonasStore(personas)
      setProyectos(proyectosData)
      setClientes(clientesData)
      setProspectos(prospectosData)
      setLegalizaciones(legalizacionesData)
      setTarjetasCorp(tarjetasData)
      setDocumentosTC(documentosTCData)
      setRegistros(registrosData)
      setNotificaciones(notificacionesData)
      setPlanOverrides(overridesData)
      setMetasComerciales(metasComercialesData)
      setMetasGlobales(metasGlobalesData)
      setMetasKam(metasKamData)

      // Restore logged user
      const uid = getLoggedUserId()
      if (uid) {
        const found = personas.find(p => p.id === uid)
        if (found) setCurrentUserState(found)
      }
      setReady(true)
    }
    loadAll()
  }, [])

  function setCurrentUser(p: PersonaStore | null) {
    setCurrentUserState(p)
    setLoggedUserId(p?.id ?? null)
  }

  function addProyecto(p: Omit<Proyecto, 'id' | 'createdAt'>) {
    // Centro de costo autogenerado desde la creación (ya no se espera a "Vendido").
    // Los centros de costo nuevos arrancan en 1800 en adelante (los existentes,
    // asignados manualmente antes de este cambio, quedan todos por debajo).
    const usados = proyectos
      .map(pr => parseInt((pr.centroCosto || '').trim(), 10))
      .filter(n => !isNaN(n))
    const centroCosto = String(Math.max(1799, ...usados) + 1)
    const newP: Proyecto = { ...p, centroCosto, id: `p${Date.now()}`, createdAt: new Date().toISOString() }
    setProyectos(prev => [newP, ...prev])
    sbInsert('proyectos', newP.id, newP)
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
    // Si el proyecto deja de estar "Vendido" (se reabre la negociación, vuelve a
    // propuesta, etc.), se borra la Venta Real: ya no aplica mientras no esté
    // cerrado de nuevo, para no dejar un valor de venta obsoleto visible.
    if (changes.estadoComercial && changes.estadoComercial !== 'Vendido' && old?.estadoComercial === 'Vendido') {
      changes = { ...changes, montoRealVendido: undefined }
    }
    if (changes.estadoComercial === 'Vendido' && old?.estadoComercial !== 'Vendido') {
      addNotificacionInternal({
        tipo: 'proyecto_vendido',
        titulo: '¡Proyecto vendido!',
        mensaje: `"${old?.nombre ?? ''}" cambió a Vendido.`,
        para: 'todos',
        href: '/proyectos',
      })
      const proyectoActualizado = { ...old, ...changes }
      fetch('/api/enviar-proyecto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centroCosto: proyectoActualizado.centroCosto ?? '',
          nombre: proyectoActualizado.nombre ?? '',
          cliente: proyectoActualizado.cliente ?? '',
          monto: proyectoActualizado.montoRealVendido ?? proyectoActualizado.monto,
          fechaInicio: proyectoActualizado.fechaInicio,
          fechaEntrega: proyectoActualizado.fechaEntrega,
        }),
      }).catch(() => {})
    }
    setProyectos(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...changes } : p)
      const updated = next.find(p => p.id === id)!
      sbUpdate('proyectos', id, updated)
      return next
    })
  }

  function addRegistro(r: Omit<RegistroTiempo, 'id' | 'createdAt'>) {
    const newR: RegistroTiempo = { ...r, id: `r${Date.now()}`, createdAt: new Date().toISOString() }
    setRegistros(prev => [newR, ...prev])
    sbInsert('registros_tiempo', newR.id, newR)
  }

  function updateRegistro(id: string, changes: Partial<RegistroTiempo>) {
    setRegistros(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...changes } : r)
      const updated = next.find(r => r.id === id)!
      sbUpdate('registros_tiempo', id, updated)
      return next
    })
  }

  function deleteRegistro(id: string) {
    setRegistros(prev => prev.filter(r => r.id !== id))
    sbDelete('registros_tiempo', id)
  }

  function addCliente(c: Omit<Cliente, 'id' | 'createdAt'>) {
    const newC: Cliente = { ...c, id: `cl${Date.now()}`, createdAt: new Date().toISOString() }
    setClientes(prev => [newC, ...prev])
    sbInsert('clientes', newC.id, newC)
  }

  function updateCliente(id: string, changes: Partial<Cliente>) {
    setClientes(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...changes } : c)
      const updated = next.find(c => c.id === id)!
      sbUpdate('clientes', id, updated)
      return next
    })
  }

  function addProspecto(p: Omit<Prospecto, 'id' | 'createdAt'>) {
    const newP: Prospecto = { ...p, id: `pr${Date.now()}`, createdAt: new Date().toISOString() }
    setProspectos(prev => [newP, ...prev])
    sbInsert('prospectos', newP.id, newP)
    // Avisar a todos los KAM (área Comercial) cuando entra un prospecto nuevo
    personasStore
      .filter(persona => persona.area === 'Comercial')
      .forEach(kam => {
        addNotificacionInternal({
          tipo: 'prospecto_nuevo',
          titulo: 'Nuevo prospecto',
          mensaje: `Se agregó "${p.empresa}" como nuevo prospecto.`,
          para: kam.id,
          href: '/prospeccion',
        })
      })
  }

  function updateProspecto(id: string, changes: Partial<Prospecto>) {
    setProspectos(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...changes } : p)
      const updated = next.find(p => p.id === id)!
      sbUpdate('prospectos', id, updated)
      return next
    })
  }

  function addPersonaStore(p: Omit<PersonaStore, 'id'>) {
    const newP: PersonaStore = { ...p, id: `ps${Date.now()}` }
    setPersonasStore(prev => [...prev, newP])
    sbInsert('personas', newP.id, newP)
  }

  function updatePersonaStore(id: string, changes: Partial<PersonaStore>) {
    setPersonasStore(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...changes } : p)
      const updated = next.find(p => p.id === id)!
      sbUpdate('personas', id, updated)
      return next
    })
    if (currentUser?.id === id) setCurrentUserState(prev => prev ? { ...prev, ...changes } : prev)
  }

  function updatePlanOverride(key: string, changes: { dias?: string[]; estado?: 'En proceso' | 'Finalizado' }) {
    const current = planOverrides[key] ?? { dias: [], estado: 'En proceso' as const }
    const updated = { ...current, ...changes }
    setPlanOverrides(prev => ({ ...prev, [key]: updated }))
    sbUpsertOverride(key, updated)
  }

  function addLegalizacion(l: Omit<Legalizacion, 'id' | 'createdAt' | 'codigo'>): string {
    const id = `lg${Date.now()}`
    const year = new Date().getFullYear().toString().slice(2)
    const maxSeq = legalizaciones.reduce((max, leg) => {
      const m = leg.codigo?.match(/SE-LG-(\d+)\/(\d+)/)
      if (m && m[2] === year) return Math.max(max, parseInt(m[1], 10))
      return max
    }, 0)
    const codigo = `SE-LG-${String(maxSeq + 1).padStart(3, '0')}/${year}`
    const newL: Legalizacion = { ...l, id, codigo, createdAt: new Date().toISOString() }
    setLegalizaciones(prev => [newL, ...prev])
    sbInsert('legalizaciones', newL.id, newL)
    return id
  }

  function updateLegalizacion(id: string, changes: Partial<Legalizacion>) {
    setLegalizaciones(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...changes } : l)
      const updated = next.find(l => l.id === id)!
      sbUpdate('legalizaciones', id, updated)
      return next
    })
  }

  function addTarjetaCorp(t: Omit<TarjetaCorporativa, 'id' | 'createdAt'>) {
    const newT: TarjetaCorporativa = { ...t, id: `tc${Date.now()}`, createdAt: new Date().toISOString() }
    setTarjetasCorp(prev => [...prev, newT])
    sbInsert('tarjetas_corp', newT.id, newT)
  }

  function updateTarjetaCorp(id: string, changes: Partial<TarjetaCorporativa>) {
    setTarjetasCorp(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...changes } : t)
      const updated = next.find(t => t.id === id)!
      sbUpdate('tarjetas_corp', id, updated)
      return next
    })
  }

  function addDocumentoTC(d: Omit<DocumentoTC, 'id' | 'createdAt'>): string {
    const id = `dtc${Date.now()}`
    const newD: DocumentoTC = { ...d, id, createdAt: new Date().toISOString() }
    setDocumentosTC(prev => [newD, ...prev])
    sbInsert('documentos_tc', newD.id, newD)
    return id
  }

  function updateDocumentoTC(id: string, changes: Partial<DocumentoTC>) {
    setDocumentosTC(prev => {
      const next = prev.map(d => d.id === id ? { ...d, ...changes } : d)
      const updated = next.find(d => d.id === id)!
      sbUpdate('documentos_tc', id, updated)
      return next
    })
  }

  function deleteDocumentoTC(id: string) {
    setDocumentosTC(prev => prev.filter(d => d.id !== id))
    sbDelete('documentos_tc', id)
  }

  function addNotificacionInternal(n: Omit<Notificacion, 'id' | 'leida' | 'createdAt'>) {
    // Sufijo aleatorio: cuando se notifica a varias personas en el mismo bucle
    // (p.ej. todos los KAM), Date.now() solo no alcanza a diferenciarlas y las
    // filas se pisan en Supabase (mismo id primary key).
    const newN: Notificacion = { ...n, id: `notif${Date.now()}${Math.random().toString(36).slice(2, 8)}`, leida: false, createdAt: new Date().toISOString() }
    setNotificaciones(prev => [newN, ...prev])
    sbInsert('notificaciones', newN.id, newN)
  }

  function addNotificacion(n: Omit<Notificacion, 'id' | 'leida' | 'createdAt'>) {
    addNotificacionInternal(n)
  }

  function marcarLeida(id: string) {
    setNotificaciones(prev => {
      const next = prev.map(n => n.id === id ? { ...n, leida: true } : n)
      const updated = next.find(n => n.id === id)!
      sbUpdate('notificaciones', id, updated)
      return next
    })
  }

  function marcarTodasLeidas() {
    setNotificaciones(prev => {
      const next = prev.map(n => ({ ...n, leida: true }))
      next.forEach(n => sbUpdate('notificaciones', n.id, n))
      return next
    })
  }

  function upsertMetaComercial(cliente: string, anio: number, meses: Record<string, number>) {
    // Id determinístico (cliente+año) para que guardar siempre sea un upsert,
    // sin necesitar buscar primero si ya existía la fila.
    const id = `mc_${anio}_${cliente.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_')}`
    setMetasComerciales(prev => {
      const existing = prev.find(m => m.id === id)
      const newM: MetaComercial = { id, cliente, anio, meses, createdAt: existing?.createdAt ?? new Date().toISOString() }
      sbUpsert('metas_comerciales', id, newM)
      return existing ? prev.map(m => m.id === id ? newM : m) : [newM, ...prev]
    })
  }

  function upsertMetaGlobal(anio: number, meses: Record<string, number>) {
    const id = `mg_${anio}`
    setMetasGlobales(prev => {
      const existing = prev.find(m => m.id === id)
      const newM: MetaGlobal = { id, anio, meses, createdAt: existing?.createdAt ?? new Date().toISOString() }
      sbUpsert('metas_globales', id, newM)
      return existing ? prev.map(m => m.id === id ? newM : m) : [newM, ...prev]
    })
  }

  function upsertMetaKam(kam: string, anio: number, meses: Record<string, number>) {
    const id = `mk_${anio}_${kam.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_')}`
    setMetasKam(prev => {
      const existing = prev.find(m => m.id === id)
      const newM: MetaKam = { id, kam, anio, meses, createdAt: existing?.createdAt ?? new Date().toISOString() }
      sbUpsert('metas_kam', id, newM)
      return existing ? prev.map(m => m.id === id ? newM : m) : [newM, ...prev]
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
      metasComerciales, upsertMetaComercial,
      metasGlobales, upsertMetaGlobal,
      metasKam, upsertMetaKam,
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
