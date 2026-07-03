'use client'

import { useState } from 'react'
import { Users, UserPlus, Mail, FileText, CheckCircle, XCircle, Plus, Search, MoreHorizontal, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const prospectos = [
  { id: 1, empresa: 'Banco Falabella', iniciales: 'BF', color: '#16a34a', contacto: 'María Fernanda López', email: 'mlopez@bancofalabella.com.co', cargo: 'Gerente de Mercadeo', comercial: 'Hans Vargas', origen: 'LinkedIn', fase: 'Credenciales enviadas', ultimoContacto: '22/05/2024', tipoUltimo: 'Llamada', proximoSeguimiento: '27/05/2024', tipoProximo: 'Llamada' },
  { id: 2, empresa: 'Colsubsidio', iniciales: 'CS', color: '#7c3aed', contacto: 'Carlos Andrés Cárdenas', email: 'ccardenas@colsubsidio.com', cargo: 'Jefe de Comunicaciones', comercial: 'Felipe Aguilón', origen: 'Referido', fase: 'Credenciales presentadas', ultimoContacto: '20/05/2024', tipoUltimo: 'Reunión virtual', proximoSeguimiento: '28/05/2024', tipoProximo: 'Enviar propuesta' },
  { id: 3, empresa: 'Homecenter', iniciales: 'HC', color: '#f97316', contacto: 'Laura Gómez', email: 'lgomez@homecenter.com.co', cargo: 'Coordinadora de Marca', comercial: 'Iván Londoño', origen: 'Pauta', fase: 'Inscripción como proveedor', ultimoContacto: '21/05/2024', tipoUltimo: 'Correo', proximoSeguimiento: '29/05/2024', tipoProximo: 'Confirmar registro' },
  { id: 4, empresa: 'Grupo Éxito', iniciales: 'GÉ', color: '#e53935', contacto: 'Juan Pablo Restrepo', email: 'jrestrepo@grupoexito.com.co', cargo: 'Gerente de Marca', comercial: 'Hans Vargas', origen: 'Llamada en frío', fase: 'Brief recibido', ultimoContacto: '23/05/2024', tipoUltimo: 'Reunión presencial', proximoSeguimiento: '30/05/2024', tipoProximo: 'Enviar propuesta' },
  { id: 5, empresa: 'PepsiCo', iniciales: 'PP', color: '#2563eb', contacto: 'Daniela Arango', email: 'darango@pepsico.com', cargo: 'Brand Manager', comercial: 'Felipe Aguilón', origen: 'Evento / Networking', fase: 'Proyecto creado', ultimoContacto: '24/05/2024', tipoUltimo: 'Reunión presencial', proximoSeguimiento: '—', tipoProximo: 'Completado' },
  { id: 6, empresa: 'Bavaria', iniciales: 'BV', color: '#b91c1c', contacto: 'Santiago Morales', email: 'smorales@bavaria.com.co', cargo: 'Coordinador de Trade', comercial: 'Iván Londoño', origen: 'LinkedIn', fase: 'No avanza / descartado', ultimoContacto: '15/05/2024', tipoUltimo: 'Llamada', proximoSeguimiento: '—', tipoProximo: 'Sin interés' },
]

const faseConfig: Record<string, { label: string; className: string }> = {
  'Credenciales enviadas':      { label: 'Credenciales enviadas',      className: 'bg-blue-50 text-blue-700 border-blue-200' },
  'Credenciales presentadas':   { label: 'Credenciales presentadas',   className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'Inscripción como proveedor': { label: 'Inscripción como proveedor', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  'Brief recibido':             { label: 'Brief recibido',             className: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Proyecto creado':            { label: 'Proyecto creado',            className: 'bg-green-50 text-green-700 border-green-200' },
  'No avanza / descartado':     { label: 'No avanza / descartado',     className: 'bg-gray-100 text-gray-500 border-gray-200' },
}

const fases = ['Todos', ...Object.keys(faseConfig)]
const origenes = ['Todos', 'LinkedIn', 'Referido', 'Pauta', 'Llamada en frío', 'Evento / Networking']
const comerciales = ['Todos', 'Hans Vargas', 'Felipe Aguilón', 'Iván Londoño']

export default function ProspeccionPage() {
  const [search, setSearch] = useState('')
  const [fase, setFase] = useState('Todos')
  const [origen, setOrigen] = useState('Todos')
  const [comercial, setComercial] = useState('Todos')

  const filtered = prospectos.filter(p => {
    const matchSearch = p.empresa.toLowerCase().includes(search.toLowerCase()) || p.contacto.toLowerCase().includes(search.toLowerCase())
    const matchFase = fase === 'Todos' || p.fase === fase
    const matchOrigen = origen === 'Todos' || p.origen === origen
    const matchComercial = comercial === 'Todos' || p.comercial === comercial
    return matchSearch && matchFase && matchOrigen && matchComercial
  })

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Prospección Comercial</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona el pipeline de nuevos clientes potenciales y haz seguimiento a cada etapa.
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          Nuevo prospecto
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: 'Prospectos activos', value: 48, icon: Users, bg: 'bg-purple-50', color: 'text-purple-600' },
          { label: 'Nuevos este mes', value: 16, icon: UserPlus, bg: 'bg-green-50', color: 'text-green-600' },
          { label: 'Credenciales enviadas', value: 12, icon: Mail, bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'Briefs recibidos', value: 6, icon: FileText, bg: 'bg-indigo-50', color: 'text-indigo-600' },
          { label: 'Convertidos a proyecto', value: 4, icon: CheckCircle, bg: 'bg-green-50', color: 'text-green-600' },
          { label: 'Descartados', value: 7, icon: XCircle, bg: 'bg-red-50', color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="border border-border rounded-lg p-3 bg-card">
            <div className="text-xs text-muted-foreground mb-2">{label}</div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <span className="text-2xl font-medium">{value}</span>
            </div>
            <button className="text-xs text-blue-600 mt-2 flex items-center gap-1 hover:underline">
              Ver detalle →
            </button>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={comercial} onValueChange={(v) => v && setComercial(v)}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Comercial" /></SelectTrigger>
          <SelectContent>{comerciales.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={origen} onValueChange={(v) => v && setOrigen(v)}>
          <SelectTrigger className="w-48 h-9 text-sm"><SelectValue placeholder="Origen del lead" /></SelectTrigger>
          <SelectContent>{origenes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={fase} onValueChange={(v) => v && setFase(v)}>
          <SelectTrigger className="w-52 h-9 text-sm"><SelectValue placeholder="Fase" /></SelectTrigger>
          <SelectContent>{fases.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 w-52 text-sm" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs"
            onClick={() => { setSearch(''); setFase('Todos'); setOrigen('Todos'); setComercial('Todos') }}>
            <RefreshCw className="w-3.5 h-3.5" /> Limpiar filtros
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs"
            onClick={() => alert('Exportar: funcionalidad disponible cuando se conecte Supabase.')}>
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs font-medium">Empresa</TableHead>
              <TableHead className="text-xs font-medium">Contacto</TableHead>
              <TableHead className="text-xs font-medium">Cargo</TableHead>
              <TableHead className="text-xs font-medium">Comercial</TableHead>
              <TableHead className="text-xs font-medium">Origen</TableHead>
              <TableHead className="text-xs font-medium">Fase</TableHead>
              <TableHead className="text-xs font-medium">Último contacto</TableHead>
              <TableHead className="text-xs font-medium">Próximo seguimiento</TableHead>
              <TableHead className="text-xs font-medium">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => {
              const faseStyle = faseConfig[p.fase]
              return (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs font-medium text-white" style={{ backgroundColor: p.color }}>
                          {p.iniciales}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{p.empresa}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{p.contacto}</div>
                    <div className="text-xs text-muted-foreground">{p.email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.cargo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                          {p.comercial.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{p.comercial}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.origen}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${faseStyle.className}`}>
                      {faseStyle.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{p.ultimoContacto}</div>
                    <div className="text-xs text-muted-foreground">{p.tipoUltimo}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{p.proximoSeguimiento}</div>
                    <div className="text-xs text-muted-foreground">{p.tipoProximo}</div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver detalle</DropdownMenuItem>
                        <DropdownMenuItem>Registrar contacto</DropdownMenuItem>
                        <DropdownMenuItem>Cambiar fase</DropdownMenuItem>
                        <DropdownMenuItem>Convertir a cliente</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Descartar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando 1 a {filtered.length} de 48 prospectos
        </div>
        <div className="flex items-center gap-1">
          {['Anterior', '1', '2', '3', '4', '5', 'Siguiente'].map((p) => (
            <Button key={p} variant={p === '1' ? 'default' : 'outline'} size="sm"
              className={`h-8 min-w-8 text-xs px-2.5 ${p === '1' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}>
              {p}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
