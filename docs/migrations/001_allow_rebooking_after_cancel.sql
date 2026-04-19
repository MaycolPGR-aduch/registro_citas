-- Esta migración mantiene intacto el esquema base académico en docs/Estructura_base_de_datos.sql
-- y corrige el bloqueo funcional de re-reserva al cancelar una cita.
--
-- Problema:
-- appointments.schedule_id tiene UNIQUE global, por lo que una cita cancelada
-- sigue ocupando el mismo schedule_id para siempre.
--
-- Solución:
-- 1) eliminar la unicidad rígida de schedule_id;
-- 2) crear un índice único parcial para impedir más de una cita NO cancelada por horario.

begin;

alter table public.appointments
drop constraint if exists appointments_schedule_id_key;

drop index if exists public.appointments_schedule_id_key;

create unique index if not exists ux_appointments_schedule_active
on public.appointments (schedule_id)
where status <> 'cancelled';

commit;
