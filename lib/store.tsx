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
  estado: 'Borrador' | 'En revisión' | 'Devuelta' | 'Aprobada' | 'Cerrada'
  observacionContabilidad?: string
  // Trazabilidad
  creadoPor: string
  historial: HistorialLeg[]
  createdAt: string
}

export type Prospecto = {
  id: string
  empresa: string
  contacto: string
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

const INIT_PROYECTOS: Proyecto[] = [
  { id: 'p1', nombre: 'Campaña Aniversario Éxito 82 años', cliente: 'Grupo Éxito', subcliente: 'Éxito Retail', ejecutivo: 'María Torres', tipo: 'Campaña', estado: 'Activo', prioridad: 'Alta', fechaInicio: '01/06/2026', fechaEntrega: '30/09/2026', fechaPresentacion: '19/09/2026', monto: 68000000, estadoComercial: 'En negociación', descripcion: '', createdAt: '2026-06-01' },
  { id: 'p2', nombre: 'Lanzamiento Cuenta Pyme Digital', cliente: 'Banco Falabella', subcliente: 'Banca Pyme', ejecutivo: 'Juan Camilo', tipo: 'Lanzamiento', estado: 'Activo', prioridad: 'Alta', fechaInicio: '01/06/2026', fechaEntrega: '25/08/2026', fechaPresentacion: '25/08/2026', monto: 120000000, estadoComercial: 'Vendido', centroCosto: '1042', descripcion: '', createdAt: '2026-06-01' },
  { id: 'p3', nombre: 'Campaña Acumulación de Millas', cliente: 'Avianca', subcliente: 'Avianca Plus', ejecutivo: 'Laura Medina', tipo: 'Campaña', estado: 'Activo', prioridad: 'Alta', fechaInicio: '20/05/2026', fechaEntrega: '10/08/2026', fechaPresentacion: '10/08/2026', monto: 85000000, estadoComercial: 'Vendido', centroCosto: '1038', descripcion: '', createdAt: '2026-05-20' },
  { id: 'p4', nombre: 'Catálogo Primavera Homecenter', cliente: 'Homecenter', subcliente: 'Homecenter Colombia', ejecutivo: 'Felipe Agudelo', tipo: 'Catálogo', estado: 'Activo', prioridad: 'Medio', fechaInicio: '25/06/2026', fechaEntrega: '11/09/2026', fechaPresentacion: '25/09/2026', monto: 90000000, estadoComercial: 'En propuesta', descripcion: '', createdAt: '2026-06-25' },
  { id: 'p5', nombre: 'Educación Financiera Q4', cliente: 'Bancolombia', subcliente: 'Personas', ejecutivo: 'Hans Vargas', tipo: 'Campaña', estado: 'Activo', prioridad: 'Medio', fechaInicio: '24/06/2026', fechaEntrega: '09/09/2026', fechaPresentacion: '24/09/2026', monto: 55000000, estadoComercial: 'En propuesta', descripcion: '', createdAt: '2026-06-24' },
  { id: 'p6', nombre: 'Activación Mundial Banco Falabella', cliente: 'Banco Falabella', subcliente: 'Bienestar', ejecutivo: 'Hans Vargas', tipo: 'Activación', estado: 'Activo', prioridad: 'Alta', fechaInicio: '15/06/2026', fechaEntrega: '22/09/2026', fechaPresentacion: '15/09/2026', monto: 45000000, estadoComercial: 'En propuesta', descripcion: '', createdAt: '2026-06-15' },
]

const INIT_CLIENTES: Cliente[] = [
  { id: 'c1', nombre: 'Banco Falabella', iniciales: 'BF', color: '#16a34a', ejecutivo: 'Hans Vargas', subclientes: ['Banca Personas', 'Banca Pyme', 'Banca Premium', 'Bienestar'], proyectos: 8, estado: 'Activo', createdAt: '2026-01-01', contactos: [{ id: 'ct1', area: 'Mercadeo', personas: [{ nombre: 'María Fernanda López', email: 'mflopez@falabella.com.co', telefono: '3001234567' }] }] },
  { id: 'c2', nombre: 'Grupo Éxito', iniciales: 'GÉ', color: '#e53935', ejecutivo: 'María Torres', subclientes: ['Éxito Retail', 'Carulla', 'Surtimax'], proyectos: 6, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c3', nombre: 'Avianca', iniciales: 'AV', color: '#c62828', ejecutivo: 'Laura Medina', subclientes: ['Avianca Plus', 'LifeMiles'], proyectos: 4, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c4', nombre: 'Homecenter', iniciales: 'HC', color: '#f97316', ejecutivo: 'Laura Medina', subclientes: ['Homecenter Colombia'], proyectos: 5, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c5', nombre: 'Preventiva Seguros', iniciales: 'PS', color: '#2563eb', ejecutivo: 'David Ruiz', subclientes: ['Seguros Generales', 'Seguros Vida'], proyectos: 3, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c6', nombre: 'Davivienda', iniciales: 'DV', color: '#dc2626', ejecutivo: 'Juan Camilo', subclientes: ['Banca Personas', 'Daviplata'], proyectos: 4, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c7', nombre: 'Sura', iniciales: 'SR', color: '#0284c7', ejecutivo: 'David Ruiz', subclientes: ['EPS Sura', 'ARL Sura'], proyectos: 2, estado: 'Activo', createdAt: '2026-01-01' },
  { id: 'c8', nombre: 'Bancolombia', iniciales: 'BC', color: '#ca8a04', ejecutivo: 'Hans Vargas', subclientes: ['Personas', 'Pymes', 'Empresas'], proyectos: 7, estado: 'Activo', createdAt: '2026-01-01' },
]

const INIT_PERSONAS_STORE: PersonaStore[] = [
  { id: 'ps1',  nombre: 'Santiago González', area: 'Creatividad',       cargo: 'Líder Creativo',        costoMensual: 7800000, email: 'santiago.gonzalez@socialexperience.com.co', clave: '1234', permiso: 'Líder',          estado: 'Activo' },
  { id: 'ps2',  nombre: 'Nicola Aranza',     area: 'Creatividad',       cargo: 'Copy Creativo',         costoMensual: 4500000, email: 'nicola.aranza@socialexperience.com.co',     clave: '1234', permiso: 'Usuario',        estado: 'Activo' },
  { id: 'ps3',  nombre: 'Nicolás Suárez',    area: 'Audiovisual',       cargo: 'Diseñador Industrial',  costoMensual: 5200000, email: 'nicolas.suarez@socialexperience.com.co',    clave: '1234', permiso: 'Usuario',        estado: 'Activo' },
  { id: 'ps4',  nombre: 'Luisa Navarro',     area: 'Diseño gráfico',    cargo: 'Líder Gráfico',         costoMensual: 7000000, email: 'luisa.navarro@socialexperience.com.co',     clave: '1234', permiso: 'Líder',          estado: 'Activo' },
  { id: 'ps5',  nombre: 'Álvaro',            area: 'Diseño gráfico',    cargo: 'Diseñador Gráfico',     costoMensual: 4200000, email: 'alvaro@socialexperience.com.co',            clave: '1234', permiso: 'Usuario',        estado: 'Activo' },
  { id: 'ps6',  nombre: 'Kate',              area: 'Diseño gráfico',    cargo: 'Diseñador Gráfico',     costoMensual: 4200000, email: 'kate@socialexperience.com.co',              clave: '1234', permiso: 'Usuario',        estado: 'Activo' },
  { id: 'ps7',  nombre: 'Jonathan Ramírez',  area: 'Diseño industrial', cargo: 'Líder Industrial',      costoMensual: 7000000, email: 'jonathan.ramirez@socialexperience.com.co', clave: '1234', permiso: 'Líder',          estado: 'Activo' },
  { id: 'ps8',  nombre: 'Felipe Aguilón',    area: 'Comercial',         cargo: 'KAM',                   costoMensual: 7500000, email: 'felipe.aguilon@socialexperience.com.co',   clave: '1234', permiso: 'KAM Admin',      estado: 'Activo' },
  { id: 'ps9',  nombre: 'Hans Vargas',       area: 'Comercial',         cargo: 'KAM',                   costoMensual: 9600000, email: 'hans@socialexperience.com.co',             clave: 'hans2026', permiso: 'Super Admin', estado: 'Activo' },
  { id: 'ps10', nombre: 'Iván Londoño',      area: 'Comercial',         cargo: 'KAM',                   costoMensual: 7200000, email: 'ivan.londono@socialexperience.com.co',     clave: '1234', permiso: 'KAM Admin',      estado: 'Activo' },
  { id: 'ps11', nombre: 'Francisco Cárdenas',area: 'Producción',        cargo: 'Director Producción',   costoMensual: 8500000, email: 'francisco.cardenas@socialexperience.com.co',clave: '1234', permiso: 'Líder',         estado: 'Activo' },
  { id: 'ps12', nombre: 'Andrés Arellano',   area: 'Producción',        cargo: 'Productor Sr',          costoMensual: 6600000, email: 'andres.arellano@socialexperience.com.co',  clave: '1234', permiso: 'Usuario',        estado: 'Activo' },
  { id: 'ps13', nombre: 'Carlos Bustamante', area: 'Producción',        cargo: 'Productor Sr',          costoMensual: 6400000, email: 'carlos.bustamante@socialexperience.com.co',clave: '1234', permiso: 'Usuario',        estado: 'Activo' },
  { id: 'ps14', nombre: 'Manuel Parra',      area: 'Producción',        cargo: 'Coordinador',           costoMensual: 4800000, email: 'manuel.parra@socialexperience.com.co',     clave: '1234', permiso: 'Usuario',        estado: 'Activo' },
  { id: 'ps15', nombre: 'Juan Vargas',       area: 'Administración',    cargo: 'Administrativo',        costoMensual: 5000000, email: 'juan.vargas@socialexperience.com.co',      clave: '1234', permiso: 'Administración', estado: 'Activo' },
]

const INIT_LEGALIZACIONES: Legalizacion[] = [
  { id: 'lg1', fecha: '2026-05-15', tipoDocumento: 'Legalización', tipoLegalizacion: 'Legalización de anticipo', noAnticipo: 'ANT-2026-0138', fechaReembolso: '2026-05-15', responsable: 'Andrés Arellano', cargo: 'Productor Sr', proyectoId: 'p2', proyecto: 'Lanzamiento Cuenta Pyme Digital', centroCosto: '1042', productor: 'Francisco Cárdenas', cliente: 'Banco Falabella', gastos: [{ id: 'g1', centroCosto: '1042', tipoGasto: 'Transporte', ciudadFecha: 'Bogotá 12/05/2026', descripcion: 'Traslado equipo materiales', pesos: 850000, usd: 0, tasaCambio: 0, total: 850000 }, { id: 'g2', centroCosto: '1042', tipoGasto: 'Alimentación', ciudadFecha: 'Bogotá 12/05/2026', descripcion: 'Almuerzo equipo de trabajo', pesos: 320000, usd: 0, tasaCambio: 0, total: 320000 }, { id: 'g3', centroCosto: '1042', tipoGasto: 'Material POP', ciudadFecha: 'Bogotá 13/05/2026', descripcion: 'Pendones y banners', pesos: 18450000, usd: 0, tasaCambio: 0, total: 18450000 }, { id: 'g4', centroCosto: '1042', tipoGasto: 'Parqueadero', ciudadFecha: 'Bogotá 12/05/2026', descripcion: 'Parqueadero vehículo', pesos: 830000, usd: 0, tasaCambio: 0, total: 830000 }], anticipo: 25000000, observaciones: 'Gastos realizados para activación en 15 puntos de venta en Bogotá.', estado: 'En revisión', creadoPor: 'Andrés Arellano', historial: [{ fecha: '2026-05-15', usuario: 'Andrés Arellano', accion: 'Creada' }, { fecha: '2026-05-16', usuario: 'Andrés Arellano', accion: 'Enviada a revisión' }], createdAt: '2026-05-15' },
  { id: 'lg2', fecha: '2026-05-14', tipoDocumento: 'Legalización', tipoLegalizacion: 'Reembolso', noAnticipo: '', fechaReembolso: '2026-05-14', responsable: 'Manuel Parra', cargo: 'Coordinador', proyectoId: 'p1', proyecto: 'Campaña Aniversario Éxito 82 años', centroCosto: '1035', productor: 'Francisco Cárdenas', cliente: 'Grupo Éxito', gastos: [{ id: 'g5', centroCosto: '1035', tipoGasto: 'Alimentación', ciudadFecha: 'Bogotá 14/05/2026', descripcion: 'Lunch reunión cliente', pesos: 45600000, usd: 0, tasaCambio: 0, total: 45600000 }, { id: 'g6', centroCosto: '1035', tipoGasto: 'Transporte', ciudadFecha: 'Bogotá 14/05/2026', descripcion: 'Taxi aeropuerto', pesos: 23150000, usd: 0, tasaCambio: 0, total: 23150000 }], anticipo: 0, observaciones: '', estado: 'Borrador', creadoPor: 'Manuel Parra', historial: [{ fecha: '2026-05-14', usuario: 'Manuel Parra', accion: 'Creada' }], createdAt: '2026-05-14' },
  { id: 'lg3', fecha: '2026-05-13', tipoDocumento: 'Legalización', tipoLegalizacion: 'Reembolso', noAnticipo: 'ANT-2026-0121', fechaReembolso: '2026-05-13', responsable: 'Carlos Bustamante', cargo: 'Productor Sr', proyectoId: 'p3', proyecto: 'Campaña Acumulación de Millas', centroCosto: '1038', productor: 'Francisco Cárdenas', cliente: 'Avianca', gastos: [{ id: 'g7', centroCosto: '1038', tipoGasto: 'Material POP', ciudadFecha: 'Medellín 11/05/2026', descripcion: 'Impresión pendones aeropuerto', pesos: 2800000, usd: 0, tasaCambio: 0, total: 2800000 }, { id: 'g8', centroCosto: '1038', tipoGasto: 'Transporte', ciudadFecha: 'Medellín 11/05/2026', descripcion: 'Flete material activación', pesos: 1200000, usd: 0, tasaCambio: 0, total: 1200000 }, { id: 'g9', centroCosto: '1038', tipoGasto: 'Hospedaje', ciudadFecha: 'Medellín 12/05/2026', descripcion: 'Hotel equipo 1 noche', pesos: 320000, usd: 0, tasaCambio: 0, total: 320000 }], anticipo: 5000000, observaciones: 'Activación aeropuerto Rionegro.', estado: 'Aprobada', creadoPor: 'Carlos Bustamante', historial: [{ fecha: '2026-05-13', usuario: 'Carlos Bustamante', accion: 'Creada' }, { fecha: '2026-05-14', usuario: 'Carlos Bustamante', accion: 'Enviada a revisión' }, { fecha: '2026-05-15', usuario: 'Juan Vargas', accion: 'Aprobada' }], createdAt: '2026-05-13' },
  { id: 'lg4', fecha: '2026-05-12', tipoDocumento: 'Legalización', tipoLegalizacion: 'Legalización de anticipo', noAnticipo: 'ANT-2026-0115', fechaReembolso: '2026-05-12', responsable: 'Andrés Arellano', cargo: 'Productor Sr', proyectoId: 'p6', proyecto: 'Activación Mundial Banco Falabella', centroCosto: '1042', productor: 'Francisco Cárdenas', cliente: 'Banco Falabella', gastos: [{ id: 'g10', centroCosto: '1042', tipoGasto: 'Transporte', ciudadFecha: 'Bogotá 10/05/2026', descripcion: 'Alquiler furgón materiales', pesos: 5400000, usd: 0, tasaCambio: 0, total: 5400000 }, { id: 'g11', centroCosto: '1042', tipoGasto: 'Material POP', ciudadFecha: 'Bogotá 10/05/2026', descripcion: 'Producción material BTL', pesos: 18200000, usd: 0, tasaCambio: 0, total: 18200000 }, { id: 'g12', centroCosto: '1042', tipoGasto: 'Parqueadero', ciudadFecha: 'Bogotá 11/05/2026', descripcion: 'Parqueadero centro comercial', pesos: 6400000, usd: 0, tasaCambio: 0, total: 6400000 }], anticipo: 30000000, observaciones: '', estado: 'Cerrada', creadoPor: 'Andrés Arellano', historial: [{ fecha: '2026-05-12', usuario: 'Andrés Arellano', accion: 'Creada' }, { fecha: '2026-05-13', usuario: 'Andrés Arellano', accion: 'Enviada a revisión' }, { fecha: '2026-05-14', usuario: 'Juan Vargas', accion: 'Aprobada' }, { fecha: '2026-05-15', usuario: 'Juan Vargas', accion: 'Cerrada' }], createdAt: '2026-05-12' },
  { id: 'lg5', fecha: '2026-05-09', tipoDocumento: 'Legalización', tipoLegalizacion: 'Reembolso', noAnticipo: '', fechaReembolso: '2026-05-09', responsable: 'Manuel Parra', cargo: 'Coordinador', proyectoId: 'p2', proyecto: 'Lanzamiento Cuenta Pyme Digital', centroCosto: '1042', productor: 'Francisco Cárdenas', cliente: 'Banco Falabella', gastos: [{ id: 'g13', centroCosto: '1042', tipoGasto: 'Alimentación', ciudadFecha: 'Bogotá 08/05/2026', descripcion: 'Catering lanzamiento', pesos: 1850000, usd: 0, tasaCambio: 0, total: 1850000 }, { id: 'g14', centroCosto: '1042', tipoGasto: 'Transporte', ciudadFecha: 'Bogotá 08/05/2026', descripcion: 'Taxi reunión cliente', pesos: 450000, usd: 0, tasaCambio: 0, total: 450000 }], anticipo: 3000000, observaciones: 'Gastos menores lanzamiento BTL.', estado: 'Devuelta', observacionContabilidad: 'Falta factura del catering. Adjuntar soporte.', creadoPor: 'Manuel Parra', historial: [{ fecha: '2026-05-09', usuario: 'Manuel Parra', accion: 'Creada' }, { fecha: '2026-05-10', usuario: 'Manuel Parra', accion: 'Enviada a revisión' }, { fecha: '2026-05-11', usuario: 'Juan Vargas', accion: 'Devuelta', observacion: 'Falta factura del catering. Adjuntar soporte.' }], createdAt: '2026-05-09' },
]

const INIT_REGISTROS: RegistroTiempo[] = []
const INIT_PROSPECTOS: Prospecto[] = [
  { id: 'pr1', empresa: 'Banco Falabella', contacto: 'María Fernanda López', email: 'mlopez@bancofalabella.com.co', cargo: 'Gerente de Mercadeo', origen: 'LinkedIn', fase: 'Credenciales Enviadas', primerContactoPersona: 'Hans Vargas', comercial: 'Hans Vargas', ultimoContactoFecha: '2026-06-22', ultimoContactoTexto: 'Se enviaron credenciales por correo.', proximoSeguimientoFecha: '2026-07-08', proximoSeguimientoTexto: 'Llamar para confirmar si recibieron el material.', valor: 0, notas: '', createdAt: '2026-06-01' },
  { id: 'pr2', empresa: 'Colsubsidio', contacto: 'Carlos Andrés Cárdenas', email: 'ccardenas@colsubsidio.com', cargo: 'Jefe de Comunicaciones', origen: 'Referido', fase: 'Credenciales Presentadas', primerContactoPersona: 'Felipe Aguilón', comercial: 'Felipe Aguilón', ultimoContactoFecha: '2026-06-20', ultimoContactoTexto: 'Reunión virtual con equipo de comunicaciones.', proximoSeguimientoFecha: '2026-07-10', proximoSeguimientoTexto: 'Enviar propuesta económica.', valor: 0, notas: '', createdAt: '2026-05-15' },
  { id: 'pr3', empresa: 'Homecenter', contacto: 'Laura Gómez', email: 'lgomez@homecenter.com.co', cargo: 'Coordinadora de Marca', origen: 'Pauta', fase: 'Inscripción Proveedor', primerContactoPersona: 'Iván Londoño', comercial: 'Iván Londoño', ultimoContactoFecha: '2026-06-21', ultimoContactoTexto: 'Se inició proceso de inscripción como proveedor.', proximoSeguimientoFecha: '2026-07-15', proximoSeguimientoTexto: 'Confirmar registro en el portal de proveedores.', valor: 0, notas: '', createdAt: '2026-05-10' },
  { id: 'pr4', empresa: 'Grupo Éxito', contacto: 'Juan Pablo Restrepo', email: 'jrestrepo@grupoexito.com.co', cargo: 'Gerente de Marca', origen: 'Llamada en frío', fase: 'Brief Recibido', primerContactoPersona: 'David Novoa', comercial: 'Hans Vargas', ultimoContactoFecha: '2026-06-23', ultimoContactoTexto: 'Reunión presencial. Recibimos el brief de campaña Q3.', proximoSeguimientoFecha: '2026-07-05', proximoSeguimientoTexto: 'Enviar propuesta creativa y económica.', valor: 0, notas: '', createdAt: '2026-06-10' },
  { id: 'pr5', empresa: 'PepsiCo', contacto: 'Daniela Arango', email: 'darango@pepsico.com', cargo: 'Brand Manager', origen: 'Evento / Networking', fase: 'Propuesta Presentada', primerContactoPersona: 'Felipe Aguilón', comercial: 'Felipe Aguilón', ultimoContactoFecha: '2026-06-24', ultimoContactoTexto: 'Se presentó propuesta creativa en reunión presencial.', proximoSeguimientoFecha: '2026-07-07', proximoSeguimientoTexto: 'Confirmar aprobación de la propuesta.', valor: 0, notas: '', createdAt: '2026-06-05' },
  { id: 'pr6', empresa: 'Bavaria', contacto: 'Santiago Morales', email: 'smorales@bavaria.com.co', cargo: 'Coordinador de Trade', origen: 'LinkedIn', fase: 'No avanza / Descartado', primerContactoPersona: 'Iván Londoño', comercial: 'Iván Londoño', ultimoContactoFecha: '2026-06-15', ultimoContactoTexto: 'Llamada. Indicaron que no tienen presupuesto este semestre.', proximoSeguimientoFecha: '', proximoSeguimientoTexto: '', valor: 0, notas: '', createdAt: '2026-05-01' },
]

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

  planOverrides: Record<string, { dias: string[]; estado: 'En proceso' | 'Finalizado' }>
  updatePlanOverride: (key: string, changes: { dias?: string[]; estado?: 'En proceso' | 'Finalizado' }) => void

  legalizaciones: Legalizacion[]
  addLegalizacion: (l: Omit<Legalizacion, 'id' | 'createdAt'>) => string
  updateLegalizacion: (id: string, changes: Partial<Legalizacion>) => void
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
    setLegalizaciones(loadLS('cal2_legalizaciones', INIT_LEGALIZACIONES))

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
  }

  function updateProyecto(id: string, changes: Partial<Proyecto>) {
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

  function addLegalizacion(l: Omit<Legalizacion, 'id' | 'createdAt'>): string {
    const id = `lg${Date.now()}`
    const newL: Legalizacion = { ...l, id, createdAt: new Date().toISOString() }
    const next = [newL, ...legalizaciones]
    setLegalizaciones(next); saveLS('cal2_legalizaciones', next)
    return id
  }

  function updateLegalizacion(id: string, changes: Partial<Legalizacion>) {
    const next = legalizaciones.map(l => l.id === id ? { ...l, ...changes } : l)
    setLegalizaciones(next); saveLS('cal2_legalizaciones', next)
  }

  if (!ready) return null

  return (
    <Ctx.Provider value={{
      proyectos, addProyecto, updateProyecto,
      registros, addRegistro, updateRegistro, deleteRegistro,
      clientes, addCliente, updateCliente,
      prospectos, addProspecto, updateProspecto,
      personasStore, addPersonaStore, updatePersonaStore,
      currentUser, setCurrentUser,
      planOverrides, updatePlanOverride,
      legalizaciones, addLegalizacion, updateLegalizacion,
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
