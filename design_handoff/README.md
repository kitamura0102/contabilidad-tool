# Handoff: Cifra — SaaS contable para contadores dominicanos (606/607 · DGII)

## Overview
**Cifra** es una herramienta web para contadores independientes en República Dominicana que
manejan 10–40 empresas clientes. El trabajo central: reciben facturas por WhatsApp/correo →
una IA extrae los datos → el contador confirma/corrige → se generan los reportes **606**
(compras) y **607** (ventas) para la **DGII** mensualmente, exportados en formato `.txt`.

Usuario objetivo: contador profesional (25–50 años), trabaja en laptop, usa Excel y WhatsApp
a diario. Espera una herramienta profesional, densa y confiable — no una app de consumo.

> **"Cifra" es un nombre placeholder.** Cámbialo en `design/components.jsx` (`.brand-name`)
> y en el `<title>` de `index.html`. No hay logotipo definitivo; el mark es un ícono `zap`
> sobre un cuadro azul con gradiente.

---

## About the Design Files
Los archivos en `design/` son **referencias de diseño hechas en HTML/React (Babel in-browser)** —
prototipos que muestran el aspecto y el comportamiento deseados, **no código de producción
para copiar tal cual**. La tarea es **recrear estos diseños en el entorno del codebase destino**
(React, Vue, etc.) usando sus patrones y librerías establecidas. Si todavía no existe un entorno,
elige el framework más adecuado (recomendado: **React + TypeScript + Vite**, con CSS Modules o
Tailwind) e impleméntalos ahí.

Los prototipos usan React 18 vía CDN + Babel standalone solo para poder correr sin build. En
producción: compila JSX, reemplaza los `Object.assign(window, …)` por imports/exports reales,
y mueve los datos mock (`data.jsx`) a llamadas de API.

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciado, estados e interacciones son finales.
Recrea la UI pixel-perfect usando las librerías del codebase. Los tokens exactos están abajo y en
`design/tokens.css`.

---

## Design Tokens
Fuente de verdad: **`design/tokens.css`** (`:root`). Resumen:

### Color — Neutrales fríos (slate)
| Token | Hex | Uso |
|---|---|---|
| `--c-white` | `#FFFFFF` | Superficies / cards |
| `--slate-50` | `#F7F8FA` | Fondo de página (`--bg-page`) |
| `--slate-100` | `#EFF1F5` | Hover de fila, superficie hundida |
| `--slate-150` | `#E7EAEF` | — |
| `--slate-200` | `#DEE3EA` | Bordes (`--border`) |
| `--slate-300` | `#C6CDD7` | Bordes fuertes (`--border-strong`) |
| `--slate-400` | `#97A1AD` | Íconos / texto deshabilitado |
| `--slate-500` | `#67727E` | Texto secundario (`--text-muted`) |
| `--slate-600` | `#4B5560` | — |
| `--slate-700` | `#353D47` | Texto body (`--text`) |
| `--slate-800` | `#20262E` | Superficie oscura alterna |
| `--slate-900` | `#161B22` | Sidebar (`--bg-nav`) |
| `--ink` | `#0E1319` | Títulos (`--text-strong`) |

### Color — Primario (azul royal)
| Token | Hex | Uso |
|---|---|---|
| `--blue-50` | `#EEF3FF` | Fondos sutiles, tab activo |
| `--blue-100` | `#DCE6FF` | Bordes badge azul |
| `--blue-200` | `#B6CBFF` | — |
| `--blue-300` | `#8AA9FB` | Acento en sidebar oscuro (íconos activos) |
| `--blue-500` | `#2B5CE6` | **Acción principal** (`--accent`) |
| `--blue-600` | `#1E47C7` | Hover de acción (`--accent-hover`) |
| `--blue-700` | `#173AA6` | Texto/enlace sobre claro (`--accent-text`) |

### Color — Semánticos de estado
| Estado | 50 (bg) | 100 (borde) | 500 (sólido) | 600 | 700 (texto) |
|---|---|---|---|---|---|
| Verde (procesado / RNC válido) | `#E8F6EE` | `#C9EBD7` | `#15A55C` | `#0F8C4D` | `#0B6E3D` |
| Ámbar (pendiente / confianza media) | `#FBF2DE` | `#F6E3B8` | `#C98A12` | `#A8730C` | `#855A06` |
| Rojo (error / RNC inválido / confianza baja) | `#FCECEC` | `#F8D2D2` | `#DC3B3B` | `#C42E2E` | `#A82323` |

### Tipografía
- **UI / títulos / body:** `Geist` (Google Fonts, pesos 300/400/500/600/700).
  Fallback: `"Helvetica Neue", system-ui, -apple-system, sans-serif`.
- **Datos (RNC, NCF, montos, fechas, archivo .txt):** `Geist Mono` (400/500/600) con
  `font-variant-numeric: tabular-nums`.
- Escala: `--fs-2xs 11px`, `--fs-xs 12px` (labels), `--fs-sm 13px` (celdas de tabla / UI densa),
  `--fs-base 14px` (body), `--fs-md 16px`, `--fs-lg 18px`, `--fs-xl 22px` (título de pantalla),
  `--fs-2xl 28px`.
- Clases utilitarias: `.t-h1 .t-h2 .t-h3 .t-body .t-sm .t-label .t-muted .t-faint .mono .tnum
  .upper-label`.

### Espaciado (`--sp-*`)
`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48` px.

### Radios
`--r-xs 4px` (chips densos) · `--r-sm 6px` (botones, inputs) · `--r-md 8px` (cards) ·
`--r-lg 12px` (modales) · `--r-pill 999px` (badges/toggles).

### Sombras
`--sh-xs` … `--sh-xl` (tintadas de azul-gris, suaves). Ring de foco:
`--ring: 0 0 0 3px rgba(43,92,230,0.20)`.

### Layout
Sidebar fijo **232px** (`--nav-w`), topbar **72px** (en código `min-height:72px`). Canvas
**desktop-first 1280px**, tema claro.

---

## Arquitectura de los archivos
| Archivo | Contenido |
|---|---|
| `index.html` | Carga React/Babel + CSS + todos los scripts en orden, monta `<App/>` en `#root`. |
| `tokens.css` | Sistema de diseño: tokens `:root`, base, tipografía, botones, badges, cards, tablas, inputs, animaciones. |
| `app.css` | Estilos de shell y pantallas: sidebar, topbar, tabs, validación RNC, stat cards, toolbar, drawer/modal, flujos fullscreen, dropzone, campos de extracción, preview de factura, formato DGII, settings, toast. |
| `icons.jsx` | `CF_ICONS` (set outline tipo Lucide, geometría MIT) + componente `<Icon name size strokeWidth/>`. |
| `data.jsx` | Datos mock + helpers: `formatMoney`, `formatRNC`, `lookupRNC`, `PADRON`, `CLIENTES`, `COMPRAS_606`, `VENTAS_607`, `BANDEJA`, `EXTRACCION`, `EXTRACCION_FALLO`, `TIPO_BS`, `TIPOS_NCF`, `CONTADOR`. |
| `components.jsx` | UI compartida: `ReportBadge`, `FacturaBadge`, `ConfChip`, `RncCheck`, `Avatar`, `EmptyState`, `Tabs`, `Sidebar`, `Topbar`, `confLevel`. |
| `screen-dashboard.jsx` | Pantalla 1 + `StatCard`. |
| `screen-client.jsx` | Pantalla 2 (tabs 606/607). |
| `screen-upload.jsx` | Pantalla 3 (drawer) + `XField`. |
| `screen-corrector.jsx` | Pantalla 4 (50/50). |
| `screen-report.jsx` | Pantalla 5 (vista previa DGII). |
| `screen-settings.jsx` | Pantalla 6 + `SetToggle`. |
| `screen-extra.jsx` | `Bandeja` (entrantes) + `Reportes` (overview). |
| `app.jsx` | Shell: estado de navegación, overlays del golden path, toast. |

---

## Screens / Views

### 1. Dashboard — Lista de clientes (`screen-dashboard.jsx`)
- **Propósito:** punto de entrada; ver todas las empresas, su estado 606/607 y entrar a una.
- **Layout:** sidebar 232px + columna principal. Topbar con título "Clientes", subtítulo
  "8 empresas activas · plan Profesional (8 de 40)", selector de período y acciones
  ("Exportar todo" secundario, "Agregar cliente" primario).
- **Stat cards:** grid de 4 columnas, gap 16px. Cada card (`--r-md`, padding 16/18): label arriba-izq,
  ícono en cuadro 32px arriba-der, valor 26px/600, sub-texto opcional. Métricas: Clientes activos (8),
  Facturas este mes (219, "+34 vs. abril"), 606/607 listos ("4 de 8"), Por revisar (11, ámbar).
- **Toolbar:** search-box (`min-width:280px`, ícono lupa, foco con ring azul), chips de filtro
  "Estado 606" / "Sector", contador de resultados a la derecha.
- **Tabla de clientes:** columnas Cliente (avatar de iniciales + nombre + tipo) · RNC (mono) ·
  Sector · Facturas (num) · Monto 606 (num) · Estado 606 (badge) · Estado 607 (badge) ·
  Última actividad · chevron. Filas `height:46px`, hover `--slate-50`, fila completa clickeable
  → abre Vista de cliente. Avatares con tono por sector.
- **Estado vacío** (prop `empty`): card con `EmptyState` "Agrega tu primer cliente para empezar"
  + botón primario.

### 2. Vista de cliente (`screen-client.jsx`)
- **Propósito:** ver y gestionar las facturas del cliente en el período.
- **Topbar:** botón volver (flecha), breadcrumbs `Clientes › <cliente>`, título = nombre,
  acciones "Vista previa {606|607}" (secundario, deshabilitado si 0 facturas) y "Subir factura"
  (primario).
- **Meta row:** RNC (mono) + `RncCheck` inline · Tipo · Sector · a la derecha "Estado {tab}" + badge.
- **Tabs:** "Compras (606)" y "Ventas (607)" con contador. Subrayado azul de 2px en el activo.
- **Toolbar:** search, chip de estado, badge ámbar "{n} por revisar", botón "Exportar {tab}"
  (deshabilitado si hay facturas con error).
- **Tabla 606:** Fecha (mono) · RNC emisor (mono, ícono rojo `xCircle` si inválido) · Proveedor ·
  NCF (mono) · Tipo B/S · Monto · ITBIS · Ret. ISR · Estado (`FacturaBadge`) · ícono acción
  (lápiz ámbar si requiere revisión, chevron si procesada). `tfoot` con totales.
  Click en fila con estado ≠ procesado → abre Corrector.
- **Tabla 607:** Fecha · RNC/Cédula (— si consumidor final) · Cliente · NCF · Tipo · Monto · ITBIS · Estado.
- **Estado vacío** (`facturas === 0`): `EmptyState` "No hay facturas este mes" + correo de captura
  + botón "Subir factura".

### 3. Upload + extracción IA (`screen-upload.jsx`) — drawer derecho 560px
- **Propósito:** subir una factura y confirmar/corregir los datos que extrajo la IA.
- **3 estados internos:**
  1. `drop` — dropzone (borde dashed, se torna azul en dragover), botón "Seleccionar archivo";
     debajo, card de WhatsApp/correo conectados con el correo de captura mono.
  2. `processing` — orbe azul con spinner, "Extrayendo datos…", nombre del archivo (≈2.1 s simulado).
  3. `review` — banner verde "Datos extraídos", miniatura de la factura + botón "Ver imagen y corregir",
     y **campos con confianza** (`XField`).
- **`XField`:** label + `ConfChip` (verde/ámbar/rojo según nivel) a la derecha; input con borde
  coloreado si la confianza no es alta (`.lvl-medio` ámbar / `.lvl-bajo` rojo); nota opcional debajo.
  El campo RNC monta `RncCheck` dentro del input (`.xfield-status`) y se revalida al escribir.
- **Footer (review):** "Corregir en detalle" (ghost) · "Cancelar" · "Confirmar y guardar" (primario →
  toast "Factura guardada en Compras (606)").

### 4. Editor de corrección 50/50 (`screen-corrector.jsx`) — fullscreen
- **Propósito:** corregir cuando el OCR tuvo baja confianza.
- **Header:** volver, título "Corregir factura" + archivo, badge rojo "OCR de baja confianza · N campos",
  "Cancelar" / "Guardar factura".
- **Izquierda (50%):** imagen de la factura (placeholder de papel con textura) sobre fondo `#EDF0F4`,
  con **cajas de detección** absolutas (en %) coloreadas por nivel; al pasar el cursor por un campo
  de la derecha se resalta su caja (`active`) y se muestra una etiqueta `conf% · campo`.
- **Derecha (50%):** banner ámbar de advertencia + secciones "Datos del emisor", "Comprobante",
  "Montos", cada campo es un `XField`. Los de baja confianza llevan borde rojo y nota
  ("Posible 0/O confundido", "Último dígito ilegible"); RNC con `RncCheck` en vivo. Al pie, total con ITBIS.

### 5. Vista previa 606/607 (`screen-report.jsx`) — fullscreen
- **Propósito:** revisar el reporte completo antes de exportar el `.txt` a la DGII.
- **Header:** volver, título "Vista previa — Reporte {606|607}", badge de estado
  (verde "Sin errores" / ámbar "N facturas con errores"), "Copiar", "Exportar .txt"
  (deshabilitado si hay errores → al exportar, toast).
- **report-meta:** grid de 4 (RNC declarante · Período · Registros · Formato "DGII 606 · TXT").
- **Si hay errores:** banner ámbar + "Ver pendientes".
- **Segmented control "Tabla" / "Archivo .txt":**
  - *Tabla:* columnas en orden DGII (#, RNC/Cédula, Tipo ID, Tipo B/S, NCF, Fecha `AAAAMMDD`,
    Monto facturado, ITBIS facturado, Ret. ISR). Filas con error en fondo rojo. `tfoot` con totales.
  - *Archivo .txt:* bloque oscuro con `<pre>` mono mostrando el layout pipe-delimited real
    (línea de encabezado `RNC|PERIODO|REGISTROS` en azul + una línea por comprobante; líneas con
    error en rojo). Pie con nombre `DGII_606_<rnc>_<AAAAMM>.txt` y conteo de líneas.

### 6. Configuración (`screen-settings.jsx`)
- **Layout:** `content-narrow` (max 880px), filas `set-row` (label 220px + body).
- **Filas:** Perfil del contador (avatar + nombre + exequátur, inputs nombre/teléfono) ·
  Correo de captura (correo único mono + copiar; cards WhatsApp Business y Reenvío de correo,
  ambos con badge "Conectado") · Plan y facturación (`plan-card current`, precio, medidor de
  clientes usados, "Mejorar plan") · Preferencias DGII (3 `SetToggle`: validar RNC, bloquear
  exportación con errores, alertar NCF vencidos).

### Extra — Bandeja (`screen-extra.jsx → Bandeja`)
Facturas entrantes por WhatsApp/correo. Banner azul "N facturas nuevas" + "Procesar todas".
Lista: ícono de canal, miniatura, nombre de archivo (mono), remitente/hora, `select` "Asignar a
cliente…", botón "Procesar" → abre el drawer de Upload en estado processing.

### Extra — Reportes (`screen-extra.jsx → Reportes`)
Overview de todos los clientes: Cliente · RNC · Facturas · 606 (badge) · 607 (badge) · Acciones
(Ver / 606 / 607, deshabilitados según estado). "Exportar lote" en el topbar.

---

## Interactions & Behavior
- **Navegación** (estado en `App`, `app.jsx`): `view ∈ {dashboard, client, bandeja, reportes,
  settings}`. El sidebar resalta "Clientes" también cuando `view==='client'`.
- **Golden path:** Dashboard → click cliente → Vista de cliente → "Subir factura" (drawer) →
  drop/click → processing (~2.1 s) → review → "Confirmar y guardar" **o** "Corregir en detalle"
  (Corrector) → volver → "Vista previa 606" → "Exportar .txt". Cada guardado/exportación dispara
  un **toast** (abajo-centro, 2.6 s).
- **Overlays:** `UploadDrawer` (drawer derecho), `Corrector` y `ReportPreview` (flujos fullscreen).
  El drawer cierra al hacer mousedown en el scrim.
- **Validación de RNC en vivo (`lookupRNC`):** `valid` (verde, en `PADRON` mock de la DGII) ·
  `invalid` (rojo, "No existe en DGII") · `format` (ámbar, longitud ≠ 9/11 dígitos). En producción,
  reemplazar `lookupRNC`/`PADRON` por consulta real al padrón de la DGII.
- **Confianza IA (`confLevel`):** `alto ≥ 90` (sin marcar / chip verde) · `medio 65–89` (borde y chip
  ámbar) · `bajo < 65` (borde y chip rojo).
- **Reglas de exportación:** el `.txt` se bloquea si hay ≥1 factura con estado ≠ `procesado`
  (RNC inválido o datos incompletos).
- **ITBIS = 18%** (no "IVA"). Terminología dominicana: ITBIS, DGII, RNC, NCF, 606, 607, exequátur.
- **Animaciones (bajo movimiento):** transiciones 120–160 ms ease en hover/foco; drawer entra con
  `translateX` 220 ms; línea de escaneo en preview de factura. **Importante:** el estado visible es
  la base — las entradas animan solo con `transform`, nunca dejan elementos en `opacity:0` (evita
  contenido invisible en reduced-motion / export).

## State Management
Por pantalla (mover datos mock a API en producción):
- `App`: `view`, `client`, `upload`, `corrector`, `report`, `toast`, `emptyClients`.
- `Dashboard`: `q` (búsqueda).
- `ClientView`: `tab` (606/607).
- `UploadDrawer`: `stage` (drop/processing/review), `over` (dragover), `rncVal` (revalidación).
- `Corrector`: `active` (campo resaltado), `rncVal`.
- `ReportPreview`: `vista` (tabla/txt).
- `SetToggle`: `v` (on/off).

**Datos a obtener vía API:** lista de clientes y sus estados 606/607; facturas de compras/ventas por
cliente y período; resultado de extracción IA por archivo (valor + confianza por campo + cajas de
detección); padrón DGII para validar RNC; perfil del contador y plan.

## Assets
- **Sin imágenes externas.** Las "facturas" son placeholders CSS (papel con textura mono); en
  producción se muestra la imagen/PDF real subido.
- **Íconos:** set propio en `icons.jsx` con geometría tipo **Lucide** (MIT). Se puede reemplazar por
  `lucide-react` directamente (mismos nombres en su mayoría: grid, users, file-text, upload, settings,
  search, check-circle, alert-triangle, x-circle, sparkles, etc.).
- **Avatares:** iniciales generadas; sin fotos.
- **Fuentes:** Geist + Geist Mono (Google Fonts). Si el codebase las auto-hospeda, usar woff2 local.

## Files
Todos en `design/` de este paquete (listados arriba). Punto de entrada: `design/index.html`.
