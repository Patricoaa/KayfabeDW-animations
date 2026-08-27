# Plan: Editorial/Amber Visual Rebuild of /builder

**Goal**: Rebuild `/builder` to be production-grade — eliminate amateur visuals, visual gaps,
inconsistent user journey, and poor intuitiveness — by adopting the parent KayfabeDW
Editorial/amber system and restructuring the layout so the data canvas gets real space.

**Status**: Implemented (committed + pushed).

---

## Decisions locked (via user confirmation)

- **Adopt parent Editorial/amber design system** (Space Grotesk / DM Sans / JetBrains Mono,
  amber `#fbbf24`, zero shadows via layered backgrounds, `@custom-variant dark`).
- **Full layout + journey rebuild**: canvas becomes the hero; right config panel holds
  output mode + chart template config + duration; central area toggles data canvas ↔ live result.
- **Canvas-first with guided onboarding** (empty-state onboarding card).

## Work

- **Foundation**: rewrote `styles/global.css` with parent tokens + `@theme inline` (amber scale,
  fonts, `--text-micro`); rewrote `layout.tsx` loading the three Google fonts with `dark` class.
- **Builder page**: canvas-first layout, honest 3-step stepper (Datos/Configurar/Exportar) with
  derived `stepDone`/`stepActive`, `view: 'data' | 'result'` + `resultStep`, right config panel
  (always config), mobile bottom sheet + bottom nav.
- **Canvas**: tokenized `query-canvas.tsx`, `table-node.tsx`, `table-sidebar.tsx`,
  `properties-panel.tsx`, `join-edge.tsx`; amber accents, designed empty-state onboarding.
- **Builder panels**: tokenized + Lucide in `template-picker.tsx`, `chart-config-panel.tsx`
  (real `<input type="checkbox" role="switch">` toggles), `builder-nav.tsx`,
  `animation-preview.tsx`, `data-options-form.tsx`.
- **Gallery**: tokenized headers/filters/cards/empty states; amber accents; Lucide.
- **Shared**: tokenized chart empty states + `table-view.tsx` + `toast.tsx` (+ X icon).
- **A11y/icons**: replaced all emoji with Lucide; amber focus rings.
- **Docs**: rewrote `DESIGN.md` to mirror parent system; removed dead `data-panel.tsx`.

## Scope guard honored

- No backend/API/Remotion-template changes.
- All gallery features (search/filter/sort/group/duplicate/delete) preserved.

## Verification

- `npx tsc --noEmit` passes.
- `npm run build` passes (only pre-existing Chrome-path tracing warning).
- Journey manually verified: empty state → drop table → full-space canvas → select columns →
  run → config panel → static SVG/PNG export and animated MP4, in light + dark.
