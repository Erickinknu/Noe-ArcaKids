# Security Audit Log

## 2026-10-03 / 2026-10-04 — Post-release 1.4.3

### 1) PAT `SUPABASE_ACCESS_TOKEN` — COMPROMETIDO
- **Estado:** Pendiente de revocación (manual). No se ha revocado en esta sesión.
- **Razón:** Registrado como comprometido durante la auditoría de seguridad (`docs/auditoria-resumen.md`).
- **Acción requerida (manual, no automatizable en este entorno):**
  1. Acceder a Supabase ? Project Settings > API (o al proveedor donde se generó el Personal Access Token).
  2. Revocar/eliminar el PAT comprometido.
  3. Generar uno nuevo únicamente si es estrictamente necesario y rotarlo en CI/local/variables de entorno.
  4. Verificar que no queda en uso y que las integraciones usan credenciales válidas.
- **Responsable:** Operaciones / Dev
- **Evidencia a registrar (obligatoria):** fecha/hora en ISO 8601, ID/identificador del PAT revocado, quién lo revocó y resultado de la verificación.

### 2) `jwt-secret-probe` (HTTP 410)
- **Estado:** Detectado activo con respuesta HTTP 410. **Eliminación bloqueada por herramienta** (limitación del entorno).
- **Acción requerida (manual):**
  1. Inspeccionar en Supabase (Edge Functions / Logs / Auth / Triggers o endpoints relacionados) para localizar el recurso asociado a `jwt-secret-probe`.
  2. Eliminar o inhabilitar dicho recurso desde Dashboard o Supabase CLI con permisos suficientes.
  3. Verificar que deja de responder y que no reaparece.
- **Responsable:** Backend / Supabase
- **Evidencia a registrar (obligatoria):** fecha/hora ISO 8601, método de verificación (curl/inspección de logs), estado final tras la eliminación.

### 3) Cierre de release 1.4.3
- APKs NOE y ARCA KIDS 1.4.3 (versionCode 15) verificados, firmados y copiados a `C:\Users\Usuario\Documents\APKs_para_instalar\`.
- SHA-256 de archivos y certificados validados. Bundles JS sin `1.3.6` residual.