# P16: Merge/Bridge Flows — Implementation Plan

**Goal**: Unify the Template Editor (`/`) and Visual Builder (`/builder`) into a single coherent flow.

---

## Current State

Two completely separate user experiences sharing only Remotion template components:

| Aspect | Flow A: Template Editor (`/`) | Flow B: Visual Builder (`/builder`) |
|--------|------------------------------|-------------------------------------|
| **Data source** | Per-template hardcoded `queryData()` functions | User-built visual query via ReactFlow |
| **Query visibility** | Opaque — user never sees SQL/tables | Transparent — full schema + SQL preview |
| **Template selection** | User picks template FIRST, then configures | Template auto-suggested from data shape |
| **Render pipeline** | Working — sends correct `{compositionId, inputProps}` | Broken — sends wrong payload format |
| **Duration control** | Working — slider 1-20s | Missing — hardcoded 150 frames |
| **Progress/Download** | Working — progress phases + download link | Missing — just spinning icon |
| **Persistence** | None — no save/load | Full — viz_spec table + gallery |

---

## Approach: Full Unification

**Target**: Single `/builder` page that handles both template-driven and user-driven workflows. `/` becomes a landing/redirect.

### User Journey After Merge

```
/builder (new default)
  ├── "Use a template" → Pick template → Show DataOptionsForm → Load template data → Preview → Export
  ├── "Build from scratch" → Drag tables → Configure query → Pick chart type → Preview → Export
  └── Gallery → Load saved viz → Edit → Re-export
```

---

## Implementation Steps

### Step 1: Create `DataOptionsForm` component
**New file**: `src/components/builder/data-options-form.tsx`

A generic form renderer for `DataOption[]` from the template registry. Takes a template ID, renders the appropriate fields (text, number, select), and returns the filled values.

**Source**: Port logic from `app/page.tsx:256-289` into a reusable component.

```
Input: DataOption[] (from TEMPLATES[id].meta.dataOptions)
Output: Record<string, string | number> (the filled options)
```

### Step 2: Add "Plantilla" mode to Builder sidebar
**Modified file**: `src/app/builder/page.tsx`

Add a third output mode option alongside "Estático" and "Animación":
- When "Animación" is active and a template is selected, show:
  - TemplatePicker (existing)
  - DataOptionsForm (new) — for the selected template's `dataOptions`
  - "Cargar datos de plantilla" button → calls `POST /api/templates/{id}/data`
  - Duration slider (ported from `page.tsx:237-252`)

**New state**: `templateOptions: Record<string, string | number>` — holds the filled DataOptionsForm values.

### Step 3: Fix render payload in `AnimationPreview`
**Modified file**: `src/components/builder/animation-preview.tsx`

Current (broken):
```ts
const res = await fetch('/api/render', {
  method: 'POST',
  body: JSON.stringify({ template, dataOptions: ..., format: exportFormat })
})
```

Fix to:
```ts
const templateMeta = TEMPLATES[templateId]
const res = await fetch('/api/render', {
  method: 'POST',
  body: JSON.stringify({
    compositionId: templateMeta.componentId,
    inputProps: remotionProps,
    durationInFrames: duration  // from new duration state
  })
})
```

### Step 4: Add duration control to `AnimationPreview`
**Modified file**: `src/components/builder/animation-preview.tsx`

- Port the duration slider from `app/page.tsx:237-252`
- Add `duration` state (default: `meta.defaultDuration` from template)
- Pass `durationInFrames={duration * fps}` to `<Player>`
- Pass `durationInFrames` to render API call

### Step 5: Add render progress + download to `AnimationPreview`
**Modified file**: `src/components/builder/animation-preview.tsx`

Port the render state machine from `app/page.tsx:29-33`:
```ts
type RenderState =
  | { status: 'idle' }
  | { status: 'rendering'; progress: number; phase: string }
  | { status: 'done'; url: string; size: number }
  | { status: 'error'; message: string }
```

Add progress bar + download link UI from `page.tsx:316-351`.

### Step 6: Redirect `/` to `/builder`
**Modified file**: `src/app/page.tsx`

Replace the full landing page with a redirect to `/builder`. Optionally add a `?template={id}` param that pre-selects a template in the builder.

```
/ → /builder (302 redirect)
/?template=ranking-barras → /builder?template=ranking-barras
```

### Step 7: Clean up duplicates
- Remove `TEMPLATE_COMPONENTS` hardcoded map from `page.tsx:40-59`
- Remove duplicate `loadComponent()` from `animation-panel.tsx:138-155` and `animation-preview.tsx:132-149`
- Use the generated registry's lazy loading in both places

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/builder/data-options-form.tsx` | Generic form for template DataOption[] |

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/builder/page.tsx` | Add templateOptions state, DataOptionsForm in preview tab, duration state |
| `src/components/builder/animation-preview.tsx` | Fix render payload, add duration slider, add progress/download |
| `src/app/page.tsx` | Replace with redirect to `/builder` |
| `src/components/builder/animation-panel.tsx` | Remove duplicate loadComponent, use registry |

## Files Unchanged

- `src/remotion/templates/*` — all template components
- `src/remotion/generated/registry.ts` — generated registry
- `src/app/api/render/route.ts` — render API (already correct)
- `src/app/api/templates/*/data/route.ts` — template data API
- `src/app/api/query/route.ts` — query builder API
- `src/lib/viz-to-remotion.ts` — template matching
- `src/lib/profile-matcher.ts` — data profile matching

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Template `queryData` functions may not work with Builder's data pipeline | Keep both paths: template data API + generic query API. User chooses. |
| Removing landing page may confuse existing users | Add redirect, keep URL working. Users land on Builder with full functionality. |
| Duration control may conflict with template's `defaultDuration` | Use template's default as initial value, let user override. |
| Render payload format may have edge cases | Test all 6 templates with the fixed payload before merging. |

---

## Verification

1. **Template flow**: `/builder` → select template → fill DataOptionsForm → "Cargar datos" → see preview → export → download works
2. **Custom query flow**: `/builder` → drag tables → configure query → select chart type → see preview → export → download works
3. **Gallery flow**: `/builder/gallery` → load saved viz → edit → re-export works
4. **Redirect**: `/` → redirects to `/builder`
5. **All 6 templates** render correctly via the Builder's animation preview
