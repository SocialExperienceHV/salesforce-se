-- Módulo Dashboard Comercial — metas de venta por cliente y meta global de la agencia.
-- Patrón JSON-blob (id text primary key, data jsonb), igual que el resto de tablas de
-- Salesforce SE.
--
-- metas_comerciales: una fila por (cliente, año). `data.meses` es un objeto con
-- claves '1'..'12' (mes) y el monto proyectado para ese mes. El id es determinístico
-- (mc_<año>_<cliente-slug>) así que el guardado siempre es un upsert.
--
-- metas_globales: una fila por año, con la misma forma `data.meses`, representa la
-- meta total de la agencia (independiente de la suma de proyecciones por cliente).

create table public.metas_comerciales (
  id   text primary key,
  data jsonb not null
);
alter table public.metas_comerciales disable row level security;

create table public.metas_globales (
  id   text primary key,
  data jsonb not null
);
alter table public.metas_globales disable row level security;
