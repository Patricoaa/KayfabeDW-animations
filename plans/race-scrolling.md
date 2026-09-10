# Race Scrolling Template — Plan

**Status:** Done
**App:** `/animations`

## Objective
Add a new animation template, `race-scrolling`, that builds on `timeline-race`
but with a *scrolling plane*: the DATE axis band translates horizontally so the
current moment stays pinned under a fixed "now" line. The **ENTITY AXIS is
STATIC**: each entity has a fixed lane with its name (and avatar) pinned on the
left, always visible. Its bar grows IN PLACE from that axis, with length
proportional to the accumulated value up to the current moment (interpolated
between data points), so the bar "eats" each date's value as the now-line
passes it. Per the approved plan, the axis supports **dates or numbers with
auto-detection**, the sweep can run **Menor→Mayor or Mayor→Menor**, the grid
can show **two configurable bands** (a positional one and a **cardinality**
one with the live value scale, each top or bottom), and each active entity
drops a **marker in its own row** at its current step showing the accumulated
value as a **number, an icon, or a reference image**.

Verified with the repo gate: `npx tsc --noEmit` (lint is broken repo-wide).

## Decisions (from the plan review)
1. **Visual model:** "Filas estáticas + barra crece en sitio" — each entity gets
   a fixed row; the bar grows from the name column with the accumulated value
   (interpolated between data points). Only the date axis band below scrolls; the
   now-guide and the header stay fixed.
2. **Bar growth:** "Longitud = acumulado, con interpolación" — bar length is
   proportional to the accumulated value up to the current moment
   (`(current/currentMax) * BAR_MAX_W`), interpolating continuously between data
   points; the bar grows smoothly and the step "bumps" on the date.
3. **Value in the axis:** "Marcador por entidad con modo configurable" —
   `markerMode: 'number' | 'icon' | 'image'`; icon glyphs come from
   `ICON_GLYPHS`, image markers reuse the entity's avatar URL (`imageField`)
   with a fallback to the number when no URL exists.
4. **Axis type:** dates + numbers with auto-detection — `dateField` is parsed
   to timestamps (bucketed per `dateFormat`); if no usable date column exists,
   `axisField` (or a heuristic time-ish fully-numeric column) drives the same
   scrolling race with `axisUnit: 'number'`. With neither, the template falls
   back to the parallel-bar compat mode.
5. **Bar anchor convention:** the bar GROWS FROM THE LEFT (entity axis,
   `BAR_TRACK_X = PAD_L + NAME_W + ROW_GAP_PX`), length `(current/currentMax) *
   BAR_MAX_W`, no longer pinned by tip to the scrolling axis. The scrolling only
   affects the axis band, whose markers pass under the fixed now-line.

## New files
- `src/remotion/templates/race-scrolling/meta.json` — id `race-scrolling`,
  componentId `RaceScrolling`, name "Race Scrolling", 1920×1080 @30fps,
  defaultDuration 14, dataProfile required `[label, value]`, optional
  `[date, image]`, columnHints `{label: [text], value: [number]}`,
  minRows 2, rowMatch `at_least` (so date/name datasets already matched by
  timeline-race also surface this template).
- `src/remotion/templates/race-scrolling/queryData.ts` — legacy Remotion studio
  data path (maps `v_title_timeline` → `RaceScrollingProps`; auto-detect
  `axisUnit` by magnitude).
- `src/remotion/templates/race-scrolling/index.tsx` — the renderer:
  - `RaceScrollingItem {label, image?, pos, value}`; full props (all
    timeline-race props + `axisUnit`, `anchorX` (5-95, default 35),
    `axisTicks` (2-24, default 8), `showMarkers` (default true),
    `markerMode`, `markerIcon`, `markerSize` (default 26), `markerText`).
  - Scrolling geometry: `anchorWorld = anchorFrac*BAR_MAX_W`,
    `scrollX = anchorWorld - nowWorld`; a `world` container (rows + Y axis +
    axis band with ticks **and markers**) is translated by `scrollX`; the
    "now" guide line + big bottom-right moment label stay fixed.
  - Rows/pop/ranking-swap/winner-reveal/outro mirror timeline-race (pops by
    first-step delay, `SWAP` glides, dimOthers, contraction outro).
  - Axis band positioned top (`-BAND_H-18`) or bottom (`rowsHeight+18`),
    `BAND_H = max(40, MARKER_SIZE+20)`; markers centered at 50% of the band.
  - Responsive geometry identical to timeline-race (portrait/landscape/custom).

## Changed files
- `src/lib/animation-config.ts` — `RaceScrollingConfig = TimelineRaceConfig &
  {axisField?, anchorX?, axisTicks?, showMarkers?, markerMode?, markerIcon?,
  markerSize?, markerText?}`; registered under `'race-scrolling'` in
  `AnimationTemplateConfig`.
- `src/lib/viz-to-remotion.ts` — `convertRaceScrolling()` (date → numeric-axis
  → compat, with `axisUnit`, bucketing per `dateFormat`, running/period
  accumulation, `valueAgg`); `getRaceScrollingParticipants()`; registered in
  `CONVERTERS`.
- `src/components/builder/animation-config-panel.tsx` — `RaceScrollingPanel`
  (Datos + Ranking + Design: Header → Colores → Barras → **Eje** → **Marcadores
  del eje** → Eje Y → Fecha → Etiquetas → Lienzo → Avatar → Adicionales), with
  the new "Campo del eje numérico (opcional)" FieldSelect and the marker mode/
  glyph/size/text controls. Wired into `AnimationConfigPanel`.
- `src/components/builder/template-picker.tsx` — `TEMPLATE_ICONS['race-scrolling']
  = MoveRight`.
- `src/components/builder/animation-preview.tsx` — lazy `m.RaceScrolling`
  component registered.
- `src/app/builder/page.tsx` — participants come from
  `getRaceScrollingParticipants` for `race-scrolling`.
- `src/remotion/generated/*` — regenerated via `npm run build:templates`.

## Verification
- `npm run build:templates` regenerates registry/Root/schema (3 templates).
- `npx tsc --noEmit` passes clean.

## Feedback round (2026-09-09) — cardinalidad, doble banda, marcadores por fila
User feedback items addressed in this round:

1. **Campo de cardinalidad + dirección** — the Datos tab now has a single
   "Eje de la carrera (cardinalidad)" field (`role="any"`, numbers OR dates,
   auto-detected; legacy `dateField` still honored as fallback) plus a
   "Presentación del eje" control (`axisDirection: 'asc' | 'desc'`). `desc`
   only reverses the value→position mapping (`posToX`/`valueAtX`); the sweep,
   camera and ranking are unchanged. Added the plain-numeric guard so a year/
   round column is never coerced into a bogus 1970 date axis.
2. **Al menos un eje de cardinalidad** — the grid can show a SECOND band
   (`showValueAxis`, `valueAxisPosition`) with the live value scale
   (0 → current max, `fmtValue(currentMax * frac)`), painted on the traveling
   plane like the positional band; each band stacks on its own side (positional
   next to the rows, cardinality outside it when sharing a side).
3. **Marcadores distribuidos por fila** — markers are no longer stacked on the
   band; each active entity renders its number/icon/image marker INSIDE ITS OWN
   row's bar segment at `curX * BAR_MAX_W` with `translateX(scrollX)`, so it
   travels left→right with the plane while staying on its entity's lane.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/lib/viz-to-remotion.ts`, `src/lib/animation-config.ts`,
`src/components/builder/animation-config-panel.tsx`, this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — grid por cada fecha + plot box (cinta)
User feedback: "El eje debe tener grid o ejes con cada fecha ... scrolleando
horizontalmente dentro del plot ... van desapareciendo en la medida que
sobrepasan esos límites (como una cinta que se desplaza) al igual que sus
marcadores."

1. **Grid por cada fecha real** — the positional band no longer draws
   evenly-spaced synthetic ticks from `axisTicks`. It now collects the distinct
   real positions of the data (`[...new Set(items.map(r => r.pos))].sort()`)
   and renders ONE tick + label + VERTICAL GRIDLINE per distinct date (or
   numeric axis value) at its exact spot (`posToX(p) * BAR_MAX_W`). Labels may
   overlap at high density; the user accepted that ("no es necesario hacer un
   solapado ... los ejes van apareciendo en el plot").
2. **Plot box = clip viewport** — the scrolling content (positional band,
   cardinality band, gridlines) now lives inside a fixed clip viewport exactly
   over the bar track (`left: BAR_TRACK_X, top: rowsTopY - topPx, width:
   BAR_MAX_W, height: topPx + bottomEnd; overflow: hidden`). The translated
   plane sits inside it, so labels and gridlines visibly slide out and vanish
   as they cross the plot's left (entity-axis) or right edge — the moving
   ribbon effect. Rows, names, avatars and the now-guide stay outside the clip.
3. **Marcadores recortados en el plot** — each row's bar segment gained a
   marker-only clip layer (`position:absolute; inset:0; overflow:hidden;
   pointerEvents:none`) wrapping `markerFor(p)`. Markers keep their
   `translateX(scrollX)` ride but now disappear when they pass the bar-track
   limits, matching the tape (the layer clips only markers, not the bar glow
   or the in-bar value label).

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx` (relabeled the "Marcas del
eje" slider → "Marcas del eje de valores", updated hint texts), this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — grid spacing configurable + etiqueta toggle
User feedback: "la separación entre cada grid es configurable ... los ejes no
tienen que mostrarse todos dentro del plot ... la separación entre fechas (grid
debe ser configurable)" + "toggle para mostrar/ocultar etiqueta de la entidad."

1. **Separación del grid configurable** — new `gridSpacing` (px, 20-320,
   default 90) = min horizontal distance between consecutive positional
   gridlines/labels. `ticks` still starts from the distinct real positions of
   the data but only keeps one when `|x − lastKeptX| >= gridSpacing` (uses
   `Math.abs`, so it also thins correctly on `desc` sweeps). Closer dates are
   skipped; the rest slide in/out with the scroll and stay distinguishable.
2. **Toggle de etiqueta de entidad** — new `showLabels` (default true). When
   false `NAME_W = 0` and the renderer skips the name column, so the bar track
   / plot box expands to the left (`BAR_TRACK_X`, `BAR_MAX_W`, now-guide and
   gridlines all adapt since they derive from `NAME_W`).

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/lib/animation-config.ts`, `src/lib/viz-to-remotion.ts`,
`src/components/builder/animation-config-panel.tsx` ("Separación del grid (px)"
in Eje; "Mostrar etiqueta de la entidad" in Etiquetas; fixed stale hint about
the outro label), this plan. Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — máximo de entidades por valor final o filtro
User feedback: "A diferencia de un timeline race el máximo de entidades debe
truncar según último valor acumulado (control para definir si es el mayor o
menor) o bien por filtro específico para seleccionar las unidades a mostrar."

1. **Truncado por valor final acumulado** — new `entitySelection` default
   `'final-value'`: when `maxRows` is set, the participant set is decided ONCE
   by each entity's accumulated value at the END of the timeline (`finalValueDirection`
   `'top'` keeps the largest N, `'bottom'` the smallest N), unlike the
   timeline-race whose mid-race live rank decides the cap. Applied in
   `convertRaceScrolling` from the pre-sort `steps` (final value = value of the
   last period per label), keeping the full-timeline `domain`; the renderer's
   live top-N slice over the trimmed universe is a no-op.
2. **Filtro manual** — `entitySelection: 'manual'` races exactly the labels in
   `entityFilter` (ignores `maxRows`, empty = all entities). Panel shows a
   searchable checkbox list of every entity (`EntitySearch` + scroll list);
   when set, `maxRows` is forced undefined for the renderer so the filter is
   authoritative.

Changed: `src/lib/animation-config.ts` (`entitySelection`/`finalValueDirection`/
`entityFilter`), `src/lib/viz-to-remotion.ts` (selection + passthrough),
`src/components/builder/animation-config-panel.tsx` (Ranking: "Selección de
entidades" select, extremo conservar, listado manual), this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — filas fijas (sin reordenar en vivo)
User feedback: "El race scrolling se caracteriza por mostrar de manera fija las
entidades. No requiere que se reordene de manera constante de mayor a menor en
cada fecha que pasa. Basta con fijar las posiciones iniciales y se mantienen los
puestos de manera permanente (el ordenamiento puede ser en orden alfabético)."

Rows are now STATIC: `buildSnap` assigns each lane ONCE from `staticOrder`
(alphabetical by label) and never re-sorts by the live value, so the swap /
entry-exit machinery becomes inert (unlike a timeline-race whose rows swap every
sweep). Inactive entities keep their fixed row (empty rail, label visible); the
leader for the podium effect is the active entity with the highest current value
(`leaderOf` reduce), and `entityOrder` follows the static lanes so the bar
palette stays lane-consistent. Bars still grow in place.

Changed: `src/remotion/templates/race-scrolling/index.tsx`, this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — sin orden de fila, eje Y permanente, etiquetas arriba
User feedback: "<El control> 'Orden de la fila (izq → der)' no tiene sentido en
este render, remueve su funcionalidad completamente: siempre va primero avatar.
El plot con eje Y debe mostrarse de manera permanente (la cardinalidad 0) y con
grosor y color configurables, para definir mejor hasta dónde se visualiza el
scrolling de los ejes de fecha. Los ejes con fecha deben visualizarse arriba de
cada grid de fecha (hoy están solapadas, todas juntas)."

1. **Fila sin orden** — `SEG_ORDER` fijo `['avatar', 'bar']`; se elimina el
   control "Orden de la fila (izq → der)" y el `setRowOrder` de `RaceScrollingPanel`.
   `rowOrder`/`axisPosition` siguen en el esquema compartido pero se ignoran en
   `presentationOf` de race-scrolling.
2. **Eje Y permanente** — la escala de cardinalidad (0 → máximo acumulado) ya no
   viaja como banda; es un eje vertical ESTÁTICO en el borde derecho del plot
   (`BAR_TRACK_X + BAR_MAX_W`), siempre visible, con grosor `yAxisWidth` y color
   `yAxisColor` configurables. Marca hasta dónde se recorta la cinta de fechas.
   Se eliminan los controles "Eje de cardinalidad (valores)"/"Posición del eje"
   y el toggle "Eje vertical (Y)" del panel (el eje ya es permanente).
3. **Etiquetas de fecha arriba de cada grid** — cada fecha real dibuja su
   gridline vertical y su etiqueta DIRECTAMENTE ARRIBA, en una franja propia
   (`DATE_LABEL_H`) que se desplaza con la cinta; la etiqueta va centrada en su
   línea. Guard anti-solapamiento (`dateLabels`): tras el adelgazado por
   `gridSpacing`, se descarta toda etiqueta cuya anchura estimada collisionaría
   con la anterior, así nunca se amontonan.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`, `src/lib/viz-to-remotion.ts`,
`src/lib/animation-config.ts`, this plan. Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — sin controles obsoletos, plot alineado a filas
User feedback: "remueve los siguientes controles: Posición del grupo de filas
(barsX/barsY), Ancla de la cámara (anchorX), Orden de la fila (rowOrder);
showValueAxis/valueAxisPosition/axisPosition/rowOrder remover del esquema, no
consideres compatibilidad. El eje Y permanente para posicionarse correctamente
debe considerar el tamaño de los avatares (radio + padding) y la 'Separación
vertical entre filas (px)' para el inicio y fin del plot en vertical. El GRID DE
FECHAS también debe considerar ese control para posicionar inicio/final del eje
+ un padding."

1. **Controles/fields eliminados** — se quitan del `RaceScrollingPanel`:
   "Posición del grupo de filas" (`barsX`/`barsY`), "Ancla de la cámara"
   (`anchorX`) y "Orden de la fila". Del esquema se borran
   `showValueAxis`/`valueAxisPosition`/`anchorX` y, vía
   `Omit<TimelineRaceConfig, 'axisPosition'|'rowOrder'|'barsX'|'barsY'>`,
   `axisPosition`/`rowOrder`/`barsX`/`barsY` dejan de existir para
   race-scrolling (timeline-race/ranking siguen usándolos en el tipo compartido).
   El renderer fija el ancla de cámara en 35% y ya no recibe `anchorX`/`barsX`/`barsY`.
2. **Alineación horizontal con las filas** — `BAR_TRACK_X` pasa de
   `PAD_L + NAME_W + ROW_GAP_PX` a
   `PAD_L + NAME_W + ROW_GAP_PX + AVATAR_W + ROW_GAP_PX`: el layout de cada fila es
   `[nombre][avatar][barra]`, así el origen real de la barra queda tras nombre +
   gap + avatar (su tamaño + padding ≈ radio + aire) + gap. Todo el plot
   (gridlines, etiquetas, eje Y, now-guide, `anchorXPx`) hereda ese origen.
3. **Inicio/fin del plot en vertical** — la extensión vertical deriva del bloque
   de filas (cuya altura incluye cada hueco de la "Separación vertical entre
   filas") más un padding proporcional al mismo control:
   `PLOT_PAD_Y = max(8, ROW_GAP/2)`, `DATE_BAND_H = DATE_LABEL_H + 10`,
   `rowsTopY = DATE_BAND_H + PLOT_PAD_Y`, `plotTop = rowsTopY - PLOT_PAD_Y`,
   `bottomEnd = rowsHeight + PLOT_PAD_Y * 2`. Eje Y, gridlines de fecha,
   now-guide y la franja de etiquetas comparten esa geometría (antes el eje Y
   usaba `rowsTop` centrado y las filas render con `rowsTop + laneY`, dos bases
   distintas → desalineación vertical). La banda de fechas se reserva en
   `rowBudget` para que filas + etiquetas quepan.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`, `src/lib/viz-to-remotion.ts`,
`src/lib/animation-config.ts`, this plan. Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — sin marcas del eje Y, gridline, marcadores = valor de fecha
User feedback: "remove la funcionalidad de Marcas del eje de valores; mueve la
Separación vertical entre filas y horizontal a la sección Barras; los controles
Eje se deben renombrar gridline; los marcadores corresponden al valor acumulado
de la fecha específica que representa la cantidad a sumar de la fecha — el valor
a representar no es el total sino el de esa fecha en particular."

1. **Marcas del eje de valores eliminadas** — se borra `axisTicks` (y su
   passthrough/doc) y `valueTicks`: el eje Y permanente queda como UNA línea
   vertical (grosor `yAxisWidth` + color `yAxisColor` configurables) en el borde
   derecho del plot, sin marcas ni etiquetas numéricas (escala implícita
   0 → máximo acumulado). Se actualizan los hints del panel ("Marcas del eje de
   valores", "Eje Y", párrafo del plot).
2. **Separadores a "Barras"** — los controles "Separación vertical entre filas
   (px)" (`rowGap`) y "Separación horizontal (px)" (`rowGapH`) salen del
   collapsible "Eje" y van a "Barras" (tras "Grosor de la barra"); `rowGap`
   conserva su hint (define inicio/fin del plot + padding).
3. **"Eje" → "Gridline"** — el collapsible que agrupa formato de fecha, grid
   `gridSpacing`, toggle de gridlines y formato del valor se renombra a
   "Gridline" (solo race-scrolling; los "Eje X"/"Eje Y" de timeline-race/chart no
   se tocan).
4. **Marcadores = valor de la fecha (delta)** — el marcador numérico de entidad
   ya no muestra el total acumulado (`p.current`, interpolado) sino el valor DE
   ESA FECHA: la cantidad que aporta ese periodo. `convertRaceScrolling` emite
   `delta: periodValue` por step (disponible también en modo acumulado, donde
   `value[i]` es el running) y lo propaga hasta `RaceScrollingItem`;
   `buildSnap` interpola `currentDelta` igual que `current` y el marcador
   renderiza `Math.round(p.currentDelta)`. Las BARRAS siguen creciendo con el
   total acumulado (solo cambia el número del marcador).

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`, `src/lib/viz-to-remotion.ts`,
`src/lib/animation-config.ts`, this plan. Gate `npx tsc --noEmit` clean.