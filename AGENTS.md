<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

# AGENTS.md

## Objetivo del proyecto
Construir una aplicación web funcional para gestión de citas médicas usando:
- Next.js
- TypeScript
- App Router
- Tailwind CSS
- Supabase como base de datos

## Contexto funcional
La app debe permitir gestionar:
- médicos
- especialidades
- pacientes
- horarios disponibles
- citas médicas

La estructura de base de datos se entregará dentro del proyecto en un archivo SQL. Debe respetarse dicha estructura y sus relaciones.

## Alcance inicial
Se debe priorizar una versión funcional y clara, no una solución excesivamente compleja.

## Funcionalidades mínimas
1. Listar médicos con su especialidad.
2. Listar horarios disponibles por médico.
3. Registrar una cita médica.
4. Listar citas registradas.
5. Cancelar una cita.
6. Validar que no se pueda reservar un horario no disponible o ya reservado.

## Reglas importantes
- No cambiar arbitrariamente la estructura SQL entregada.
- No usar la `service_role_key` en el frontend.
- Las operaciones sensibles deben pasar por rutas backend del proyecto.
- Mantener el código simple, legible y modular.
- Priorizar componentes reutilizables y nombres claros.
- No agregar librerías innecesarias.
- No sobreingenierizar autenticación o roles en la primera versión, salvo que se solicite.
- El proyecto debe quedar listo para desplegarse en Vercel.

## Arquitectura esperada
- Frontend: páginas y componentes en Next.js
- Backend ligero: route handlers o API routes dentro de Next.js
- Persistencia: Supabase
- Variables de entorno bien separadas entre públicas y privadas

## Estructura sugerida
- `app/` para rutas y páginas
- `components/` para UI reutilizable
- `lib/` para utilidades y clientes Supabase
- `app/api/` para endpoints backend
- `docs/` o carpeta similar para el SQL entregado

## Buenas prácticas
- Manejar estados vacíos y errores
- Validar datos en frontend y backend
- Escribir código fácil de mantener
- Comentar solo cuando sea realmente útil
- Usar TypeScript correctamente

## Entregable esperado
Una app funcional, clara y mínima, con base sólida para crecer después.


This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
