# Race Scrolling Template — Plan

**Status:** Done
**App:** `/animations`

## Objective
Add a new animation template, `race-scrolling`, that builds on `timeline-race`
but with a *scrolling plane*: instead of a fixed guide sweeping over static
bars, the WHOLE plane (ranked bars + axis band) translates horizontally so the
current moment stays pinned under a fixed "now" line (camera following the
leader — "todo el plano scrollea"). Each entity's bar travels on the axis,
stuck by its TIP to its current step position, and its length is proportional
to the accumulated value. Per the approved plan, the axis supports **dates or
numbers with auto-detection**, and each active entity drops a **marker on the
scrolling axis band** at its current step showing the accumulated value as a
**number, an icon, or a reference image**.

Verified with the repo gate: `npx tsc --noEmit` (lint is broken repo-wide).

## Decisions (from the plan review)
1. **Visual model:** "Todo el plano scrollea" — rows + axis band translate as a
   block; the plane scrolls so that current playback always passes the fixed
   `anchorX` "now" line.
2. **Value in the axis:** "Marcador por entidad con modo configurable" —
   `markerMode: 'number' | 'icon' | 'image'`; icon glyphs come from
   `ICON_GLYPHS`, image markers reuse the entity's avatar URL (`imageField`)
   with a fallback to the number when no URL exists.
3. **Axis type:** dates + numbers with auto-detection — `dateField` is parsed
   to timestamps (bucketed per `dateFormat`); if no usable date column exists,
   `axisField` (or a heuristic time-ish fully-numeric column) drives the same
   scrolling race with `axisUnit: 'number'`. With neither, the template falls
   back to the parallel-bar compat mode.
4. **Bar anchor convention:** the bar TIP is pinned to the entity's *current
   step* (`curX * BAR_MAX_W`), not to the fixed "now" line, so the bar is at
   its data position on the axis and the value grows backward from it.

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