# Plan de alineacion de migraciones (remoto vs local)

## Objetivo
Que el esquema resultante de aplicar todas las migraciones del repo en una base PostgreSQL vacia coincida con el de produccion:
- tablas, columnas, tipos, defaults, constraints (PK/UK/FK/CK), indices
- funciones (con argumentos/retorno y SECURITY), triggers
- RLS + politicas por tabla
- grants/roles relevantes
- publicaciones Realtime (supabase_realtime)

Criterio de cierre medible: `supabase db diff --linked` muestre cero diferencias contra un clon aplicado desde cero.

## Estado actual
- Local: migraciones versionadas en `supabase/migrations/`
- Remoto: historial con huerfanos (registrados solo en remoto)
- Accion hecha: `20261009010000_send_push_notification_id_only.sql` ya registrada via repair tras verificacion

## Reglas
- Nunca `supabase db push` a ciegas
- Solo lectura primero; no modificar produccion hasta diff cero reproducible
- `migration repair --status applied` solo cuando el efecto YA existe
- Crear migracion nueva versionada unicamente si falta efecto
- Sin tocar datos. Cuidado con `SECURITY DEFINER`
- Evidencia obligatoria

## Pasos (fase A - inventario)
1. Exportar snapshot estructural remoto (hash)
2. Generar esquema desde cero en **proyecto de pruebas** (no productivo) con repo
3. Listar huerfanos remotos no presentes localmente
4. Listar locales no registrados en remoto
5. Clasificar: ya_cubierto -> repair applied; falta_efecto -> nueva migracion; ambiguo -> pedir OK

## Pasos (fase B - alineacion controlada)
- Registrar huerfanos identicos con `migration repair --status applied`
- Crear migraciones minimas/idempotentes para efectos faltantes
- Tras cada lote: reset pruebas + comparar con remoto hasta diff 0

## Entorno requerido
- Proyecto Supabase de pruebas (aislado). No usar main productivo
- supabase CLI + Docker/local supabase start
- Evidencias en `docs/migrations-evidence/` (sin secretos)

## Criterio de salida
- migration list --local == migration list --linked (o justificacion por discrepancia)
- esquema vacio+repo == esquema remoto (igualdad estructural)
- `supabase db diff --linked` -> sin cambios

## Notas
- Subscriptions/politicas: revisar con extremo cuidado
- Realtime: verificar publicaciones
- Solo plan. No ejecutar hasta OK explicito
