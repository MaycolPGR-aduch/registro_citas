# Gestion de Citas Medicas (Next.js + Supabase)

Aplicacion web funcional para gestion integral de citas medicas con:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase

## Base SQL de referencia

El esquema base se mantiene en:

- `docs/Estructura_base_de_datos.sql`

No se modifica ese archivo. El ajuste funcional se aplica con migracion incremental.

## Migracion adicional obligatoria

Para permitir re-reserva despues de cancelar una cita, ejecuta:

- `docs/migrations/001_allow_rebooking_after_cancel.sql`

Motivo tecnico:

- En el esquema base, `appointments.schedule_id` es `UNIQUE` global.
- Eso bloquea volver a reservar un horario aunque la cita este `cancelled`.
- La migracion reemplaza ese comportamiento por un indice unico parcial para citas activas.

## Variables de entorno

Crea `.env.local` (puedes copiar `.env.example`) con:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Reglas:

- `SUPABASE_SERVICE_ROLE_KEY` se usa solo en backend.
- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en `NEXT_PUBLIC_*`.

## Ejecutar localmente

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar en Supabase SQL Editor:
- `docs/Estructura_base_de_datos.sql`
- `docs/migrations/001_allow_rebooking_after_cancel.sql`

3. Iniciar desarrollo:

```bash
npm run dev
```

4. Abrir [http://localhost:3000](http://localhost:3000).

## Validaciones

```bash
npm run lint
npm run build
```

## Modulos UI

- `/` Dashboard
- `/especialidades` CRUD de especialidades
- `/medicos` CRUD de medicos
- `/horarios` CRUD de horarios
- `/pacientes` CRUD de pacientes
- `/citas/nueva` Crear cita
- `/citas` Gestion de citas (editar estado, motivo, notas, eliminar)

## API

### Especialidades
- `GET /api/specialties`
- `POST /api/specialties`
- `PATCH /api/specialties/:id`
- `DELETE /api/specialties/:id`

### Medicos
- `GET /api/doctors`
- `POST /api/doctors`
- `PATCH /api/doctors/:id`
- `DELETE /api/doctors/:id`

### Pacientes
- `GET /api/patients?query=...`
- `POST /api/patients`
- `PATCH /api/patients/:id`
- `DELETE /api/patients/:id`

### Horarios
- `GET /api/schedules?doctorId=...&date=YYYY-MM-DD`
- `POST /api/schedules`
- `PATCH /api/schedules/:id`
- `DELETE /api/schedules/:id`
- `GET /api/schedules/available?doctorId=...&date=YYYY-MM-DD`

### Citas
- `GET /api/appointments?status=...`
- `POST /api/appointments`
- `PATCH /api/appointments/:id`
- `PATCH /api/appointments/:id/cancel`
- `DELETE /api/appointments/:id`

## Deploy en Vercel

1. Subir repositorio a GitHub.
2. Importar el proyecto en Vercel.
3. Configurar variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
4. Redeploy.
