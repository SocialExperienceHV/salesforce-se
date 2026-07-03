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
  montoRealVendido?: number       // se llena cuando se cierra la venta
  costoCreatividad?: number       // vendrá del módulo calendar
  rentabilidadProduccion?: number // % rentabilidad, se pone manualmente
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
  createdAt: string
}

export type Cliente = {
  id: string
  nombre: string
  iniciales: string
  color: string
  logo?: string        // base64 data URL
  ejecutivo: string
  subclientes: string[]
  proyectos: number
  estado: 'Activo' | 'Inactivo'
  createdAt: string
}

export type Prospecto = {
  id: string
  empresa: string
  contacto: string
  fase: string
  ejecutivo: string
  valor: number
  fechaContacto: string
  notas: string
  createdAt: string
}

// ─── Initial mock data ─────────────────────────────────────────────────────────

const INIT_PROYECTOS: Proyecto[] = [
  { id: 'p1', nombre: 'Campaña Aniversario Éxito 82 años', cliente: 'Grupo Éxito', subcliente: 'Éxito Retail', ejecutivo: 'María Torres', tipo: 'Campaña', estado: 'Activo', prioridad: 'Alta', fechaInicio: '01/06/2026', fechaEntrega: '30/09/2026', fechaPresentacion: '19/09/2026', monto: 68000000, estadoComercial: 'En negociación', descripcion: '', createdAt: '2026-06-01' },
  { id: 'p2', nombre: 'Lanzamiento Cuenta Pyme Digital', cliente: 'Banco Falabella', subcliente: 'Banca Pyme', ejecutivo: 'Juan Camilo', tipo: 'Lanzamiento', estado: 'Activo', prioridad: 'Alta', fechaInicio: '01/06/2026', fechaEntrega: '25/08/2026', fechaPresentacion: '25/08/2026', monto: 120000000, estadoComercial: 'Vendido', descripcion: '', createdAt: '2026-06-01' },
  { id: 'p3', nombre: 'Campaña Acumulación de Millas', cliente: 'Avianca', subcliente: 'Avianca Plus', ejecutivo: 'Laura Medina', tipo: 'Campaña', estado: 'Activo', prioridad: 'Alta', fechaInicio: '20/05/2026', fechaEntrega: '10/08/2026', fechaPresentacion: '10/08/2026', monto: 85000000, estadoComercial: 'Vendido', descripcion: '', createdAt: '2026-05-20' },
  { id: 'p4', nombre: 'Catálogo Primavera Homecenter', cliente: 'Homecenter', subcliente: 'Homecenter Colombia', ejecutivo: 'Felipe Agudelo', tipo: 'Catálogo', estado: 'Activo', prioridad: 'Medio', fechaInicio: '25/06/2026', fechaEntrega: '11/09/2026', fechaPresentacion: '25/09/2026', monto: 90000000, estadoComercial: 'En propuesta', descripcion: '', createdAt: '2026-06-25' },
  { id: 'p5', nombre: 'Educación Financiera Q4', cliente: 'Bancolombia', subcliente: 'Personas', ejecutivo: 'Hans Vargas', tipo: 'Campaña', estado: 'Activo', prioridad: 'Medio', fechaInicio: '24/06/2026', fechaEntrega: '09/09/2026', fechaPresentacion: '24/09/2026', monto: 55000000, estadoComercial: 'En propuesta', descripcion: '', createdAt: '2026-06-24' },
  { id: 'p6', nombre: 'Activación Mundial Banco Falabella', cliente: 'Banco Falabella', subcliente: 'Bienestar', ejecutivo: 'Hans Vargas', tipo: 'Activación', estado: 'Activo', prioridad: 'Alta', fechaInicio: '15/06/2026', fechaEntrega: '22/09/2026', fechaPresentacion: '15/09/2026', monto: 45000000, estadoComercial: 'En propuesta', descripcion: '', createdAt: '2026-06-15' },
]

const INIT_CLIENTES: Cliente[] = [
  { id: 'c1', nombre: 'Banco Falabella', iniciales: 'BF', color: '#16a34a', ejecutivo: 'Hans Vargas', subclientes: ['Banca Personas', 'Banca Pyme', 'Banca Premium', 'Bienestar'], proyectos: 8, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c2', nombre: 'Grupo Éxito', iniciales: 'GÉ', color: '#e53935', ejecutivo: 'María Torres', subclientes: ['Éxito Retail', 'Carulla', 'Surtimax'], proyectos: 6, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c3', nombre: 'Avianca', iniciales: 'AV', color: '#c62828', ejecutivo: 'Laura Medina', subclientes: ['Avianca Plus', 'LifeMiles'], proyectos: 4, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c4', nombre: 'Homecenter', iniciales: 'HC', color: '#f97316', ejecutivo: 'Laura Medina', subclientes: ['Homecenter Colombia'], proyectos: 5, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c5', nombre: 'Preventiva Seguros', iniciales: 'PS', color: '#2563eb', ejecutivo: 'David Ruiz', subclientes: ['Seguros Generales', 'Seguros Vida'], proyectos: 3, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c6', nombre: 'Davivienda', iniciales: 'DV', color: '#dc2626', ejecutivo: 'Juan Camilo', subclientes: ['Banca Personas', 'Daviplata'], proyectos: 4, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c7', nombre: 'Sura', iniciales: 'SR', color: '#0284c7', ejecutivo: 'David Ruiz', subclientes: ['EPS Sura', 'ARL Sura'], proyectos: 2, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c8', nombre: 'Bancolombia', iniciales: 'BC', color: '#ca8a04', ejecutivo: 'Hans Vargas', subclientes: ['Personas', 'Pymes', 'Empresas'], proyectos: 7, estado: 'Activo', createdAt: '2026-01-01' },
]

const INIT_REGISTROS: RegistroTiempo[] = []
const INIT_PROSPECTOS: Prospecto[] = []

// ─── Context ───────────────────────────────────────────────────────────────────

type StoreCtx = {
  proyectos: Proyecto[]
  addProyecto: (p: Omit<Proyecto, 'id' | 'createdAt'>) => void
  updateProyecto: (id: string, changes: Partial<Proyecto>) => void

  registros: RegistroTiempo[]
  addRegistro: (r: Omit<RegistroTiempo, 'id' | 'createdAt'>) => void

  clientes: Cliente[]
  addCliente: (c: Omit<Cliente, 'id' | 'createdAt'>) => void
  updateCliente: (id: string, changes: Partial<Cliente>) => void

  prospectos: Prospecto[]
  addProspecto: (p: Omit<Prospecto, 'id' | 'createdAt'>) => void
  updateProspecto: (id: string, changes: Partial<Prospecto>) => void
}

const Ctx = createContext<StoreCtx | null>(null)

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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [proyectos, setProyectos] = useState<Proyecto[]>(INIT_PROYECTOS)
  const [registros, setRegistros]   = useState<RegistroTiempo[]>(INIT_REGISTROS)
  const [clientes, setClientes]   = useState<Cliente[]>(INIT_CLIENTES)
  const [prospectos, setProspectos] = useState<Prospecto[]>(INIT_PROSPECTOS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setProyectos(loadLS('cal2_proyectos', INIT_PROYECTOS))
    setRegistros(loadLS('cal2_registros', INIT_REGISTROS))
    setClientes(loadLS('cal2_clientes', INIT_CLIENTES))
    setProspectos(loadLS('cal2_prospectos', INIT_PROSPECTOS))
    setReady(true)
  }, [])

  function addProyecto(p: Omit<Proyecto, 'id' | 'createdAt'>) {
    const newP: Proyecto = { ...p, id: `p${Date.now()}`, createdAt: new Date().toISOString() }
    const next = [newP, ...proyectos]
    setProyectos(next)
    saveLS('cal2_proyectos', next)
  }

  function updateProyecto(id: string, changes: Partial<Proyecto>) {
    const next = proyectos.map(p => p.id === id ? { ...p, ...changes } : p)
    setProyectos(next)
    saveLS('cal2_proyectos', next)
  }

  function addRegistro(r: Omit<RegistroTiempo, 'id' | 'createdAt'>) {
    const newR: RegistroTiempo = { ...r, id: `r${Date.now()}`, createdAt: new Date().toISOString() }
    const next = [newR, ...registros]
    setRegistros(next)
    saveLS('cal2_registros', next)
  }

  function addCliente(c: Omit<Cliente, 'id' | 'createdAt'>) {
    const newC: Cliente = { ...c, id: `cl${Date.now()}`, createdAt: new Date().toISOString() }
    const next = [newC, ...clientes]
    setClientes(next)
    saveLS('cal2_clientes', next)
  }

  function updateCliente(id: string, changes: Partial<Cliente>) {
    const next = clientes.map(c => c.id === id ? { ...c, ...changes } : c)
    setClientes(next)
    saveLS('cal2_clientes', next)
  }

  function addProspecto(p: Omit<Prospecto, 'id' | 'createdAt'>) {
    const newP: Prospecto = { ...p, id: `pr${Date.now()}`, createdAt: new Date().toISOString() }
    const next = [newP, ...prospectos]
    setProspectos(next)
    saveLS('cal2_prospectos', next)
  }

  function updateProspecto(id: string, changes: Partial<Prospecto>) {
    const next = prospectos.map(p => p.id === id ? { ...p, ...changes } : p)
    setProspectos(next)
    saveLS('cal2_prospectos', next)
  }

  if (!ready) return null

  return (
    <Ctx.Provider value={{ proyectos, addProyecto, updateProyecto, registros, addRegistro, clientes, addCliente, updateCliente, prospectos, addProspecto, updateProspecto }}>
      {children}
    </Ctx.Provider>
  )
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be inside StoreProvider')
  return ctx
}
