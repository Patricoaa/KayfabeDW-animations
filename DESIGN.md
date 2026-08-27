# Design System — KayfabeDW Animations

## Colors

### Background
- Dark: `#0a0a0a` (zinc-950)
- Surface: `#18181b` (zinc-900)
- Border: `#27272a` (zinc-800)

### Text
- Primary: `#ededed` (zinc-100)
- Secondary: `#a1a1aa` (zinc-400)
- Muted: `#71717a` (zinc-500)

### Accent
- Blue: `#2563eb` (blue-600)
- Purple: `#9333ea` (purple-600)
- Green: `#16a34a` (green-600)
- Amber: `#d97706` (amber-600)
- Red: `#dc2626` (red-600)

### Chart Colors (Colorblind-safe, Wong 2011)
1. `#0072B2` (blue)
2. `#E69F00` (orange)
3. `#009E73` (green)
4. `#F0E442` (yellow)
5. `#56B4E9` (light blue)
6. `#D55E00` (vermillion)
7. `#CC79A7` (pink)
8. `#999999` (gray)
9. `#332288` (indigo)
10. `#88CCEE` (cyan)
11. `#44AA99` (teal)
12. `#117733` (forest)

## Typography

### Font Stack
```css
'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
```

### Sizes
- xs: 12px
- sm: 14px
- base: 16px
- lg: 18px
- xl: 20px

## Spacing

- 1: 4px
- 2: 8px
- 3: 12px
- 4: 16px
- 6: 24px
- 8: 32px

## Border Radius

- sm: 4px
- md: 6px
- lg: 8px
- xl: 12px

## Shadows

- sm: `0 1px 2px rgba(0,0,0,0.3)`
- md: `0 4px 6px rgba(0,0,0,0.4)`
- lg: `0 10px 15px rgba(0,0,0,0.5)`

## Transitions

- Fast: 150ms
- Normal: 200ms
- Slow: 300ms

## Component Patterns

### Button
- Primary: `bg-blue-600 hover:bg-blue-500 text-white rounded px-4 py-1.5`
- Secondary: `bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded px-4 py-1.5`
- Danger: `bg-red-600 hover:bg-red-500 text-white rounded px-4 py-1.5`

### Input
- `bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm`

### Card
- `bg-zinc-900 border border-zinc-800 rounded-lg`

### Toast
- Success: `bg-green-900/90 border-green-700 text-green-200`
- Error: `bg-red-900/90 border-red-700 text-red-200`
- Info: `bg-zinc-800/90 border-zinc-600 text-zinc-200`
