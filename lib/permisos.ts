export type Rol =
  | 'Super Admin'
  | 'KAM'
  | 'Líder'
  | 'Líder Producción'
  | 'Producción'
  | 'Comercial'
  | 'Administración'
  | 'Contabilidad'

export const ROLES: Rol[] = [
  'Super Admin',
  'KAM',
  'Líder',
  'Líder Producción',
  'Producción',
  'Comercial',
  'Administración',
  'Contabilidad',
]

// Rutas permitidas por rol (vacío = sin acceso, '*' = todo)
export const PERMISOS: Record<Rol, string[]> = {
  'Super Admin': ['*'],

  'KAM': [
    '/clientes',
    '/proyectos',
    '/seguimiento',
    '/trafico',
    '/plan-trabajo',
    '/prospeccion',
  ],

  'Líder': [
    '/proyectos',
    '/trafico',
    '/calendar',
    '/plan-trabajo',
  ],

  'Líder Producción': [
    '/proyectos',
    '/seguimiento',
    '/trafico',
    '/plan-trabajo',
    '/legalizaciones',
    '/tarjeta-credito',
    '/reportes',
  ],

  'Producción': [
    '/seguimiento',
    '/trafico',
    '/plan-trabajo',
    '/legalizaciones',
    '/tarjeta-credito',
    '/reportes',
  ],

  'Comercial': [
    '/prospeccion',
  ],

  'Administración': [
    '/clientes',
    '/proyectos',
    '/seguimiento',
    '/trafico',
    '/calendar',
    '/plan-trabajo',
    '/nomina',
    '/personas',
    '/legalizaciones',
    '/tarjeta-credito',
    '/reportes',
    '/administracion',
  ],

  'Contabilidad': [
    '/legalizaciones',
    '/tarjeta-credito',
    '/reportes',
  ],
}

export function tieneAcceso(rol: string | undefined, ruta: string): boolean {
  if (!rol) return false
  const perms = PERMISOS[rol as Rol]
  if (!perms) return false
  if (perms.includes('*')) return true
  return perms.some(p => ruta === p || ruta.startsWith(p + '/'))
}
