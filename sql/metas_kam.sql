-- Módulo Dashboard Comercial — meta de venta por KAM (independiente de la suma de
-- las metas de sus clientes, igual que metas_globales es independiente de la suma
-- de las metas por cliente). Patrón JSON-blob (id text primary key, data jsonb).
--
-- Una fila por (kam, año). `data.meses` es un objeto con claves '1'..'12' y el
-- monto proyectado para ese mes.

create table public.metas_kam (
  id   text primary key,
  data jsonb not null
);
alter table public.metas_kam disable row level security;
