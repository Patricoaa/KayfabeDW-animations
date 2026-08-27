# Design System — KayfabeDW Animations

> Mirrors the parent KayfabeDW Editorial/amber system. "This is serious software." — Every design decision serves this.

## 1. Aesthetic Direction

**Editorial** — magazine-inspired, premium sports publication feel. Serious but not cold.

- Strong typography hierarchy — Space Grotesk for display, DM Sans for body, JetBrains Mono for data.
- Amber accent (`#fbbf24`) as the primary color — warm, premium, championship-caliber.
- Zero shadows: depth through background-color layering only (darker bg → lighter card → lightest content).
- Dark-mode-first, with full light-mode support via `@custom-variant dark`.

## 2. Color System

### Brand: Amber

| Token | Hex | Usage |
|-------|-----|-------|
| `amber-300` | `#fcd34d` | Button hover (dark) |
| `amber-400` | `#fbbf24` | Primary buttons (dark), accent text, section labels |
| `amber-500` | `#f59e0b` | Primary CTA, focus ring, canvas accents |
| `amber-600` | `#d97706` | Links, active states |

### Surfaces & Text (tokens, resolved in `styles/global.css`)

| Context | Dark | Light |
|---------|------|-------|
| Page background (`--background`) | `#0f1218` | `#f8fafc` |
| Card (`--bg-card`) | `#151a24` | `#ffffff` |
| Card hover (`--bg-card-hover`) | `#1a2030` | `#f1f5f9` |
| Elevated (`--bg-elevated`) | `#1e2636` | `#f1f5f9` |
| Border (`--border`) | `#1e2636` | `#e2e8f0` |
| Subtle border (`--border-subtle`) | `#1a2030` | `#f1f5f9` |
| Primary text (`--text-primary`) | `#f1f5f9` | `#0f172a` |
| Secondary text (`--text-secondary`) | `#94a3b8` | `#475569` |
| Muted text (`--text-muted`) | `#64748b` | `#94a3b8` |

Tailwind mappings: `bg-card`, `bg-card-hover`, `bg-elevated`, `border-border-default`, `border-border-subtle`, `text-primary`, `text-secondary`, `text-muted`, plus the `amber-*` scale and `--text-micro` (`10px`).

Semantic accents used in the builder (chart types, join types, column types) keep distinct functional hues — blue/purple/emerald/orange — but all neutral surfaces and the primary accent are amber.

## 3. Typography

| Token | Font | Usage |
|-------|------|-------|
| `font-display` | Space Grotesk | All headings, stat numbers, labels, buttons |
| `font-body` | DM Sans | Body text, form fields, badges |
| `font-mono` | JetBrains Mono | Query/SQL, data values, table/column names |

Base type scale: body 14px, button 13px (600), badge 10px (600), `text-micro` section labels 10px uppercase with wide tracking on Space Grotesk.

## 4. Layout — Builder

- **Canvas-first**: the data canvas is the hero (main flex-1 area).
- Right config panel (`w-[22rem]`/`w-96`): output mode + chart template config + duration.
- Central area toggles between the data canvas (step Datos) and the live result (static chart or AnimationPreview player, steps Configurar/Exportar).
- Honest 3-step stepper: Datos → Configurar → Exportar.
- Mobile: right panel becomes a bottom sheet; bottom nav toggles Datos/Resultado.

## 5. Components

- **Buttons**: Primary = amber bg, dark text, `font-display` semibold. Secondary = `bg-card-hover`/`bg-elevated`, secondary text. Ghost = transparent, muted text. Radius 8px, min-height 36px.
- **Inputs/selects**: `bg-elevated border-border-default rounded-lg`, amber focus ring.
- **Toggle**: real `<input type="checkbox" role="switch">` styled as amber switch (a11y).
- **Cards**: `bg-card border-border-default rounded-lg`, amber-tinted hover border.
- **Empty states**: designed onboarding cards with amber icon, dashed border, guidance text.
- **Badges**: amber bg at low opacity + amber text; semantic badges use their functional hue.
- **Focus**: amber ring (`focus:ring-amber-500`).
- **Icons**: Lucide throughout — no emoji.

## 6. Motion

Minimal-functional only. Hover/focus 150ms ease. No entrance or decorative animation.

## 7. Migration Notes

Migrated 2026-08-27 from the original Inter/zinc/blue system to Editorial/amber.
- All `blue-*` primary accents → `amber-*`.
- All `zinc-*` surfaces/text/borders → semantic tokens.
- All emoji → Lucide icons.
- Removed shadows (`shadow-xl`, `shadow-2xl`) in favor of layered backgrounds.
- `div`-based toggles → real checkbox switches.
