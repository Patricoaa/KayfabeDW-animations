# UI/UX Audit — KayfabeDW Animations

**Date**: 2026-08-27
**Last updated**: 2026-08-27 (post-Round 5)
**Score**: ~8/10 usability, 2/10 accessibility, 7.5/10 visual consistency

---

## Executive Summary

The app has been **unified into a single flow** at `/builder`. The old landing page (`/`) now redirects. The Builder supports both template-driven and custom-query workflows. Dead code and broken dependencies have been cleaned up. The React Flow canvas is powerful but the overall UX still suffers from missing feedback, no onboarding, and accessibility gaps.

---

## Progress Tracker

| Category | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical (C) | 17 | 16 | 1 |
| Accessibility (A) | 6 | 0 | 6 |
| UX Flow (U) | 16 | 13 | 3 |
| Visual Design (V) | 7 | 1 | 6 |
| **Total** | **46** | **30** | **16** |

---

## Critical Issues (Severity: High)

### Flow Breakage
| # | Issue | Location | Status |
|---|---|---|---|
| **C1** | **GIF export is fake** — UI shows MP4/GIF toggle but API always renders MP4 | `animation-preview.tsx`, `render/route.ts:129` | ✅ **FIXED** — GIF option removed, export only shows MP4 |
| **C2** | **Gallery delete silently ignores errors** — card removed locally but may persist on server | `gallery/page.tsx:43-47` | ✅ **FIXED** — checks response status, shows error toast on failure, only removes on success |
| **C3** | **Clear canvas has no confirmation** — "Limpiar" button wipes all work instantly | `query-canvas.tsx:399-404` | ✅ **FIXED** — `confirm()` dialog with "no se puede deshacer" warning |
| **C4** | **No unsaved changes warning** — navigating away from builder loses all work | `builder/page.tsx` | ✅ **FIXED** — `beforeunload` event warns when navigating with unsaved changes |
| **C5** | **BuilderNav "Animations" link navigates away** from builder with no warning | `builder-nav.tsx:24` | ✅ **FIXED** — removed dead `/` link, nav now only shows Builder + Galería |

### Missing Feedback
| # | Issue | Location | Status |
|---|---|---|---|
| **C6** | **No toast/notification system** — success/failure feedback is only inline or console.error | All files | ✅ **FIXED** — ToastProvider + useToast hook, toasts on save, template load, gallery delete/duplicate |
| **C7** | **Render errors are console.error only** — user sees nothing when export fails | `animation-preview.tsx:45` | ✅ **FIXED** — errors now shown inline in export bar with "Reintentar" button |
| **C8** | **No render progress** — export shows spinning icon with no indication of progress | `animation-preview.tsx:104-116` | ✅ **FIXED** — progress bar with phase labels (Bundling → Chrome → Composition → Rendering → Uploading) |
| **C9** | **Silent template fetch failure** — empty list shown with no error message | `app/page.tsx:73` | ✅ **FIXED** — old landing page removed, redirect to `/builder` |

### Technical Debt
| # | Issue | Location | Status |
|---|---|---|---|
| **C10** | **Blob URL memory leak** — `URL.createObjectURL()` never revoked | `animation-preview.tsx:42` | ✅ **FIXED** — new AnimationPreview uses Vercel Blob URLs directly, dead `animation-panel.tsx` removed |
| **C11** | **Hardcoded animation duration** — 150 frames (5s), no user control | `animation-preview.tsx` | ✅ **FIXED** — duration slider (1-20s) added to animation preview export bar |
| **C12** | **`require()` for template loading** — not code-split, SSR-unsafe | `animation-preview.tsx:132-148` | ✅ **FIXED** — replaced with `React.lazy` dynamic imports, code-split per template |
| **C13** | **Global mutable `nodeIdCounter`** — breaks React Strict Mode / SSR | `query-canvas.tsx` | ✅ **FIXED** — replaced with `useRef` inside component |

### New Issues (discovered during P16)
| # | Issue | Location | Severity | Status |
|---|---|---|---|---|
| **C14** | **Dead code: `animation-panel.tsx`** — not imported anywhere, has broken render payload | `components/builder/animation-panel.tsx` | Medium | ✅ **FIXED** — file deleted |
| **C15** | **Dead code: `filter-bar.tsx`** — not imported anywhere | `components/builder/filter-bar.tsx` | Low | ✅ **FIXED** — file deleted |
| **C16** | **Template props not persisted** — `templateProps` state is lost on save/reload; only `query_spec` and `chart_config` are saved to `viz_spec` | `builder/page.tsx` | ✅ **FIXED** — `animation_config` now stores `templateId`, `templateOptions`, `duration`; restored on load |
| **C17** | **`?template=` param not re-applied** — if user switches away from animated mode and back, the template param effect doesn't re-fire | `builder/page.tsx:97-103` | ✅ **FIXED** — effect re-applies URL template param when switching back to animated mode |

---

## Accessibility Issues (Severity: Medium-High)

| # | Issue | Scope | Status |
|---|---|---|---|
| **A1** | **Zero ARIA labels** on any interactive element | Entire app | ❌ Open |
| **A2** | **Custom toggle switch** uses div+onClick instead of checkbox+label | `chart-config-panel.tsx:118-142` | ❌ Open |
| **A3** | **No keyboard navigation** for drag-and-drop canvas interactions | `table-sidebar.tsx`, `query-canvas.tsx` | ❌ Open |
| **A4** | **No focus management** — no focus rings, no skip-to-content link | Entire app | ❌ Open |
| **A5** | **Missing form labels** — inputs rely on visual proximity, no `<label>` elements | Builder panels | ❌ Open |
| **A6** | **No `role` attributes** on custom interactive elements | Entire app | ❌ Open |

---

## UX Flow Issues (Severity: Medium)

### Navigation & Information Architecture
| # | Issue | Impact | Status |
|---|---|---|---|
| **U1** | **Two disconnected flows** — Template Editor vs Visual Builder with no bridge | Users can't move between workflows | ✅ **FIXED** — Flows merged into single `/builder` page with `?template=` param support |
| **U2** | **No deep linking to query states** — can't share a specific query config via URL | Collaboration blocked | ⚠️ Partially — `?edit=` and `?template=` work, but query state not serialized to URL |
| **U3** | **Gallery has no sorting/filtering** — cards always by date descending | Hard to find saved work | ✅ **FIXED** — search by name/table, filter by chart type, sort by date/name |
| **U4** | **No gallery thumbnails** — cards only show text metadata | Can't visually identify viz | ✅ **FIXED** — color-coded header bar per chart type (bar=indigo, line=blue, etc.) |
| **U5** | **No duplicate/copy** functionality in gallery | Can't iterate on existing work | ✅ **FIXED** — "⧉" button duplicates with "(copia)" suffix, opens in edit mode |

### Guidance & Onboarding
| # | Issue | Impact | Status |
|---|---|---|---|
| **U6** | **No onboarding flow** — first-time users get empty canvas with no context | Steep learning curve | ❌ Open |
| **U7** | **No tooltips** — JOIN types, chart types, template scores unexplained | Confusion | ⚠️ Partially — template picker now shows descriptions and explains score; JOIN/chart tooltips still missing |
| **U8** | **No help text** — what columns to select for each template is unclear | Trial and error | ❌ Open |
| **U9** | **Template picker score is unexplained** — "75" means nothing to users | Confusion | ✅ **FIXED** — score explanation text added: "Score = qué tan bien coinciden tus datos con el template" |

### Canvas Interactions
| # | Issue | Impact | Status |
|---|---|---|---|
| **U10** | **No undo/redo** — accidental canvas changes are permanent | Frustration | ✅ **FIXED** — undo/redo with history stack, keyboard shortcuts (Ctrl+Z/Ctrl+Shift+Z), buttons in sidebar |
| **U11** | **Auto-executes query on every change** — complex queries feel slow | Perceived lag | ✅ **FIXED** — debounce increased to 800ms, manual "▶ Ejecutar" button shown when pending |
| **U12** | **No query result count limit warning** — expensive queries have no guard | Performance risk | ❌ Open |
| **U13** | **Save validation too lenient** — saves even with empty column selection | Empty viz_specs | ✅ **FIXED** — validates `spec.select` before save, shows toast error if empty |

### Export & Preview
| # | Issue | Impact | Status |
|---|---|---|---|
| **U14** | **No render timeout/cancellation** — can take 120s with no escape | User stuck | ✅ **FIXED** — AbortController cancel button during rendering |
| **U15** | **Animation preview has no loading state** — blank area while Remotion loads | Confusion | ✅ **FIXED** — "Cargando preview..." shown before mount, "Cargando template..." in Suspense fallback |
| **U16** | **Duration not configurable** in animation preview | Limited control | ✅ **FIXED** — duration slider (1-20s) in animation preview export bar |

---

## Visual Design Issues (Severity: Low-Medium)

| # | Issue | Detail | Status |
|---|---|---|---|
| **V1** | **No design tokens file** — all constants in Tailwind classes + inline styles | Hard to maintain consistency | ❌ Open |
| **V2** | **No icon library** — emoji characters as icons (📊⚔️🔥📅🗺️) | Inconsistent rendering, no accessibility | ❌ Open |
| **V3** | **`clsx` and `tailwind-merge` unused** — dead dependencies | Dead code | ✅ **FIXED** — removed from package.json |
| **V4** | **Dark-only mode** — no light theme, no system preference detection | Accessibility | ❌ Open |
| **V5** | **Builder not responsive** — fixed w-80/w-64 sidebars, desktop-only | Mobile unusable | ❌ Open |
| **V6** | **Inconsistent button styles** — some rounded, some rounded-lg, varying padding | Visual noise | ❌ Open |
| **V7** | **Chart colors are rainbow** — not colorblind-friendly | Accessibility | ❌ Open |

---

## Improvement Proposals

### Tier 1: Quick Wins (1-2 days each)
- ~~P1: Confirm clear canvas~~ → ✅ Done (C3)
- ~~P2: Fix/remove fake GIF option~~ → ✅ Done (C1)
- P3: Toast notification system → **C6** (open)
- ~~P4: Fix blob URL memory leak~~ → ✅ Done (C10)
- ~~P5: Unsaved changes warning~~ → ✅ Done (C4)
- ~~P6: Render error display~~ → ✅ Done (C7)
- ~~P7: Remove dead dependencies~~ → ✅ Done (V3)

### Tier 2: UX Improvements (2-5 days each)
- P8: Create DESIGN.md → **V1** (open)
- P9: Add ARIA labels and roles → **A1-A6** (open)
- P10: Add keyboard navigation → **A3** (open)
- P11: Add undo/redo to canvas → **U10** (open)
- P12: Add template picker tooltips → ✅ Partially done (U7, U9 — descriptions + score explanation added; JOIN/chart tooltips still missing)
- ~~P13: Add gallery thumbnails~~ → ✅ Done (U4 — color-coded header bars)
- ~~P14: Add gallery sorting/filtering~~ → ✅ Done (U3 — search, type filter, sort)
- ~~P15: Add duplicate/copy in gallery~~ → ✅ Done (U5)

### Tier 3: Architecture Improvements (1-2 weeks each)
- ~~**P16: Merge/bridge flows**~~ → ✅ Done (U1)
- P17: Onboarding flow → **U6** (open)
- P18: Render progress via SSE → Partially done (C8 fixed with polling, not SSE)
- P19: Make builder responsive → **V5** (open)

### Tier 4: Polish
- P20: Replace emoji with icon library (Lucide/Phosphor) → **V2** (open)
- P21: Colorblind-friendly chart palette → **V7** (open)
- P22: Light/dark mode toggle → **V4** (open)
- P23: Extract shared design tokens → **V1** (open)

### New Proposals (from P16)
- ~~**P24**: Remove dead code (`animation-panel.tsx`, `filter-bar.tsx`)~~ → ✅ Done (C14, C15)
- ~~**P25**: Persist template props in viz_spec (or re-fetch on load)~~ → ✅ Done (C16)
- **P26**: Add cancel button during render → ✅ Done (U14)

---

## Round 4 Summary (post-Round 4)

**5 issues fixed** (C6, C12, U11, U13, U14):

| Issue | Fix |
|-------|-----|
| **C6** | Toast system: `ToastProvider` + `useToast` hook in `src/components/ui/toast.tsx` |
| **C12** | Template loading: `React.lazy` dynamic imports replace `require()` |
| **U11** | Query debounce: 800ms + manual "▶ Ejecutar" button |
| **U13** | Save validation: requires at least 1 column selected |
| **U14** | Render cancel: AbortController + cancel button during rendering |

**Progress**: 25/46 issues fixed (54%)

## Round 5 Summary (post-Round 5)

**5 issues fixed** (C5, C13, C17, U10, U15):

| Issue | Fix |
|-------|-----|
| **C5** | BuilderNav: removed dead `/` link, nav now only shows Builder + Galería |
| **C13** | `nodeIdCounter`: replaced global mutable with `useRef` inside component |
| **C17** | `?template=`: effect re-applies URL template param when switching back to animated mode |
| **U10** | Undo/redo: history stack + `useUndoRedo` hook, Ctrl+Z/Ctrl+Shift+Z, sidebar buttons |
| **U15** | Animation preview loading: "Cargando preview..." before mount + Suspense fallback |

**Progress**: 30/46 issues fixed (65%)

### Remaining Issues by Priority

| Priority | Issues | Est. Effort |
|----------|--------|-------------|
| **High** | (none remaining) | — |
| **Medium** | U16 (keyboard shortcuts for canvas actions) | 1-2 days |
| **Low** | A1-A6 (accessibility), V1-V7 (design tokens, icons, responsive) | 2+ weeks |
