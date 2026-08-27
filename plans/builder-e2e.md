# E2E: Polished, Highly-Customizable Visualization Builder

**Goal**: Turn `/builder` into a fully cohesive, polished builder for loading, modeling,
and previewing static + animated charts from the Kayfabe DW database, with rich data
interrelation and deep per-visualization customization.

**Status**: Implemented (committed + pushed).

---

## Target flow

```
① DATOS  → pick tables → model relations (auto-suggested joins) → shape query (aggregates)
② PREVIEW → static OR animated → auto-map + polish fields → live preview
③ EXPORT  → static: SVG/PNG · animated: Remotion → MP4
   PERSIST → auto-save drafts + versions + thumbnails + folder grouping
```

## Decisions locked

- **Q1.A** — Generic animated chart templates so any query animates.
- **Q2.A** — Static SVG/PNG export.
- **Q3.A** (enhanced UI/UX) — Keep Datos/Preview tabs + guided-step flow + polish.
- **Q4.B** — Build folder grouping in the gallery.

## Initial current state (pre-change)

- Data modeling: ReactFlow canvas → `query_builder(spec)` RPC (supports
  select/aggregates/joins/filters/group/order/limit, safe identifier quoting).
  `schema-metadata.ts` has FK + suggested-join helpers.
- Static charts: 6 SVG charts fed raw rows; thin config (no aggregation/sort/format/
  axis labels/legend/grouped-stacked/export); "Sin datos numéricos" dead-end on open.
- Animated: Remotion + 6 hardcoded templates with per-template SQL; can't animate
  arbitrary queries.
- Persistence: `viz_spec` has `version`, `auto_saved_at`, `thumbnail_url`, `folder_id`
  columns but folders/versions weren't surfaced in UI.

## Implementation phases

- **A — Modeling cohesion**: suggested-relation chips (auto-wire joins), joined-data
  preview, per-column aggregate dropdowns, clearer SQL error surfacing.
- **B — Static customization**: richer `ChartConfig`, new `lib/chart-data.ts`
  (aggregate/sort/format/limit), axis/label/legend/grouped-stacked controls, auto-map
  first numeric column, SVG/PNG export + thumbnail.
- **C — Animated customization**: schema-agnostic generic templates (Generic Bar/Line/KPI)
  consuming pre-prepared series; canonical props contract.
- **D — Persistence**: debounced autosave drafts, version bump, thumbnails, folders.
- **E — UI/UX polish**: guided flow nudge, consistent states, visual polish per DESIGN.md.

## Verification

- `npm run build` + `npx tsc --noEmit`.
- Manual journey on `:3001` covering every phase.
