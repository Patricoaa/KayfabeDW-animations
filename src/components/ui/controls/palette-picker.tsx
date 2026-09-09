import {PALETTES} from '@/lib/chart-config';

// Palette chip list with an optional "None (default)" clear row. Highlight
// tracks the selected color array; when `selected` is omitted no row is
// highlighted (the static panel treats palettes as one-shot "Aplicar").
export function PalettePicker({
  selected,
  onSelect,
  onClear,
}: {
  selected?: string[];
  onSelect: (colors: string[]) => void;
  onClear?: () => void;
}) {
  const isSelected = (colors: string[]) => selected !== undefined && JSON.stringify(selected) === JSON.stringify(colors);
  const pickClass = (active: boolean) =>
    `w-full text-left rounded-lg border p-1.5 transition-colors ${
      active ? 'border-amber-500/60' : 'border-border-subtle hover:border-amber-500/40'
    }`;

  return (
    <div className="space-y-2">
      {PALETTES.map((p) => (
        <button key={p.name} type="button" onClick={() => onSelect(p.colors)} className={pickClass(isSelected(p.colors))} aria-pressed={isSelected(p.colors)} aria-label={`Aplicar paleta ${p.name}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-secondary">{p.name}</span>
            <span className="text-[10px] text-muted">Aplicar</span>
          </div>
          <div className="flex gap-0.5">
            {p.colors.slice(0, 8).map((c, i) => (
              <div key={i} className="flex-1 h-3 rounded-sm" style={{backgroundColor: c}} />
            ))}
          </div>
        </button>
      ))}
      {onClear && (
        <button type="button" onClick={onClear} className={pickClass(isSelected([]))} aria-pressed={isSelected([])} aria-label="Quitar paleta personalizada">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-secondary">Ninguna (por defecto)</span>
            <span className="text-[10px] text-muted">Quitar</span>
          </div>
          <div className="flex gap-0.5">
            <div className="flex-1 h-3 rounded-sm" style={{backgroundColor: '#FFD700'}} />
            <div className="flex-1 h-3 rounded-sm" style={{backgroundColor: '#3f3f46'}} />
          </div>
        </button>
      )}
    </div>
  );
}