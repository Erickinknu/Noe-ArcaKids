# NOE Admin Web (Lovable-ready)

Este es el panel de administración para NOE/ARCA KIDS.

## Variables de entorno
Copiar `.env.example` a `.env.local` y rellenar con credenciales Supabase.

## Despliegue en Lovable
1. Conecta este repo/subcarpeta `apps/admin-web` o sube a Lovable.
2. Configura variables de entorno en Lovable (Project > Settings > Environment).
3. Build: `npm run build`. Lovable usa Next.js.

## Rutas
- `/` — Login
- `/dashboard` — Resumen
- `/dashboard/users` — Usuarios/padres
- `/dashboard/families` — Familias y conexiones padre-hijo
- `/dashboard/subscriptions` — Suscripciones/planes
- `/dashboard/support` — Tickets de soporte