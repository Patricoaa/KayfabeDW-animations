# UI/UX — Controls Consolidation & Panel Ordering

**Status:** Done (Fases A–E)
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

## Verification
- `npx tsc --noEmit` clean.
- `/builder` renders the static bar chart plus both animated templates;
  `configVersion 23` saved configs still load (no schema migration).