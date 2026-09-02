import {
  FONT_PRESETS,
  FONT_WEIGHTS,
  TEXT_OVERFLOWS,
} from '@/lib/chart-config';
import type {FontWeight, SectionFont, TextOverflow} from '@/lib/chart-config';

function ColorInput({label, value, onChange}: {label: string; value?: string; onChange: (v: string) => void}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value ?? '#888888'}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border border-border-default bg-transparent"
        />
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Heredar"
          className="flex-1 bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
    </div>
  );
}

function NumberInput({label, value, min, max, step = 1, onChange}: {label: string; value?: number; min: number; max: number; step?: number; onChange: (v: number | undefined) => void}) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        placeholder="Auto"
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = e.target.value === '' ? undefined : Number(e.target.value);
          onChange(v === undefined || isNaN(v) ? undefined : v);
        }}
        className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
    </div>
  );
}

export function WeightControl({value, onChange}: {value?: FontWeight; onChange: (v?: FontWeight) => void}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Peso</label>
      <div className="flex gap-1 mt-1.5">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            value === undefined ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover'
          }`}
        >
          Auto
        </button>
        {FONT_WEIGHTS.map((w) => (
          <button
            key={w.value}
            type="button"
            onClick={() => onChange(w.value)}
            style={{fontWeight: w.value}}
            className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
              value === w.value ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OverflowControl({value, onChange}: {value?: TextOverflow; onChange: (v?: TextOverflow) => void}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Desbordamiento</label>
      <div className="flex gap-1 mt-1.5">
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            value === undefined ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover'
          }`}
        >
          Auto
        </button>
        {TEXT_OVERFLOWS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              value === o.value ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FontFamilySelect({value, onChange}: {value?: string; onChange: (v: string) => void}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
    >
      <option value="">Heredar (por defecto)</option>
      {FONT_PRESETS.map((f) => (
        <option key={f.name} value={f.family}>{f.name}</option>
      ))}
    </select>
  );
}

/**
 * Reusable per-section text configuration: weight, family, size, color and
 * overflow. Mirror of the received `SectionFont`; every field "inherits"
 * from the general chart typography when left unset (Auto).
 */
export function TextControls({value, onChange}: {value?: SectionFont; onChange: (patch: Partial<SectionFont>) => void}) {
  return (
    <div className="space-y-2.5 rounded-lg border border-border-subtle p-2.5">
      <WeightControl value={value?.weight} onChange={(w) => onChange({weight: w})} />
      <div>
        <label className="text-sm font-medium mb-1 block">Familia</label>
        <FontFamilySelect value={value?.fontFamily} onChange={(v) => onChange({fontFamily: v || undefined})} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Tamaño" value={value?.size} min={6} max={40} onChange={(v) => onChange({size: v})} />
        <ColorInput label="Color" value={value?.color} onChange={(v) => onChange({color: v || undefined})} />
      </div>
      <OverflowControl value={value?.overflow} onChange={(v) => onChange({overflow: v})} />
    </div>
  );
}