# UI/UX — Controls Consolidation & Panel Ordering

**Status:** Done (Fases A–G)
**App:** `/animations`

## Objective
Finish the UI/UX plan for the animation builder: unify the duplicated control
components, move every chart/template to bars-only, order every panel's Diseño
tab consistently, and polish control labels/accessibility. Verify with
`npx tsc --noEmit` (repo-wide lint is broken, so tsc is the gate), the dev
server, and `configVersion 23` compatibility.

## Fase A — Unify charts (bars-only)
- Static charts: dropped pie/doughnut/line/area/radar rendering paths; every
  chart renders a bar chart (`ChartType` still selects duration + semantics,
  e.g. progress bars). `rowOrder` (dark background + fixed labels) and the
  `BarDatum`-style row palette apply to all bars.
- Removed the per-series "between-datasets" split; series now render as stacked
  row marks per entity.

## Fase B — Unify typography
- One shared `TextStyle` superset (`lib/chart-config.ts`): `fontFamily`,
  `size`, `color`, `weight` (400/500/600/700), `align`, `overflow`, optional
  `letterSpacing`, `lineHeight`, `highlightColor`, `highlightRadius`,
  `underline`, `textTransform`.
- `SectionFont`, `RaceTextStyle`, and every local text style now alias
  `TextStyle`. Stats/axis/animation text configs map onto it.
- `TextStyleControls` (shared) renders the same editor everywhere: family,
  weight chips, size/color, overflow, alignment, transform, spacing,
  highlight, underline. `maxSize` defaults to 40; the animation panel passes
  `maxSize={160}`.

## Fase C — Consolidate controls
- Deleted the duplicated local definitions and `text-controls.tsx`; all
  panels import the shared set from `src/components/ui/controls/`:
  `NumberControl`, `SliderNumberInput`, `SelectControl`, `SwitchControl`,
  `ColorPickerControl`, `AutoColorInput`, `FieldSelect`, `EntitySearch`,
  `FileUploadInput`, `PalettePicker`, `TextStyleControls`, `Collapsible`,
  `Tabs`.
- `FieldSelect` filtered by `FieldRole = 'any' | 'numeric' | 'date'`; the
  selected value stays visible even if it no longer matches the role.
- Animation palette UI replaced with `PalettePicker` (one-shot "Aplicar",
  optional clear row).
- Unified format lists moved to lib:
  - `NUMBER_FORMATS` in `lib/chart-config.ts` (Número / Compacto / Decimal /
    Porcentaje / Moneda / Duración).
  - `VALUE_FORMATS` in `lib/animation-config.ts` (same canonical labels).
- New shared typography/format values reuse the canonical Spanish labels.

## Fase D — Canonical panel order & terminology
Diseño tab order: **Header → Colores → Visualización → Barras/Iconos (static)
| Barras/Filas (animated) → Eje X → Eje Y → Etiquetas → Leyendas → Lienzo →
Espaciado → Avatar → Adicionales.**

- Static panel (chart): added "Fuente" at the very top (global root font),
  moved `Etiquetas` right after `Eje Y / Valor`, kept `Iconos`, `Espaciado`.
  Final: Fuente, Header, Colores, Visualización, Barras, Iconos,
  Eje X / Categoría, Eje Y / Valor, Etiquetas, Leyendas, Lienzo, Espaciado,
  Avatar, Adicionales.
- Timeline race: data tab = template selector + Datos + Ranking; moved Header
  into Diseño; design tab: Header, Colores, Barras, Eje X, Eje Y, Fecha,
  Etiquetas, Lienzo, Avatar, Adicionales.
- Ranking: data tab = template selector + Datos + Ranking; Header in Diseño;
  design tab: Header, Filas, Etiquetas, Lienzo, Avatar, Imagen por puesto,
  Adicionales.
- Terminology: `Canvas → Lienzo`, `Etiqueta → Etiquetas`, `Eje Y / Datos →
  Eje Y / Valor`, `Eje X` / `Eje Y` / `Eje X / Categoría`.
- Aggregation labels unified (Suma / Conteo / Promedio / Mínimo / Máximo);
  `Promedio ponderado` stays ranking-only.

## Fase E — Control labels & accessibility
- `id`/`htmlFor` association (`React.useId()`) in `SelectControl`,
  `NumberControl`, `SliderNumberInput`, `AutoColorInput`, `FileUploadInput`,
  `TextStyleControls` (Familia select). `FieldSelect` delegates its label.
- `aria-label`/`aria-pressed` added to: `EntitySearch`, `PalettePicker`
  buttons, `TextStyleControls` chip groups + reset buttons, chip counter
  inputs, chart filter value input, custom-icon file input.
- `SwitchControl` already exposed `aria-label`; `ColorPickerControl` already
  labeled its swatch input.

## Fase F — Resizable sidebars, axis cleanup, text angle & overlay layout
- **Resizable sidebars** (`src/hooks/use-resizable-width.ts`): shared drag
  pointer hook (default/min/max width + `edge: 'left' | 'right'`).
  - QueryCanvas: `Tablas` sidebar (`query-canvas.tsx`) resizes from its right
    edge (`w-56` → `md:w-[var(--tables-w)]`, 200–480 px).
  - Builder: Configurar + Exportar asides (`builder/page.tsx`) resize from a
    `md+` flex handle on their left edge via `md:w-[var(--config-w)]`
    (320–640 px); mobile bottom-sheet layout untouched.
- **Axis-title controls removed** (`chart-config-panel.tsx`): deleted the
  `Etiqueta eje X` input (`xLabel`) and `Etiqueta eje Y` + `Fuente de etiquetas`
  (`yLabel` / `yLabelFont`) and the `Ángulo de etiquetas` slider (`labelAngle`).
  Fields stay in `ChartConfig` (no migration): saved configs keep rendering
  their old axis titles and label angle. `setYLabelFont` removed.
- **Category label typography** (`chart-config-panel.tsx` + `bar-chart.tsx`):
  the `Eje X / Categoría` section now exposes a "Fuente de las etiquetas"
  `TextStyleControls` over `xLabelFont` (re-added `setXLabelFont`; the category
  labels render from it) alongside the existing "Fuente de la descripción".
  Category-label angle = `xLabelFont.angle`, falling back to the legacy
  `labelAngle` (incl. the −30° auto-tilt for >8 categories). The description now
  honors its `categoryDescriptionFont.angle` (previously ignored).
- **Text angle**: `TextStyle` gains `angle?: number` (deg); `TextStyleControls`
  adds an "Ángulo (°)" `NumberControl` (−180…180, Auto reset). Rendered by the
  shared `textStyle()` remotion helper (both templates) and, for static SVG, on
  the title/subtitle (`SvgHeader` / `TitleBlock`, combined with the existing
  `layout.rotation`) and the X-axis title (`XAxisTitle`, `angle` prop). The
  Y-axis title keeps its fixed −90° layout.
- **Overlay editor shared**: new `src/components/ui/controls/overlay-editor.tsx`
  (`OverlayEditor`) replaces the duplicated per-overlay markup in the static
  panel and the animation `OverlaysSection`. Header + shared "Capa / Posición ·
  Opacidad · Blur" row, then type cards: text (textarea + `TextStyleControls` +
  full `LayoutControls` for static / compact X·Y·Rotación for animation),
  shape (type chips, colors, geometry incl. radius/stroke/rotation), image
  (URL input for static / `FileUploadInput` for animation, geometry). The
  static variant keeps `ColorPickerControl`; the animation variant keeps
  `AutoColorInput`.
- **Known limitation (pre-existing, untouched)**: the animation templates do
  not consume `overlays` — timeline/ranking overlay controls configure data
  that is not yet rendered.

## Fase G — Canvas gradient controls
- New shared helper `mixHex(a, b, t)` (hex interpolation) and
  `resolveGradient(cfg)` in `lib/chart-config.ts`; both renderers consume the
  same stop model (initial color held until `dist`, fade over `smooth` of the
  remaining path to the blended final color).
- New optional fields on `ChartConfig` and `CommonCanvasConfig` (no migration;
  defaults reproduce prior output):
  - `backgroundGradientShape: 'linear' | 'radial'`
  - `backgroundGradientCenterX/Y` — radial center (% of canvas, default 50/50)
  - `backgroundGradientRadius` — radial reach (% of the shorter side, 0–200)
  - `backgroundGradientBlend` — **intensity** (0–1): end color blended toward
    the initial; 0 = imperceptible gradient, 1 = full end color
  - `backgroundGradientSmooth` — transition width over the remaining path;
    1 = full fade (legacy), 0 = hard cut
- Static SVG (`chart-frame.tsx` `CanvasBackground`): linear via `linearGradient`
  (existing vector) or radial via `radialGradient` (userSpaceOnUse, px center +
  radius). Animation (`Background.tsx`): CSS `linear-gradient(angle, …, …)` or
  `radial-gradient(ellipse r% r% at cx% cy%, …, …)`; the ellipse % per-axis
  reach approximates the SVG radius (documented, not pixel-identical).
- Plumbing for the templates: `viz-to-remotion.ts` `commonPropsOf` + prop
  destructuring/forwarding in `timeline-race/index.tsx` and `ranking/index.tsx`.
- Controls: **Lienzo → Degradado** in both panels now show Forma (Lineal /
  Radial chips), radial → Centro X/Y + Radio (Ángulo hidden), then
  **Intensidad (%)** and **Suavizado (%)** next to the existing Distribución /
  Opacidad.

## Verification
- `npx tsc --noEmit` clean.
- `/builder` renders the static bar chart plus both animated templates;
  `configVersion 23` saved configs still load (no schema migration).