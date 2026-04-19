-- =========================
-- 1) ENUMS
-- =========================
create type user_role as enum ('admin', 'receptionist', 'patient');
create type appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');

-- =========================
-- 2) TABLA DE PERFILES
-- Relacionada con auth.users de Supabase
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text unique,
  role user_role not null default 'patient',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 3) ESPECIALIDADES
-- =========================
create table public.specialties (
  id bigserial primary key,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- =========================
-- 4) DOCTORES
-- =========================
create table public.doctors (
  id bigserial primary key,
  full_name text not null,
  email text unique,
  phone text,
  specialty_id bigint not null references public.specialties(id) on delete restrict,
  license_number text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 5) PACIENTES
-- =========================
create table public.patients (
  id bigserial primary key,
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  dni text unique,
  birth_date date,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 6) HORARIOS DE DOCTORES
-- Cada fila representa un bloque disponible
-- =========================
create table public.doctor_schedules (
  id bigserial primary key,
  doctor_id bigint not null references public.doctors(id) on delete cascade,
  schedule_date date not null,
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_schedule_time check (end_time > start_time)
);

-- Evita duplicar exactamente el mismo bloque horario para el mismo médico
create unique index ux_doctor_schedule_slot
on public.doctor_schedules (doctor_id, schedule_date, start_time, end_time);

-- =========================
-- 7) CITAS
-- =========================
create table public.appointments (
  id bigserial primary key,
  patient_id bigint not null references public.patients(id) on delete restrict,
  doctor_id bigint not null references public.doctors(id) on delete restrict,
  schedule_id bigint not null unique references public.doctor_schedules(id) on delete restrict,
  appointment_date date not null,
  appointment_time time not null,
  reason text,
  status appointment_status not null default 'scheduled',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- 8) FUNCIÓN PARA updated_at
-- =========================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- 9) TRIGGERS updated_at
-- =========================
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_doctors_updated_at
before update on public.doctors
for each row execute function public.set_updated_at();

create trigger trg_patients_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

create trigger trg_doctor_schedules_updated_at
before update on public.doctor_schedules
for each row execute function public.set_updated_at();

create trigger trg_appointments_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();