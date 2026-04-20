-- Fase 2: autenticacion + autorizacion con Supabase Auth y RLS.
-- Mantiene intacto docs/Estructura_base_de_datos.sql y se aplica como migracion incremental.
--
-- Incluye:
-- 1) funciones helper para rol/paciente autenticado;
-- 2) trigger para bootstrap de profile/patient al crear usuario auth;
-- 3) politicas RLS por rol (staff global, paciente en su propio ambito).

begin;

-- ---------------------------------------------------------------------------
-- Helpers de autorizacion
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid();

  return v_role;
end;
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'receptionist');
$$;

create or replace function public.current_patient_id()
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select p.id
  from public.patients p
  where p.profile_id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.current_patient_id() to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger para crear profile/patient al registrar usuario en auth.users
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Paciente'
  );

  insert into public.profiles (id, full_name, email, role)
  values (new.id, v_full_name, new.email, 'patient')
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

  insert into public.patients (profile_id, full_name, email)
  values (new.id, v_full_name, new.email)
  on conflict (profile_id) do update
    set full_name = excluded.full_name,
        email = excluded.email;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_auth_user on auth.users;
create trigger trg_handle_new_auth_user
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Backfill minimo para usuarios existentes sin profile/patient.
insert into public.profiles (id, full_name, email, role)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Paciente'
  ) as full_name,
  u.email,
  'patient'::public.user_role
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
);

insert into public.patients (profile_id, full_name, email)
select
  p.id,
  p.full_name,
  p.email
from public.profiles p
where p.role = 'patient'
and not exists (
  select 1
  from public.patients pa
  where pa.profile_id = p.id
);

-- ---------------------------------------------------------------------------
-- Guardas de negocio para mutaciones de appointments por pacientes
-- (defensa adicional sobre RLS para bloquear cambios de columnas sensibles).
-- ---------------------------------------------------------------------------
create or replace function public.guard_patient_appointment_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  v_role := public.current_user_role();

  if v_role = 'patient' then
    if tg_op = 'INSERT' then
      if new.patient_id <> public.current_patient_id() then
        raise exception 'Paciente no autorizado para crear citas de otro paciente.';
      end if;

      if new.status <> 'scheduled' then
        raise exception 'Un paciente solo puede crear citas con estado scheduled.';
      end if;

      if new.created_by is distinct from auth.uid() then
        raise exception 'created_by debe coincidir con el usuario autenticado.';
      end if;
    end if;

    if tg_op = 'UPDATE' then
      if old.patient_id <> new.patient_id
        or old.doctor_id <> new.doctor_id
        or old.schedule_id <> new.schedule_id
        or old.appointment_date <> new.appointment_date
        or old.appointment_time <> new.appointment_time then
        raise exception 'Un paciente no puede cambiar paciente, medico, horario ni fecha/hora de cita.';
      end if;

      if new.status not in ('scheduled', 'cancelled') then
        raise exception 'Un paciente solo puede usar estados scheduled o cancelled.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_patient_appointment_mutation on public.appointments;
create trigger trg_guard_patient_appointment_mutation
before insert or update on public.appointments
for each row
execute function public.guard_patient_appointment_mutation();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.specialties enable row level security;
alter table public.doctors enable row level security;
alter table public.doctor_schedules enable row level security;
alter table public.appointments enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_staff on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_select_staff
on public.profiles
for select
to authenticated
using (public.is_staff());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_update_admin
on public.profiles
for update
to authenticated
using (public.current_user_role() = 'admin')
with check (true);

-- patients
drop policy if exists patients_select_staff on public.patients;
drop policy if exists patients_insert_staff on public.patients;
drop policy if exists patients_update_staff on public.patients;
drop policy if exists patients_delete_staff on public.patients;
drop policy if exists patients_select_own on public.patients;
drop policy if exists patients_update_own on public.patients;

create policy patients_select_staff
on public.patients
for select
to authenticated
using (public.is_staff());

create policy patients_insert_staff
on public.patients
for insert
to authenticated
with check (public.is_staff());

create policy patients_update_staff
on public.patients
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy patients_delete_staff
on public.patients
for delete
to authenticated
using (public.is_staff());

create policy patients_select_own
on public.patients
for select
to authenticated
using (profile_id = auth.uid());

create policy patients_update_own
on public.patients
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- specialties
drop policy if exists specialties_select_authenticated on public.specialties;
drop policy if exists specialties_insert_staff on public.specialties;
drop policy if exists specialties_update_staff on public.specialties;
drop policy if exists specialties_delete_staff on public.specialties;

create policy specialties_select_authenticated
on public.specialties
for select
to authenticated
using (true);

create policy specialties_insert_staff
on public.specialties
for insert
to authenticated
with check (public.is_staff());

create policy specialties_update_staff
on public.specialties
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy specialties_delete_staff
on public.specialties
for delete
to authenticated
using (public.is_staff());

-- doctors
drop policy if exists doctors_select_authenticated on public.doctors;
drop policy if exists doctors_insert_staff on public.doctors;
drop policy if exists doctors_update_staff on public.doctors;
drop policy if exists doctors_delete_staff on public.doctors;

create policy doctors_select_authenticated
on public.doctors
for select
to authenticated
using (true);

create policy doctors_insert_staff
on public.doctors
for insert
to authenticated
with check (public.is_staff());

create policy doctors_update_staff
on public.doctors
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy doctors_delete_staff
on public.doctors
for delete
to authenticated
using (public.is_staff());

-- doctor_schedules
drop policy if exists schedules_select_authenticated on public.doctor_schedules;
drop policy if exists schedules_insert_staff on public.doctor_schedules;
drop policy if exists schedules_update_staff on public.doctor_schedules;
drop policy if exists schedules_delete_staff on public.doctor_schedules;

create policy schedules_select_authenticated
on public.doctor_schedules
for select
to authenticated
using (true);

create policy schedules_insert_staff
on public.doctor_schedules
for insert
to authenticated
with check (public.is_staff());

create policy schedules_update_staff
on public.doctor_schedules
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy schedules_delete_staff
on public.doctor_schedules
for delete
to authenticated
using (public.is_staff());

-- appointments
drop policy if exists appointments_select_staff on public.appointments;
drop policy if exists appointments_insert_staff on public.appointments;
drop policy if exists appointments_update_staff on public.appointments;
drop policy if exists appointments_delete_staff on public.appointments;
drop policy if exists appointments_select_own on public.appointments;
drop policy if exists appointments_insert_own on public.appointments;
drop policy if exists appointments_update_own on public.appointments;

create policy appointments_select_staff
on public.appointments
for select
to authenticated
using (public.is_staff());

create policy appointments_insert_staff
on public.appointments
for insert
to authenticated
with check (public.is_staff());

create policy appointments_update_staff
on public.appointments
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

create policy appointments_delete_staff
on public.appointments
for delete
to authenticated
using (public.is_staff());

create policy appointments_select_own
on public.appointments
for select
to authenticated
using (
  exists (
    select 1
    from public.patients p
    where p.id = appointments.patient_id
      and p.profile_id = auth.uid()
  )
);

create policy appointments_insert_own
on public.appointments
for insert
to authenticated
with check (
  appointments.patient_id = public.current_patient_id()
  and appointments.status = 'scheduled'
  and appointments.created_by = auth.uid()
);

create policy appointments_update_own
on public.appointments
for update
to authenticated
using (
  exists (
    select 1
    from public.patients p
    where p.id = appointments.patient_id
      and p.profile_id = auth.uid()
  )
)
with check (
  appointments.patient_id = public.current_patient_id()
);

commit;
