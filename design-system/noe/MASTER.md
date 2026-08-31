# Design System Master File — NOE

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** NOE (app parental — Android / Expo React Native)
**Category:** Parental Control / Family Safety — Mobile
**Audience:** Padres y tutores. Confianza, seguridad, claridad, accesibilidad.
**Stack:** React Native (Expo) — `src/providers/theme-provider.tsx`

---

## Global Rules

### Color Palette

| Role | Hex | Uso |
|------|-----|-----|
| Primary | `#0369A1` | Acciones principales, enlaces, estado activo |
| Secondary | `#0EA5E9` | Acentos, gráficos, badges informativos |
| Accent | `#22C55E` | CTA, confirmaciones, "todo seguro / activo" |
| Danger | `#EF4444` | Alertas, bloqueos, errores |
| Warn | `#F59E0B` | Avisos, pendiente de revisión |
| Background | `#F8FAFC` | Fondo principal (claro, limpio) |
| Surface | `#FFFFFF` | Tarjetas, modales |
| Text | `#0F172A` | Texto principal |
| Muted | `#475569` | Texto secundario |
| Border | `#E2E8F0` | Bordes, divisores |

**Notas:** Azul de seguridad (confianza) + verde "protegido" (tranquilidad). Feedback de estado siempre verde/ámbar/rojo además de texto (no solo color).

### Typography

- **Heading:** Lexend (clara, accesible, propia de productos de seguridad/trust)
- **Body:** Source Sans 3 (legible en pantalla, buena en móvil)
- **Google Fonts:** https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap

| Token | FontSize | Weight | Uso |
|-------|----------|--------|-----|
| `--text-title` | 28 | 700 | Títulos de pantalla |
| `--text-h1` | 22 | 600 | Encabezados de sección |
| `--text-body` | 16 | 400 | Texto, labels, inputs |
| `--text-body-lg` | 17 | 400 | Body principal |
| `--text-caption` | 13 | 400 | Metadatos, fechas |
| `--text-label` | 14 | 600 | Labels, chips |

**target: legible en móvil; mínimo 16px para body, 44pt hit targets.**

### Spacing (8pt grid)

| Token | Valor |
|-------|-------|
| `--space-xs` | 4 |
| `--space-sm` | 8 |
| `--space-md` | 16 |
| `--space-lg` | 24 |
| `--space-xl` | 32 |
| `--space-2xl` | 48 |

### Radii & Shadows

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-md` | 10 | Inputs, botones |
| `--radius-lg` | 14 | Tarjetas |
| `--radius-2xl` | 20 | Modales, FAB |
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,0.06)` | Divisores sutiles |
| `--shadow-md` | `0 4px 10px rgba(15,23,42,0.08)` | Tarjetas |
| `--shadow-lg` | `0 12px 24px rgba(15,23,42,0.12)` | Modales, hojas |

---

## Componentes

### Botones (hit target ≥ 44pt)

- **Primario:** bg `#0369A1`, texto blanco, radius 10, peso 600.
- **Accent/CTA:** bg `#22C55E`, texto blanco — para confirmar/guardar.
- **Secundario/Outline:** borde `#CBD5E1`, texto Primary.
- **Peligro:** bg `#EF4444`, texto blanco — para acciones destructivas.
- Estados presionados: `opacity .85` / `scale .98`. Transición 150-200ms.

### Tarjetas

- Fondo `#FFFFFF`, radius 14, `--shadow-md`, padding 16-24.
- Presionables: `cursor-pointer` (web) + feedback táctil (android ripple).
- Título 16-17/600 + subtítulo muted 13-14 + trailing chevron/estado.

### Inputs

- Borde `#CBD5E1`, radius 10, padding 14, body 16.
- Focus: borde Primary + ring 3px `rgba(3,105,161,0.2)`.
- Labels siempre visibles (a11y), error → borde `#EF4444` + mensaje de texto.

### Toggle / Switch (Reglas ON/OFF)

- ON: track `#0369A1`/`#22C55E` + knobe blanco.
- OFF: track `#CBD5E1`.
- Todo toggle va acompañado de texto descriptivo (nunca color solo).

### Chips / Badges de estado

- `#22C55E` (seguro/activo), `#F59E0B` (revisar), `#EF4444` (bloqueado), `#0EA5E9` (info).
- Siempre con icono + label de texto.

### Bottom Navigation (tabs)

- 5 destinos máximo, icono + label 10-11px, activo = Primary.

---

## Patrones de pantalla (mobile)

### Dashboard (Inicio)
1. Saludo + nombre del padre + notificaciones.
2. Tarjetas resumen por hijo (avatars, estatus, últimos eventos).
3. KPIs de hoy: tiempo de uso, bloqueos, alarmas (0 estado = verde "Sin alertas").
4. Lista de actividad reciente.
- Estados vacíos con copy tranquilizador + CTA claro.

### Login / Registro
- Single-column, form centrado, max-width 400px.
- Email con `inputmode=email`, password toggle visibility.
- Errores inline bajo el campo. "Recordarme" + "Olvidé mi contraseña".
- CTA primario "Iniciar sesión" + link secundario a registro.

### Children (lista)
- Tarjetas de hijos con avatar/gradiente, nombre, edad, estatus en línea.
- Tocar → detalle del hijo (reglas, actividad, dispositivos).

### Rules (Reglas)
- Grupos: Apps, Horarios, Filtrado web, Geofencing, Modo estudio.
- Cada regla: tarjeta con toggle + resumen de estado.
- Modales inferiores (bottom sheet) para editar con slots claros.

---

## Anti-patterns (NO usar)

- ❌ Morado/rosa "AI gradient" (rompe la confianza).
- ❌ Diseño infantil/playful en NOE (eso es para ARCA KIDS).
- ❌ Emojis como iconos — usar SVG (Lucide/Heroicons en web; vector icons en RN).
- ❌ Formularios con keys por defecto (usar inputmode adecuado: numérico para PIN, email, etc.).
- ❌ Tablas anchas en móvil (usar cards o scroll horizontal).
- ❌ Onboarding obligatorio sin poder saltar (Skip/Back siempre).
- ❌ Status solo con color — siempre texto + color + icono.
- ❌ Bloquear back button del Android (tratar de forma predecible).

---

## Checklist Pre-Entrega

- [ ] Iconos SVG/vector set consistente (sin emojis).
- [ ] Hit targets ≥ 44pt en táctiles.
- [ ] Contraste texto ≥ 4.5:1 (muted = `#475569` mínimo).
- [ ] Estados focus visibles (a11y).
- [ ] Estados de carga/error/offline en pantallas con datos.
- [ ] Keyboard adecuado por input (PIN numérico, email, etc.).
- [ ] `prefers-reduced-motion` / reducir animaciones.
- [ ] Draw/test responsive: solo móvil (Android), pero sin scroll horizontal.
- [ ] Copy en ES (default) + EN.
