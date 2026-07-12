-- Módulo PPTO — presupuestos de Social Experience.
-- Patrón JSON-blob (id text primary key, data jsonb), igual que el resto de tablas de
-- Salesforce SE. `data` guarda el presupuesto completo: metadatos del evento + array de
-- items. Un solo upsert por presupuesto (guardado debounced desde la app).

create table public.presupuestos (
  id   text primary key,
  data jsonb not null
);
alter table public.presupuestos disable row level security;
