-- Contador atómico de centro de costo — evita que dos proyectos creados casi al
-- mismo tiempo (dos pestañas, dos personas a la vez) calculen el mismo "siguiente
-- número disponible" antes de que el otro se guarde (pasó con los CC 1815 y 1822).
--
-- Antes, addProyecto calculaba el siguiente número a partir de la lista de
-- proyectos en el estado local del navegador — dos creaciones simultáneas podían
-- leer el mismo máximo y generar el mismo centro de costo. Ahora se reserva el
-- número con un compare-and-swap contra esta fila: cada creación lee el valor
-- actual e intenta actualizarlo condicionado a que nadie más lo haya cambiado
-- mientras tanto; si pierde la carrera, reintenta con el valor fresco.
--
-- Patrón JSON-blob (id text primary key, data jsonb), igual que el resto de
-- tablas de Salesforce SE. Una sola fila, id fijo 'actual'.

create table public.centro_costo_counter (
  id   text primary key,
  data jsonb not null
);
alter table public.centro_costo_counter disable row level security;

-- Sembrar con el máximo centro de costo ya usado en proyectos (ajustar el valor
-- si para cuando corras esto ya hay centros de costo más altos).
insert into public.centro_costo_counter (id, data) values ('actual', jsonb_build_object('valor', 1835));
