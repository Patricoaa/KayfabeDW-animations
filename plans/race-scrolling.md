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

> **Fix post-commit:** en la primera implementación el cambio de
> `p.current → p.currentDelta` se aplicó por error al label del EXTREMO de la
> barra (ambos labels usaban el string idéntico) en vez del marcador. Swap
> corregido: `markerFor` (modo número) muestra `p.currentDelta` y el label de
> la barra vuelve a `p.current`.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`, `src/lib/viz-to-remotion.ts`,
`src/lib/animation-config.ts`, this plan. Gate `npx tsc --noEmit` clean.
## Feedback round (2026-09-09) — marcadores en cada grid de fecha ("caja eje")
User feedback: "Los marcadores de posición deben ir apareciendo en caja eje (cada
grid de fecha), no tener su propio eje permanente, de tal forma que cada eje tenga
su marcador (en el caso de iconos/imágenes); si el valor es 0 no se visualiza."

Decisions (clarified with the user):
1. **Por entidad en los grids** — cada grid de fecha ("caja eje") lleva el
   marcador (número/ícono/imagen) de cada entidad que aporta valor ESA fecha
   (`delta ≠ 0`), PINNED sobre la gridline en la coordenada exacta de esa fecha.
2. **Ocultar si valor == 0** — una fecha con valor 0 no dibuja marcador para esa
   entidad.
3. **A la altura de su fila** — el marcador se centra verticalmente en la fila de
   la entidad (`PLOT_PAD_Y + laneY(rank) + ROW_H/2`).

4. **Implementación** — se elimina el marcador viajero por-fila (`markerFor` +
   capa en `renderRow`). `ticks` ahora lleva la posición cruda (`pos`) además de
   `label`/`x`. Nuevo índice `markersByPos: Map<pos, {label, image, delta}[]>`
   construido desde `rows` (solo `delta !== 0`). Capa de marcadores con la misma
   geometría de clip del plot (`BAR_TRACK_X, plotTop, BAR_MAX_W, bottomEnd`,
   `overflow hidden`, `translateX(scrollX)`, zIndex 3 sobre las barras), que
   por cada tick conservado renderiza los marcadores de las entidades visibles
   (`currentRank.window`). Solo los grids que `gridSpacing` mantiene llevan
   marcador (coherente con "cada grid").
5. **Limpieza** — `curX`/`currentDelta` ya no tienen consumidores → eliminados
   de `Participant` y `buildSnap`; los steps quedan `{x, value}` (el `delta` se
   lee de `rows`). El color del ícono usa `markerColorOf(label, image)`
   (`barColors`/paleta) en vez de `barFillOf` (que dependía del participante).

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`, `src/lib/animation-config.ts`,
this plan. Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — eje Y junto al avatar + desplazamiento X/Y del bloque
User feedback: "La posición del eje Y permanente debe estar a la derecha del avatar
con un mínimo de padding. Añade un control de posición de eje Y y X en píxeles para
mover las barras y todos sus elementos anclados (eje Y permanente, gridline, avatar,
etiquetas, etc)."

1. **Eje Y a la derecha del avatar** — la línea permanente del eje Y se mueve del
   borde derecho del plot (`BAR_TRACK_X + BAR_MAX_W`) al ORIGEN del carril de
   barras (`BAR_TRACK_X`), justo a la derecha de la columna de avatares; el
   "minimum padding" es el hueco horizontal del row (`ROW_GAP_PX`). Sigue siendo
   UNA línea vertical (escala implícita 0 → máximo acumulado), ahora el origen
   desde el que crecen las barras (mismo criterio que timeline-race).
2. **Controles X/Y (px) en "Barras"** — se reintroduce `barsX`/`barsY`
   (heredados de `TimelineRaceConfig`, ya no se omiten en `RaceScrollingConfig` y
   pasan por `presentationOf` en viz-to-remotion). El contenedor del bloque
   anclado (`flex:1`) aplica `translate(barsX, barsY)`, moviendo JUNTOS: barras,
   avatares, etiquetas de entidad, ejes Y permanente, la cinta (gridlines,
   etiquetas de fecha y marcadores) y la línea de "ahora". Controles "X (px)" /
   "Y (px)" al final del collapsible "Barras" (mismo patrón que timeline-race).
3. **Textos actualizados** — hints del panel ("Gridline", "Eje Y") y comentarios
   del renderer/`animation-config.ts` describen el eje junto al avatar en lugar
   del borde derecho del plot.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`, `src/lib/viz-to-remotion.ts`,
`src/lib/animation-config.ts`, this plan. Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — marcador número = delta entre acumulados
User feedback: "Cada marcador de eje, si es número, debe mostrar la cantidad delta
entre valor acumulado en fecha − valor acumulado fecha anterior, para mostrar el
valor de la fecha que aporta al acumulado."

1. **Delta calculado en el renderer** — `markersByPos` ya no confía en el campo
   `delta` de los items; calcula por entidad `delta = value(pos) − value(pos
   anterior)` (el primer valor es su propio aporte), recorriendo `rows` en orden
   de posición con un mapa `prevValue` por label. Es exactamente "valor acumulado
   en fecha − valor acumulado en la fecha anterior" y queda autoritativo sin
   depender del origen de datos (viz, compat o queryData legacy).
2. **Modo 'period'** — se pasa `accumulateMode` al renderer (prop + passthrough en
   `viz-to-remotion`). En modo running delta = resta de acumulados; en modo period
   `value` YA es la cantidad del periodo, así que delta = value directamente.
   Se oculta el marcador cuando el delta es 0 (sin cambio de valor).
3. **Docs/hints** — cabecera del renderer, doc de `RaceScrollingItem.delta`
   (queda informacional), nota de `showMarkers` en `animation-config.ts` y hint
   del panel "Marcadores del eje" describen la fórmula del acumulado.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/lib/viz-to-remotion.ts`, `src/components/builder/animation-config-panel.tsx`,
`src/lib/animation-config.ts`, this plan. Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — acumulación anclada al eje Y permanente
User requirements: "todas las barras comiencen en 0"; "el primer valor del grid
de fechas comience en la mitad del plot"; "la acumulación se represente
visualmente cuando el grid con la fecha toque el eje y permanente".

1. **"Now" clavado en el eje Y** — `anchorWorld = 0` (borde izquierdo del plot,
   `BAR_TRACK_X` = origen de las barras). Se elimina la línea now-guide accent
   (antes al 35%) y la variable `anchorXPx`: el eje Y permanente ES el punto de
   acumulación (decisión del usuario: eliminarla para no superponer líneas).
2. **Barrido 1.5 plots** — `nowWorld = (guideT · 1.5 − 0.5) · BAR_MAX_W`:
   - `guideT=0` → `buildSnap(-0.5)` (ningún step activo) → **todas las barras
     en 0** y el primer grid (x=0) queda **al centro del plot**.
   - `guideT=1` → último grid **tocando el eje Y**, acumulado completo.
   Cada grid que cruza el eje va incorporando su valor a las barras; la
   interpolación entre fechas (crecimiento suave) se conserva.
3. **Now-label** — `nowFrac = clamp(guideT·1.5−0.5, 0, 1)` para `valueAtX`:
   muestra la primera fecha mientras la cinta llega, luego avanza con el
   barrido. Ritmo: misma duración (cinta a 1.5× por frame, decisión del usuario).

Changed: `src/remotion/templates/race-scrolling/index.tsx`, this plan.
Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — camino invisible, escala global, fondo del avatar y eje Y
User requirements: "el camino de las barras debe ser invisible"; "desde el inicio
se debe calcular el máximo acumulado y a partir de eso hacer crecer las barras";
"añade una opción de heredar el color de fondo del avatar según el color de la
barra"; "el eje permanente Y debe comenzar justo donde comienzan las barras".

1. **Camino/rail invisible** — el groove tras las barras por defecto ya no se
   dibuja (`showRail` pasa a false en race-scrolling); solo quedan las barras.
2. **Escala global fija** — `currentMax` dinámico (recalibrado durante la
   carrera) se reemplaza por `maxAccum`: el máximo valor acumulado de TODO el
   dataset (todas las entidades × todas las fechas), calculado una vez al
   inicio. Las barras crecen hacia ese máximo estable sin reescalar en mitad
   del video (`rawW = display / maxAccum * BAR_MAX_W`).
3. **Fondo del avatar desde el color de barra** — nueva opción
   `avatarBgFromBar` (campo nuevo en `TimelineRaceConfig`, switch "Fondo desde
   color de barra" en la sección Avatar del panel, habilitado para timeline-race
   y race-scrolling; ranking no lo muestra). Cada avatar usa `barFill` como
   fondo (per-entity override → palette → leader/neutro) e ignora `avatarBg`.
4. **Eje Y alineado con las barras** — el eje permanente ahora ocupa
   exactamente el bloque de filas (`top: rowsTopY, height: rowsHeight`) en vez
   de extenderse en el padding del plot: comienza justo donde comienzan las
   barras y termina donde terminan.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/remotion/templates/timeline-race/index.tsx`,
`src/lib/viz-to-remotion.ts`, `src/lib/animation-config.ts`,
`src/components/builder/animation-config-panel.tsx`, this plan.
Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-09) — barras pegadas al avatar, gridlines sin saltos
User requirements: "las barras en su extremo izquierdo deben tocar el avatar";
"las gridlines deberían mostrar todas las fechas, sin saltos"; "el gridline con
fechas debe tener un eje x donde cada valor de eje es una fecha y debería
comenzar en una fecha vacía en el inicio (perpendicular al eje y)"; "el
ocultamiento del gridline de fechas se oculta justo en la posición del eje y
permanente al hacer scrolling".

1. **Barras tocando el avatar** — `BAR_TRACK_X` ya no incluye el `ROW_GAP_PX`
   final (`PAD_L + NAME_W + ROW_GAP_PX + AVATAR_W`): es el borde derecho del
   avatar. El segmento bar se tira `marginLeft: -ROW_GAP_PX` para cancelar el
   flex gap, así la barra arranca exactamente contra el avatar.
2. **Gridlines SIN saltos** — se elimina el descarte por `gridSpacing` en
   `ticks` (una gridline por cada posición real distinta) y el filtro de
   solapamiento en `dateLabels` (toda fecha muestra su etiqueta, aunque se
   empalmen en fechas densas). `gridSpacing` queda deprecated/ignorado (se
   conserva el campo por compatibilidad de proyectos guardados); se retira su
   control del panel.
3. **Eje x de fechas + fecha vacía al inicio** — confirmado sin cambios: la
   cinta (eje x, cada valor = una fecha) nace en el eje Y con tramo vacío y el
   primer dato aparece al centro y recorre hacia el eje (decisión del usuario).
   Sin línea base ni tick vacío explícito.
4. **Ocultamiento en el eje Y** — preservado por construcción: el clip del plot
   box empieza en el nuevo `BAR_TRACK_X`, así que cada gridline se oculta
   exactamente al cruzar el eje Y durante el scroll.

Panel: se quita el control "Separación del grid (px)" y se actualizan los hints
del collapsible "Gridline" y del texto del plot (barras tocan el avatar, todas
las fechas se dibujan, ocultamiento en el eje Y).

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`,
`src/lib/animation-config.ts`, this plan. Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-10) — barras 2px a la izquierda, etiquetas clipeadas en el eje, control de separación
User requirements: "mueve un par de píxeles a la izquierda las barras"; "el
gridline debe iniciar a la altura horizontal del eje permanente"; "el gridline
debe tener control de la separación entre gridline"; "los marcadores de ejes
desaparecen correctamente al scrollear hasta el eje permanente y, ese mismo
comportamiento deben tener las etiquetas de fecha".

1. **Barras 2px a la izquierda** — el segmento bar ya cancelaba el flex gap
   ($-ROW_GAP_PX$); ahora se tira 2px más ($BAR_TOUCH_PX = 2$), así cada barra
   tapa un par de píxeles del borde derecho del avatar. Eje Y y plot quedan en
   $BAR_TRACK_X$ (no se mueven).
2. **Etiquetas de fecha ocultándose en el eje — BUG real corregido** — la franja
   de etiquetas aplicaba `transform: translateX(scrollX)` sobre sí misma con
   `overflow: hidden`, así que su borde de recorte viajaba con la cinta y las
   etiquetas NO se ocultaban en el eje (a diferencia de marcadores/gridlines,
   que viven dentro de una caja de clip fija). Las etiquetas se movieron DENTRO
   del plano del plot-box (clip fijo en $BAR_TRACK_X$), por lo que ahora
   comparten exactamente el recorte de gridlines y marcadores: se ocultan en el
   eje Y al hacer scroll. El plot box sube a `top: PLOT_PAD_Y` (cubre la banda de
   etiquetas) y las gridlines usan `top: DATE_BAND_H` dentro del plano — siguen
   arrancando en `rowsTopY`, el mismo tramo vertical que el eje Y (la altura del
   gridline ya estaba alineada; se pidió explícitamente y se confirmó).
3. **Cinta anclada al eje** — el origen x de la cinta ($x=0$) queda exactamente
   en el eje Y; cada gridline nace ahí, cruza y se oculta en el mismo eje al
   scrollear (misma geometría que antes; ahora garantizado por el clip único).
4. **Control de separación entre gridlines** — se reintroduce `gridSpacing` como
   separación MINIMA en px entre gridlines: 0 (default) = TODAS las fechas sin
   saltos; >0 omite las fechas que quedan a menos de N px del gridline anterior.
   Panel: SliderNumberInput "Separación mínima entre gridlines (px)" (0-320,
   step 5) en la sección Gridline; hint actualizado. Se quita el comentario
   DEPRECATED del campo en el interfaz y en `animation-config.ts`.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`,
`src/lib/animation-config.ts`, this plan. Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-10) — la barra aumenta SOLO cuando el marcador cruza el eje Y
User requirement: "el aumento de la barra se produce solo cuando el marcador
del eje sobrepasa el eje y permanente".

1. **Causa raíz** — las barras acumulaban con `buildSnap(guideT)` (`rankAtFrame`
   usaba `guideTAt(f)`), no con la fracción real en el eje (`nowFrac`). Como
   `guideT` recorre 0→1 mientras el eje barre 1.5 plots, las barras crecían
   ANTES de que el primer marcador tocara el eje y con una interp. lineal
   continua entre fechas (lerp `cur + (nxt−cur)*frac`).
2. **Fix** —
   - `rankAtFrame(f)` usa `t = nowFracAt(f) = clamp(guideTAt(f)*1.5−0.5, 0, 1)`
     (la fracción que está EN el eje; la misma que rige la cinta). Las barras
     quedan planas en 0 durante el tramo vacío y empiezan a crecer cuando el
     primer marcador cruza el eje.
   - `buildSnap` sin lerp: target discreto por fecha cruzada
     (`running`: `steps[i].value`; `period`: suma de periodos hasta `i`).
   - **Mini-ease (decisión del usuario)**: `barDisplayValue(label, f)` anima la
     anchura desde el valor anterior al nuevo durante `STEP_EASE_FRAMES`
     (≈0.35s, smoothstep) empezando exactamente en `axisReachFrame(step.x)` —
     el frame en que la gridline/el marcador de esa fecha toca el eje Y — y la
     mantiene plana hasta el siguiente cruce. `axisReachFrame` invierte el
     smoothstep (Newton) con cache por fracción.
   - `maxAccum` pasa a ser el máximo TOTAL por entidad (`period` = suma de
     periodos) para que las barras no desborden `BAR_MAX_W`.
   - El texto del valor en la barra usa el valor suavizado; el ranking/líder
     (`isLeader`) usa el target discreto.
3. Panel: hint del plot actualizado. Renderer: encabezado actualizado.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`, this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round (2026-09-10) — separación uniforme entre gridlines + barras 6px detrás del avatar
User requirement: "El control de Separación mínima entre gridlines (px) no
debe modificar el hecho de que las fechas se deben siempre visualizar todas.
La barra muévela unos cuantos px a la izquierda del canvas y asegúrate de que
la barra quede por detrás del avatar."

1. **`gridSpacing` = separación FIJA entre gridlines, sin omitir nunca fechas**
   (usuario eligió "Espaciado uniforme"):
   - `positions` = lista ordenada única de valores del eje (todas se dibujan
     siempre). `fracFor(v)`: 0/∅ → `posToX(v)` (posición real según valor);
     con `gridSpacing > 0` → índice `k/(n−1)` (fechas EQUIDISTANTES; la cinta
     mide `ribbonLen = (n−1)*px` y puede exceder el ancho del plot — las que
     queden fuera las arrastra el clip).
   - `ticks` ya no descarta nada (`ticks = positions.map(...)`); gridlines,
     etiquetas y marcadores usan `xPx(fracFor(p))`.
   - `nowAxisValue`: en modo uniforme se ajusta a la fecha del gridline en el
     eje (`positions[round(nowFrac*(n−1))]`); en modo proporcional, `valueAtX`.
   - `buildSnap`/`barDisplayValue`/`axisReachFrame` siguen por fracciones, así
     que los saltos al cruzar el eje Y no cambian.
2. **Barras 6px a la izquierda y detrás del avatar**: `BAR_TOUCH_PX` 2 → 6 y
   apilamiento del segmento (barra `zIndex: 1`, avatar `position: relative;
   zIndex: 2` → el avatar pinta por encima).
3. Escena/pantallas: slider relabelado "Separación entre gridlines (px)" y
   hints del panel actualizados; comentarios de interfaz y `animation-config.ts`
   reescritos.

Nota de diseño: el modo uniforme pierde la proporción temporal/valor del eje
(los puntos quedan igualmente espaciados); la acumulación y los saltos se
mantienen. Gate `npx tsc --noEmit` clean.

## Feedback round (2026-09-10) — barras 12px, entrada por separación, gridlines configurables, Top N + reordenamiento
User requirement: "Mueve más las barras a la izquierda. Asegúrate que la entrada
del primer grid sea según la separación (hoy la primera fecha demora mucho en
entrar). Asegúrate que los gridline tengan control de color y grosor.
Reincorpora 2 features que antes existían pero hardcodeados: [1] control para
truncar el ranking según top n o libertad para mostrar; [2] control (on/off)
para permitir cambio de puesto de las filas según temporalidad."

1. **Barras 12px a la izquierda**: `BAR_TOUCH_PX` 6 → 12 (sigue con `zIndex`
   barra 1 / avatar 2, la barra queda por detrás del avatar).
2. **Entrada del primer grid según la separación**: el eje antes arrancaba a
   `-0.5·ribbon`; ahora el tramo vacío antes del primer grid es parámetro:
   - `leadPx = uniformAxis && nPos > 1 ? gridSpacingPx : BAR_MAX_W/2`
     (uniforme → EXACTAMENTE un hueco de separación; proporcional → 0.5 plot).
   - `leadFrac = leadPx/ribbonLen`, `tapeSpan = (ribbonLen + leadPx)/ribbonLen`.
   - `nowWorld = -leadPx + guideT·(ribbonLen + leadPx)`;
     `nowFracAt(f) = clamp(guideTAt(f)·tapeSpan − leadFrac, 0, 1)`;
     `axisReachFrame(frac)`: `guideT = (frac + leadFrac)/tapeSpan` (Newton).
   - Verificación: modo proporcional → `tapeSpan 1.5, leadFrac 0.5` = fórmula
     histórica idéntica. Uniforme → el primer grid cruza el eje tras un solo
     `gridSpacing` (misma cadencia que los demás). Acumulación/barras sin
     cambios (siguen por fracciones).
3. **Gridlines configurables**: `gridlineColor` (≈#334155), `gridlineWidth`
   (px, ≈1), `gridlineOpacity` (0–1, ≈0.35) en `RaceScrollingConfig` +
   passthrough `presentationOf` + renderer (backgroundColor/width/opacity) +
   panel (ColorPicker + "Grosor 1–8" + "Opacidad %" en la sección Gridline).
4. **Top N vs libertad**: el campo "Máximo de entidades" pasa a `SwitchControl
   "Limitar a Top N"` (OFF → `maxRows: undefined` = todas corren; ON → número
   N, default 10). "Selección de entidades" (final-value/manual) y extremo
   (top/bottom) sin cambios; la lógica de `viz-to-remotion` intacta.
5. **Reordenar filas según temporalidad (on/off)**: `reorderByValue?: boolean`
   (default false) en config/panel/renderer. En `buildSnap`,
   `full = reorderByValue ? [...list].sort(b.current − a.current, empate por
   orden alfabético estático) : list;` — el mecanismo SWAP/evalChange/rankNow
   ya anima los intercambios (usa `nowFracAt`, la fracción temporal en el eje).
   La paleta de colores se mantiene anclada a `staticOrder`.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`,
`src/lib/animation-config.ts`, `src/lib/viz-to-remotion.ts`, this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round (2026-09-10) — entrada inicial de avatares + máximo de filas en pantalla
User requirement: "Que los avatar tengan entrada iniciales (configurables desde
arriba, desde la izquierda, desde abajo). Tiene que existir un control adicional
a Limitar a Top N, que tiene que ver con las filas que permite el plot."
User answers (question): on-screen cap = "Máximo de filas en pantalla" (número
fijo, independiente del Top-N por valor); entrance at tape-start (staggered);
scope = Race Scrolling only.

1. **Entrada inicial de avatares** (`avatarEntry?: 'none'|'top'|'left'|'bottom'`,
   default 'top'): al iniciar la cinta los avatares se deslizan y aparecen
   escalonados por fila (spring ~30f, delay = min(rankNow, 12)*2). Dirección:
   'top' cae desde arriba (−1.2·AVATAR_W en Y), 'left' entra desde la columna de
   nombres (−1.4·AVATAR_W en X), 'bottom' sube desde abajo (+1.2·AVATAR_W).
   Wrapper solo sobre el avatar (transform + opacity), sin tocar la fila → sin
   conflicto con SWAP/boundary. Control en el panel Race Scrolling: Collapsible
   "Entrada de avatares" (SelectControl: caen / desde los nombres / suben / sin
   entrada).
2. **Máximo de filas en pantalla** (`maxVisibleRows?: number`, 0 = sin límite):
   cuántas filas muestra el plot A LA VEZ, independiente de `maxRows` (Top N =
   qué entidades corren por valor final). En `buildSnap` el `window` (on-screen)
   pasa a ser las primeras `cap = min(maxVisibleRows, all.length)` filas del
   orden (`all`); el resto queda fuera de pantalla y entra/sale con la maquinaria
   boundary existente. `rowCount` (geometría ROW_H/rowsHeight/`belowLane`) deriva
   de `cap`, así el plot SIEMPRE cabe y no hay jitter. `renderPool` poda también
   cuando SOLO hay `maxVisibleRows` (antes solo podaba con Top N). Con
   "Reordenar filas según valor" las que ocupan pantalla son las mejores en cada
   momento (intercambios animados).
3. Panel: `SliderNumberInput "Máximo de filas en pantalla"` (0-50, 0 = sin tope)
   en Ranking, entre el toggle Top N y "Reordenar filas según valor".

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`,
`src/lib/animation-config.ts`, `src/lib/viz-to-remotion.ts`, this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round (2026-09-10) — entrada de avatares bajo el radio + tipo "primer dato"
User requirement: "El control de entrada de avatares debería incluirse como un
control más dentro de la sección de avatares (bajo el radio); incorporar un tipo
de entrada que entre cuando su dato se visualice por primera vez."

1. **Control dentro de la sección Avatar**: la compartida `AvatarSection` recibe
   un slot `extra?: React.ReactNode` renderizado justo bajo el radio de esquina
   (antes de "Fondo del avatar"). Solo Race Scrolling lo puebla (alcance sigue
   siendo solo RS; Timeline Race / Ranking no ven el control). Se elimina el
   `Collapsible "Entrada de avatares"` de la ronda anterior.
2. **Nuevo timing "Cuando aparece su primer dato"** (`avatarEntryTiming?:
   'start' | 'first-data'`, default 'start'): en `avatarEntranceStyle` el delay
   del spring pasa a ser `max(0, floor((firstX/1.001)*sweepFrames))` — el MISMO
   disparador que el pop de la barra — para que el avatar entre exactamente
   cuando su primer dato cruza el eje. 'start' conserva la ola escalonada por
   fila al iniciar la cinta. Dirección (top/left/bottom) y transform sin cambios.
3. Panel: dos Select bajo el radio — "Entrada inicial" (dirección) y "Cuándo"
   (visible salvo "Sin entrada") + hint contextual. Config/passthrough añaden
   `avatarEntryTiming`.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`,
`src/lib/animation-config.ts`, `src/lib/viz-to-remotion.ts`, this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round (2026-09-10) — gridlines punteadas, eje Y pegado al avatar, ejes hasta el fondo
User requirement: ejes de cada fecha punteados; el eje Y permanente pegado al
costado de los avatares; los ejes (Y/gridlines) hasta el extremo inferior del canvas.

1. **Gridlines punteadas** (`gridlineStyle?: 'solid'|'dashed'|'dotted'`, default
   'dotted'): se dibujan con `borderLeft` (width 0, centrada en tick.x) en vez de
   `backgroundColor`; color/grosor/opacidad intactos. Select "Estilo de gridlines"
   en "Apariencia de las gridlines" (Punteado / Guiones / Línea continua).
2. **Eje Y pegado a los avatares**: nueva const `axisX = PAD_L + NAME_W + AVATAR_W`
   (= BAR_TRACK_X − ROW_GAP_PX). `axisX` reemplaza a BAR_TRACK_X en la caja de
   marcadores, en el contenedor del eje y en la caja del plot → el eje queda a la
   derecha del avatar y las gridlines se ocultan exactamente ahí.
3. **Ejes hasta el extremo inferior del canvas**: la caja del plot pasa a
   `bottom: 0` (plano `bottom: 0`), el contenedor de gridlines a
   `top: DATE_BAND_H + bottom: 0`, y el eje permanente a `top: rowsTopY + bottom: 0`;
   las líneas punteadas de fecha y el eje Y recorren hasta el borde inferior del
   área composable (bajo la fila de barras).

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`,
`src/lib/animation-config.ts`, `src/lib/viz-to-remotion.ts`, this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round (2026-09-10) — dots estirados, cajón de fechas, imagen de referencia y apilado
User requirements:
1. Los dots de la línea punteada más estirados (líneas punteadas alargadas).
2. Cada fecha con su propio "cajón" para que la línea no se solape con la etiqueta.
3. En el marcador "imagen de referencia", poder cargar un CAMPO del modelo (url).
4. En ícono y en imagen de referencia, apilar HORIZONTALMENTE la cantidad (delta) que
   representan (confirmado: el delta de esa fecha; tope 6 con chip "+N").

1. **Dots estirados**: `'dotted'` (default) ya no usa `borderLeft`; se dibuja con
   `repeating-linear-gradient(to bottom, color 0 7px, transparent 7px 12px)` y
   `width = gridlineWidth` (centrada), dando tramos alargados (~7px) con hueco de 5px,
   independiente del grosor. 'dashed'/'solid' siguen con `borderLeft`.
2. **Cajón de fechas**: cada etiqueta va en una placa redondeada oscura
   (`rgba(2,6,23,0.88)`, borde sutil) que sobresale 6px por debajo de la banda de
   etiquetas; el contenedor de etiquetas pasa a `zIndex: 2` para tapar el arranque de
   la gridline y que nunca se sobreponga al texto.
3. **Imagen de referencia por campo**: nueva `markerImageField?: string` en
   `RaceScrollingConfig`; `FieldSelect "Imagen de referencia (campo url)"` en
   "Marcadores del eje" (visible en modo imagen). `convertRaceScrolling` resuelve por
   fila `markerImage = avatarUrlOf(row[markerImageField])`, lo pliega por entidad en
   cada `step`; `RaceScrollingItem` gana `markerImage?: string | null`; en el renderer
   el modo imagen usa `ent.markerImage ?? ent.image`.
4. **Apilado por delta**: `markerOnGrid` (ícono e imagen) dibuja una fila horizontal
   centrada en la gridline a la altura de la fila, con `n = clamp(round(|delta|), 1, 6)`
   glifos (gap proporcional al tamaño) y un chip "+N" al final si `|delta| > 6`
   (`MARKER_STACK_MAX = 6`). delta=1 conserva la marca única; modo número intacto.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`,
`src/lib/animation-config.ts`, `src/lib/viz-to-remotion.ts`, this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round (2026-09-10) — sonido al aumentar la barra + scroll constante con pausa final
User requirements:
1. Poder cargar un sonido que suene cada vez que la barra aumenta.
2. Que al final el scroll NO disminuya velocidad; en su lugar dejar unos segundos
   adicionales congelados para visualizar el resultado final.
Confirmed: tick UNA vez por fecha (cada cruce de grid con crecimiento), UN sonido
global (upload en el panel), pausa final exponible en el panel (default 2s).

1. **Sonido por fecha**: `barSoundSrc?: string` en `RaceScrollingConfig` (url/datáURI)
   + passthrough en `presentationOf`. Nuevo control `AudioUploadInput`
   (`src/components/ui/controls/audio-upload-input.tsx`, accept="audio/*", FileReader→
   dataURL, preview <audio controls> + "Quitar sonido", exportado en el index de
   controles) al final del Collapsible "Marcadores del eje". El renderer monta un
   `<Sequence from={cruceFrame}><Audio src={barSoundSrc}/></Sequence>` por cada `pos`
   en `markersByPos` (mismo criterio delta≠0 que los marcadores), con
   `frame = axisReachFrame(fracFor(pos))`. Solo si `barSoundSrc` está cargado.
2. **Scroll a velocidad constante**: `guideTAt`/`guideT` pasan de `smoothstep` a
   interpolación LINEAL (la cinta nunca frena al final); `invSmooth` pasa a identidad
   (los cruces de fecha mantienen cadencia proporcional exacta).
3. **Pausa final exponible**: nuevo `SliderNumberInput "Pausa final (s)"` en Ranking
   (ligado a `holdFinalSeconds`, default 2, 0-10, paso 0.5); `holdFinalFrames` ya
   congelaba la cinta tras `raceEndFrame`.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`,
`src/components/ui/controls/audio-upload-input.tsx` (nuevo) e `index.ts`,
`src/lib/animation-config.ts`, `src/lib/viz-to-remotion.ts`, this plan. Gate
`npx tsc --noEmit` clean.

## Feedback round 2 (2026-09-10) — sin duración fija, pausa regula velocidad, dots largos, overrun final
User requirements:
1. Quitar el control "Duración de la carrera (s)" (redundante).
2. Que "Pausa final (s)" regule la velocidad de scrolling según la duración de la pausa.
3. Dots de gridline más largos y con más espaciado entre sí.
4. Que al final el scroll pase un poco más allá de la última fecha (no quede clavado en el eje).

1. **Sin duración fija**: el `SliderNumberInput "Duración de la carrera (s)"` del panel
   Race Scrolling se elimina; el renderer deja de leer `raceDurationSeconds` (siempre modo
   auto). El campo de props/config y el passthrough se conservan por retrocompatibilidad
   (Timeline Race lo sigue usando).
2. **Pausa → velocidad**: con el modo auto, `sweepFrames = max(sweepBudget − holdFinalFrames, 1)`;
   a mayor pausa final la cinta recorre el mismo tramo en menos frames (más rápido). Texto de
   ayuda actualizado.
3. **Dots largos**: `repeating-linear-gradient` pasa de tramo 7px/sep 5px a **14px/10px**.
4. **Overrun final**: `overrunPx = max(24, round(BAR_MAX_W*0.12))`, `sweepEndT = 1 + overrunPx/(ribbonLen+leadPx)`.
   `guideTAt` interpola lineal hasta `sweepEndT`; `axisReachFrame` divide por `sweepEndT`
   (`invSmooth = clamp(g/sweepEndT)`) para conservar la cadencia exacta de cruces y pops de
   barra. Al terminar, la última grid queda ~40px a la izquierda del eje y ahí se congela la
   pausa final.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`, this plan. Gate `npx tsc --noEmit` clean.

## Feedback round 3 (2026-09-10) — entrada de avatares escalonada (cascada dramática)
User: la animación de entrada de los avatares debe ser UNA ENTRADA ESCALONADA.
Confirmed: cubre TODAS las filas (sin tope), separación dramática (8 frames/fila),
orden líder primero.

- `avatarEntranceStyle` ('start' timing): `start = introOrder * AVATAR_ENTRY_STAGGER(8)`
  reemplaza al viejo `min(rank, 12)*2` (que capaba en 12 filas y separaba ~50ms/fila).
- Nuevo `introOrder` capturado una vez desde `rankAtFrame(0).listIndex` para anclar el
  orden al inicio y evitar que los swaps de ranking en vivo reordenen la cascada.
- Rama 'first-data' y dirección top/left/bottom/none intactas. Comentario de cabecera
  actualizado. Sin cambios de panel (la opción ya describía "escalonada por fila").

Changed: `src/remotion/templates/race-scrolling/index.tsx`, this plan.
Gate `npx tsc --noEmit` clean. Nota: con muchas filas la cascada solapa el arranque.

## Feedback round 4 (2026-09-10) — animación de cierre en la pausa final
User: como pausa final añadir una animación: fade out del eje Y permanente, traslado
de los avatares hacia el centro del plot, encogido de las barras (escalonado de mayor a
menor) y entrada de las etiquetas de las entidades por la izquierda.
Confirmed: avatares van al CENTRO del plot (para que quepan las etiquetas); la entrada de
etiquetas SOLO aplica con "Mostrar etiqueta de la entidad" apagada; nuevo switch en el
panel (default ON); ritmo PROPORCIONAL a la pausa final.

- Config `finaleAnimation?: boolean` + passthrough + prop del renderer (default true).
- `finaleActive = finaleAnimation && !(showLabels ?? true) && (durationInFrames - OUTRO) > raceEndFrame`.
  Con etiquetas visibles (default) o switch apagado → pausa congelada como hasta ahora.
- Línea de tiempo normalizada `ft` sobre la ventana real de la pausa
  (`finaleWin = durationInFrames - OUTRO - raceEndFrame`):
  - eje Y: opacity 1→0 en ft 0.00→0.18
  - avatares: translateX→`avatarDx ≈ (AVATAR_W + BAR_MAX_W)/2` (centro del plot, clamp a innerW) en ft 0.08→0.40
  - barras: `width·(1 − shrink)` con rampa ease-out; cada fila por ranking FINAL
    (`rankAtFrame(raceEndFrame)`) arranca en `0.30 + 0.55·i/count`, dura 0.35
  - etiquetas: overlay absoluto en la columna izquierda (`NAME_W_FULL`, width real de
    columna aunque `NAME_W`=0 con labels ocultas), `translateX(−0.8·NAME_W_FULL→0)` +
    opacity 0→1, escalonadas igual que las barras (ft 0.40 + 0.55·i/count)
- Durante la secuencia: `winnerScale`→1 y `dim`→1 (filas sin atenuar) para leer limpio;
  el valor numérico de la barra se hunde con ella; el eje ya no atenúa.
- Panel: switch "Animación de cierre" junto a "Pausa final (s)" + texto de ayuda.

Changed: `src/remotion/templates/race-scrolling/index.tsx`,
`src/components/builder/animation-config-panel.tsx`, `src/lib/animation-config.ts`,
`src/lib/viz-to-remotion.ts`, this plan. Gate `npx tsc --noEmit` clean.

## Feedback round 4b (2026-09-10) — barra se encoge en armonía con el avatar
User: cuando el avatar se mueve, la barra se encoge en la MISMA proporción que el
movimiento del avatar y se queda de ese tamaño hasta el final.

- El encogido de la barra deja de ser cascada independiente: `width = w·(1 − finaleAvatarT)`,
  idéntico y sincronizado con el `translateX` del avatar (mismo eased t), así la barra se
  retrae a la vez que el avatar viaja al centro y queda a ese tamaño (0) hasta el final.
- El valor numérico de la barra se hunde con el mismo factor. La entrada de las etiquetas
  por la izquierda sigue escalonada por ranking final.
- `finaleStateFor` ya solo devuelve `labelT` (se elimina `barShrink` de la cascada).

Changed: `src/remotion/templates/race-scrolling/index.tsx`, this plan.
Gate `npx tsc --noEmit` clean.

## Feedback round 4c (2026-09-10) — el encogido retrae a la DERECHA, el dato queda visible
User: la barra debe encogerse A LA DERECHA para que el dato se mantenga visible.

- `raceW = rawW·pop` (largo exacto que tenía la barra al terminar la carrera). En la
  secuencia, la barra mantiene fijo su borde DERECHO en `raceW` y solo su borde
  IZQUIERDO se mueve hacia la derecha (`left = raceW − w`, width = `raceW·(1−t)`), en
  lockstep con el avatar: la barra "se retrae a la derecha" mientras el dato continúa.
- El valor numérico se ancla a la posición final (`right: BAR_MAX_W − raceW + 12`) y ya
  NO se desvanece (opacity `pop` fija): permanece visible en el mismo punto mientras la
  barra se acorta. Sin salto en la transición (en t=0 `left=0`, width=`raceW`).

Changed: `src/remotion/templates/race-scrolling/index.tsx`, this plan.
Gate `npx tsc --noEmit` clean.

## Feedback round 4d (2026-09-10) — la barra se encoge hasta el inicio del avatar
User: deben encogerse hasta el inicio del avatar (manteniendo la distancia solapada).

- La barra ya no ancla su borde derecho: su borde IZQUIERDO viaja con el avatar
  (`barLeft = t·avatarDx`), manteniendo SIEMPRE el solape de 12 px bajo el borde
  derecho del avatar, y se encoge en la misma proporción que el trayecto (`width = raceW·(1−t)`).
- El extremo derecho (con el dato) se retrae hacia el inicio del avatar llevando el
  valor consigo (visible mientras se acorta) hasta colapsarla por completo al llegar.
- `valueRight`/`valueMaxW` pasan a una única fórmula (el label cabalga el extremo).

Changed: `src/remotion/templates/race-scrolling/index.tsx`, this plan.
Gate `npx tsc --noEmit` clean.
