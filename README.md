# Gestion de Citas Medicas (Next.js + Supabase)

Aplicacion web academica para gestionar citas medicas con:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth)

## SQL de referencia y migraciones

El esquema base historico se mantiene en:

- `docs/Estructura_base_de_datos.sql`

No se modifica ese archivo. Los ajustes se aplican como migraciones incrementales.

Ejecuta en este orden dentro de Supabase SQL Editor:

1. `docs/Estructura_base_de_datos.sql`
2. `docs/migrations/001_allow_rebooking_after_cancel.sql`
3. `docs/migrations/002_auth_rls.sql`

### Justificacion tecnica de `001`

En el SQL base, `appointments.schedule_id` tiene `UNIQUE` global.  
Eso impide re-reservar un horario si existio una cita cancelada.  
La migracion `001` elimina esa unicidad rigida y crea un indice unico parcial para citas activas.

## Variables de entorno

Crea `.env.local` (puedes copiar `.env.example`) con:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Reglas:

- `NEXT_PUBLIC_*` solo para URL y anon key.
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse al frontend.
- El flujo normal de usuario en esta fase usa sesion + RLS; no depende de `service_role` en runtime de APIs.

## Configuracion de Supabase Auth

1. En Supabase, habilita provider Email (password).
2. Decide si activas o no confirmacion de email:
   - si esta desactivada, el paciente entra inmediatamente tras registro;
   - si esta activada, debe confirmar antes de iniciar sesion.
3. Registro publico en la app: solo pacientes (`/registro`).
4. `admin` y `receptionist`: crear manualmente usuario en Supabase Auth y luego actualizar rol en `public.profiles`.

Ejemplo para asignar rol staff:

```sql
update public.profiles
set role = 'receptionist'
where email = 'recepcion@tu-dominio.com';
```

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrir: [http://localhost:3000](http://localhost:3000)

## Validaciones tecnicas

```bash
npm run lint
npm run build
```

## Modulos y rutas

Autenticacion:

- `/login`
- `/registro`

Staff (`admin` / `receptionist`):

- `/` dashboard
- `/especialidades`
- `/medicos`
- `/horarios`
- `/pacientes`
- `/citas/nueva`
- `/citas`

Paciente:

- `/mi-citas`
- `/citas/nueva`

## Endpoints principales

- `GET /api/doctors`
- `GET /api/schedules/available?date=YYYY-MM-DD&doctorId=...`
- `GET /api/patients?query=...`
- `POST /api/patients`
- `GET /api/appointments?status=...`
- `POST /api/appointments`
- `PATCH /api/appointments/:id`
- `PATCH /api/appointments/:id/cancel`

## Seguridad aplicada

- Middleware para proteger rutas privadas y redirigir a `/login`.
- Verificacion de rol en route handlers (`requireAuth`, `requireStaff`, checks de ownership).
- RLS habilitado en tablas operativas.
- Restriccion por ambito:
  - staff: gestion global.
  - patient: solo sus propios datos/citas.

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Configura variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy.

Importante: asegúrate de haber ejecutado las tres consultas SQL en Supabase antes de probar en produccion.
