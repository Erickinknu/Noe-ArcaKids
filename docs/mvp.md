# Definición de MVP — Piloto de 20 familias

**Fecha:** 2026-09-25
**Estado:** Propuesta aprobada para ejecutar el piloto. Fuente de verdad de features: `docs/implementation-status.md`; operación: `docs/runbook.md`.
**Objetivo:** validar con 20 familias reales que el control parental funciona end-to-end (padre ↔ dispositivo del hijo), es usable y que existe disposición a pagar, antes de invertir en pasarela de pago, Play Store y expansión.

---

## 1. Alcance mínimo del piloto

### Sí incluye (MVP)

| Área | Estado hoy | Notas para el piloto |
|---|---|---|
| Cuenta y sesión (email+password, recovery por email) | `DONE` | Registro, login, recuperación de contraseña. |
| Vinculación padre↔hijo | `DONE` | Código de 6 caracteres + QR (`akv1:`), deep link automático, invites de responsables. |
| Dashboard y monitoreo | `DONE` | KPIs del día (online, tiempo, alertas), uso por hijo, historial 7 días. |
| Límites de tiempo | `DONE` | Límite diario por hijo, editable desde Control y dashboard. |
| Bloqueo de apps | `DONE` | Por categoría y por app; enforcement nativo (DPM suspend + Accesibilidad fallback). |
| Horarios y reglas | `DONE` | CRUD de schedules, categorías de apps, reglas por edad. |
| Geocercas / zonas seguras | `PARCIAL` | CRUD y mapa en NOE DONE; ARCA KIDS reporta ubicación (polling 15 s) pero `loadGeofences` de ARCA KIDS es stub → probar en piloto como "aviso de zona" básico. |
| Internet Seguro (VPN + filtro web) | `DONE` | VPN DNS, categorías `web_filters`, historial de sitios (`web_visits`). |
| Alarma sonora | `DONE` | Suena en modo silencio al bloquear app/dispositivo. |
| PIN parental compartido | `DONE` | Protege secciones sensibles de ambas apps, lockout de intentos. |
| Modo cristiano opcional | `DONE` | Contenido cristiano/educativo por defecto, configurable. |
| Solicitudes de desbloqueo | `DONE` | Hijo solicita, padre aprueba/deniega. |
| Notificaciones push (cliente) | `DONE` (código) | Cliente y registro de token listos; requiere `google-services.json` de Firebase para push remoto real en el APK release. |
| Feedback en-app | `DONE` | Formulario dentro de la app (pantalla "Sugerir"). |

### Explícitamente FUERA de esta versión

| Ítem | Estado real | Justificación |
|---|---|---|
| Pasarela de pago real (Stripe/Play Billing/RevenueCat) | No implementado | El piloto es **gratis**. Billing actual = `claim_subscription` manual (camino temporal). |
| Dominio propio / correo transaccional propio | No (SMTP por defecto de Supabase) | No bloquea el piloto; la entregabilidad de correos se puede mitigar pero se aborda post-piloto. |
| Staging / separación de proyecto prod | Dev/prod comparten `jvxeiexsmnoorhhphjld` | Riesgo aceptado para 20 familias; separar antes de escala. |
| Play Store / formularios Play (Data Safety, permisos) | Sin publicar | Distribución por **APK directo**; los formularios quedan en espera. |
| Sentry activo en producción | Cableado sin DSN | No activo; se activa con un DSN de Sentry si se quiere telemetría de crashes en el piloto. |
| CI (GitHub Actions) | No existe | No bloquea; los commits pasan typecheck+lint+tests localmente. |
| Gamificación / achievements | `BACKEND_ONLY` | Sin consumidor; fuera de alcance. |
| Modo estudio con enforcement real | `UI_ONLY` | Solo persistencia local; no se ofrece como promesa en el piloto. |
| Sync engine offline (`offline_actions`) | `MISSING` (Fase 8) | Requiere red para operar; aceptable en piloto. |
| Pruebas de carga / backups verificados | No existen | No crítico a esta escala; documentado como deuda. |

---

## 2. Criterios de éxito (medibles)

Objetivos propuestos (ajustables al diseñar la encuesta):

1. **Retención a 30 días** — ≥ 70% de las familias siguen usando la app activamente a los 30 días de instalarse.
   - Definición de "familiar activa": la familia tiene al menos 1 sesión del padre (NOE) y 1 sesión del dispositivo del hijo (ARCA KIDS) en la semana, o ≥ 1 evento de control (bloqueo/desbloqueo/límite configurado) en los últimos 7 días.
2. **Disposición a pagar** — ≥ 60% de las familias encuestadas a los 30 días declaran estar dispuestas a pagar (cualquier precio razonable) por el servicio completo.
3. **Cero bloqueantes técnicos sin resolver** — al cierre del piloto no hay problemas técnicos críticos abiertos:
   - Crashes (FATAL EXCEPTION) recurrentes en NOE o ARCA KIDS.
   - Enforcement que no funciona: una app configurada como bloqueada se puede abrir, o el límite de tiempo no corta.
   - Desincronización de vínculo (el padre pierde visibilidad del dispositivo).
   - Pérdida de datos (uso, historial web, geocercas).
   - Push remoto: si no se entrega `google-services.json`, los avisos urgentes (desbloqueos, alertas) deben funcionar vía notificación local / al abrir la app.

Reglas de decisión:
- **Continuar / fondear fase 2** si se cumplen (1) y (2) y no hay (3).
- **Pivotar / aplazar** si la retención cae por debajo del 40% o hay bloqueantes técnicos en enforcement (el núcleo del producto).

---

## 3. Cómo se van a medir

### Datos que ya se capturan hoy

| Dato | Tabla / fuente | Usado para |
|---|---|---|
| Uso por app y por día | `usage_reports` (reportado por ARCA KIDS) | Retención de uso del hijo; desempeño de límites. |
| Heartbeat de conexión | `devices.last_seen_at` (poller 15 s) | Frecuencia de uso real → "familia activa" (criterio 1). |
| Historial web | `web_visits` | Uso de Internet Seguro. |
| Solicitudes de desbloqueo | `unlock_requests` | Señal de adopción del control. |
| Alertas | `device_alerts` | Eventos de enforcement (bloqueos aplicados). |
| Preferencias de notificación | `notification_preferences` | Cuántas familias configuran alertas. |
| Tokens push registrados | `push_tokens` | Desinstalación aproximada (token que deja de estar activo). |
| Feedback | tabla `feedback` (pantalla "Sugerir") | Reportes espontáneos de problemas/ideas. |
| Cuentas, hijos, vínculos | `auth.users`, `children`, `family_members`, `pairing_codes` | Funnel de activación: cuenta → hijo → dispositivo vinculado. |
| Crashes | Sentry (configurado, **sin DSN**) | Hoy NO captura; activable en minutos con un DSN. |

### Qué hace falta agregar (sin código en esta tanda)

1. **Encuesta a los 30 días** — una sola pantalla/formulario (o Google Form enlazado): (a) disposición a pagar (Sí/No/precio razonable), (b) NPS simple (0–10), (c) qué faltó. Fuera del repo por ahora; se puede distribuir al cierre del piloto.
2. **Definición operativa de "familia activa"** — derivable de `last_seen_at` + `usage_reports`; no requiere schema nuevo, solo la query de agrupación por `family_id`.
3. **Fecha de primera vinculación** — derivable de `children/device.created_at` y del redeem de `pairing_codes`; sirve para calcular D30 por familia desde su propia línea base (no desde el día 0 global).
4. **Sentry (opcional, recomendado)** — activar `EXPO_PUBLIC_SENTRY_DSN` + plugin para capturar crashes reales del piloto; decisión del dueño del producto.
5. **Registro del plan de respaldo** — al cerrar el piloto, exportar tick por familia: activa→sí/no, encuesta respondida (sí/no), bloqueantes reportados. Tabla simple en `docs/mvp.md` (o un sheet).

### Lectura final

Con lo ya capturado hoy se pueden calcular: retención (1) y severidad técnica con feedback + posible Sentry (3). Solo la disposición a pagar (2) requiere la encuesta del punto 3.1.