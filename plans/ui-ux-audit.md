# UI/UX Audit — KayfabeDW Animations

**Date**: 2026-08-27
**Score**: ~4.5/10 usability, 2/10 accessibility, 6/10 visual consistency

---

## Executive Summary

The app has **two disconnected flows**: a legacy template editor (`/`) and a new visual builder (`/builder`). The builder's React Flow canvas is powerful but the overall UX suffers from missing feedback, no onboarding, broken export options, and accessibility gaps. There is no design system file — all tokens are hardcoded in Tailwind classes.

---

## Critical Issues (Severity: High)

### Flow Breakage
| # | Issue | Location | Impact |
|---|---|---|---|
| **C1** | **GIF export is fake** — UI shows MP4/GIF toggle but API always renders MP4 (`codec: 'h264'`) | `animation-preview.tsx:83-101`, `render/route.ts:129` | Misleading — users think they can export GIF |
| **C2** | **Gallery delete silently ignores errors** — card removed locally but may persist on server | `gallery/page.tsx:43-47` | Data inconsistency |
| **C3** | **Clear canvas has no confirmation** — "Limpiar" button wipes all work instantly | `query-canvas.tsx:399-404` | Data loss |
| **C4** | **No unsaved changes warning** — navigating away from builder loses all work | `builder/page.tsx` | Data loss |
| **C5** | **BuilderNav "Animations" link navigates away** from builder with no warning | `builder-nav.tsx:24` | Confusing, data loss |

### Missing Feedback
| # | Issue | Location |
|---|---|---|
| **C6** | **No toast/notification system** — success/failure feedback is only inline or console.error | All files |
| **C7** | **Render errors are console.error only** — user sees nothing when export fails | `animation-preview.tsx:45`, `animation-panel.tsx:44` |
| **C8** | **No render progress** — export shows spinning icon with no indication of progress | `animation-preview.tsx:104-116` |
| **C9** | **Silent template fetch failure** — empty list shown with no error message | `app/page.tsx:73` |

### Technical Debt
| # | Issue | Location |
|---|---|---|
| **C10** | **Blob URL memory leak** — `URL.createObjectURL()` never revoked | `animation-preview.tsx:42`, `animation-panel.tsx:44` |
| **C11** | **Hardcoded animation duration** — 150 frames (5s), no user control | `animation-preview.tsx` |
| **C12** | **`require()` for template loading** — not code-split, SSR-unsafe | `animation-preview.tsx:132-148` |
| **C13** | **Global mutable `nodeIdCounter`** — breaks React Strict Mode / SSR | `query-canvas.tsx` |

---

## Accessibility Issues (Severity: Medium-High)

| # | Issue | Scope |
|---|---|---|
| **A1** | **Zero ARIA labels** on any interactive element | Entire app |
| **A2** | **Custom toggle switch** uses div+onClick instead of checkbox+label | `chart-config-panel.tsx:118-142` |
| **A3** | **No keyboard navigation** for drag-and-drop canvas interactions | `table-sidebar.tsx`, `query-canvas.tsx` |
| **A4** | **No focus management** — no focus rings, no skip-to-content link | Entire app |
| **A5** | **Missing form labels** — inputs rely on visual proximity, no `<label>` elements | Builder panels |
| **A6** | **No `role` attributes** on custom interactive elements | Entire app |

---

## UX Flow Issues (Severity: Medium)

### Navigation & Information Architecture
| # | Issue | Impact |
|---|---|---|
| **U1** | **Two disconnected flows** — Template Editor (`/`) vs Visual Builder (`/builder`) with no bridge | Users can't move between workflows |
| **U2** | **No deep linking to query states** — can't share a specific query config via URL | Collaboration blocked |
| **U3** | **Gallery has no sorting/filtering** — cards always by date descending | Hard to find saved work |
| **U4** | **No gallery thumbnails** — cards only show text metadata | Can't visually identify viz |
| **U5** | **No duplicate/copy** functionality in gallery | Can't iterate on existing work |

### Guidance & Onboarding
| # | Issue | Impact |
|---|---|---|
| **U6** | **No onboarding flow** — first-time users get empty canvas with no context | Steep learning curve |
| **U7** | **No tooltips** — JOIN types, chart types, template scores unexplained | Confusion |
| **U8** | **No help text** — what columns to select for each template is unclear | Trial and error |
| **U9** | **Template picker score is unexplained** — "75" means nothing to users | Confusion |

### Canvas Interactions
| # | Issue | Impact |
|---|---|---|
| **U10** | **No undo/redo** — accidental canvas changes are permanent | Frustration |
| **U11** | **Auto-executes query on every change** — complex queries feel slow | Perceived lag |
| **U12** | **No query result count limit warning** — expensive queries have no guard | Performance risk |
| **U13** | **Save validation too lenient** — saves even with empty column selection | Empty viz_specs |

### Export & Preview
| # | Issue | Impact |
|---|---|---|
| **U14** | **No render timeout/cancellation** — can take 120s with no escape | User stuck |
| **U15** | **Animation preview has no loading state** — blank area while Remotion loads | Confusion |
| **U16** | **Duration not configurable** in animation preview | Limited control |

---

## Visual Design Issues (Severity: Low-Medium)

| # | Issue | Detail |
|---|---|---|
| **V1** | **No design tokens file** — all constants in Tailwind classes + inline styles | Hard to maintain consistency |
| **V2** | **No icon library** — emoji characters as icons (📊⚔️🔥📅🗺️) | Inconsistent rendering, no accessibility |
| **V3** | **`clsx` and `tailwind-merge` unused** — dead dependencies | Dead code |
| **V4** | **Dark-only mode** — no light theme, no system preference detection | Accessibility |
| **V5** | **Builder not responsive** — fixed w-80/w-64 sidebars, desktop-only | Mobile unusable |
| **V6** | **Inconsistent button styles** — some rounded, some rounded-lg, varying padding | Visual noise |
| **V7** | **Chart colors are rainbow** — not colorblind-friendly | Accessibility |

---

## Improvement Proposals

### Tier 1: Quick Wins (1-2 days each)
- P1: Confirm clear canvas
- P2: Fix/remove fake GIF option
- P3: Toast notification system
- P4: Fix blob URL memory leak
- P5: Unsaved changes warning
- P6: Render error display
- P7: Remove dead dependencies

### Tier 2: UX Improvements (2-5 days each)
- P8: Create DESIGN.md
- P9: Add ARIA labels and roles
- P10: Add keyboard navigation
- P11: Add undo/redo to canvas
- P12: Add template picker tooltips
- P13: Add gallery thumbnails
- P14: Add gallery sorting/filtering
- P15: Add duplicate/copy in gallery

### Tier 3: Architecture Improvements (1-2 weeks each)
- **P16: Merge/bridge flows** ← CURRENT FOCUS
- P17: Onboarding flow
- P18: Render progress via SSE
- P19: Make builder responsive

### Tier 4: Polish
- P20: Replace emoji with icon library (Lucide/Phosphor)
- P21: Colorblind-friendly chart palette
- P22: Light/dark mode toggle
- P23: Extract shared design tokens
