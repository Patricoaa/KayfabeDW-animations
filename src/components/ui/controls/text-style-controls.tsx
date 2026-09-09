import React from 'react';
import {FONT_PRESETS, FONT_WEIGHTS, TEXT_ALIGNS, TEXT_OVERFLOWS} from '@/lib/chart-config';
import type {TextStyle} from '@/lib/chart-config';
import {NumberControl} from './number-control';
import {ColorPickerControl} from './color-picker-control';
import {SwitchControl} from './switch-control';

export type TextStyleControlsProps = {
  label?: string;
  value?: TextStyle;
  onChange: (patch: Partial<TextStyle>) => void;
  hideColor?: boolean;
  showOverflow?: boolean;
  showTextTransform?: boolean;
  showSpacing?: boolean;
  showHighlight?: boolean;
  showUnderline?: boolean;
  maxSize?: number;
};

// Shared per-section text configuration for both the static chart and the
// animated templates. Every field is optional: unset fields "inherit" the
// global typography (chart theme / template defaults).
export function TextStyleControls({
  label,
  value: v = {},
  onChange,
  hideColor = false,
  showOverflow = false,
  showTextTransform = false,
  showSpacing = false,
  showHighlight = false,
  showUnderline = false,
  maxSize = 40,
}: TextStyleControlsProps) {
  const chipClass = (active: boolean) =>
    `flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
      active ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover'
    }`;
  const id = React.useId();

  return (
    <div className="space-y-2.5 rounded-lg border border-border-subtle p-2.5">
      {label && <p className="text-xs font-semibold text-muted uppercase tracking-widest font-display">{label}</p>}
      <div>
        <label htmlFor={id} className="text-sm font-medium mb-1 block">Familia</label>
        <select
          id={id}
          value={v.fontFamily ?? ''}
          onChange={(e) => onChange({fontFamily: e.target.value || undefined})}
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Heredar (por defecto)</option>
          {FONT_PRESETS.map((f) => (
            <option key={f.name} value={f.family}>{f.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Peso</label>
        <div className="flex gap-1 mt-1.5">
          <button type="button" onClick={() => onChange({weight: undefined})} className={chipClass(v.weight === undefined)} aria-label="Peso automático">Auto</button>
          {FONT_WEIGHTS.map((w) => (
            <button key={w.value} type="button" onClick={() => onChange({weight: w.value})} style={{fontWeight: w.value}} className={chipClass(v.weight === w.value)} aria-label={`Peso ${w.label}`}>
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberControl label="Tamaño" value={v.size} min={6} max={maxSize} onChange={(n) => onChange({size: n})} />
        {!hideColor && (
          <div className="flex items-end gap-1">
            <ColorPickerControl label="Color" value={v.color} onChange={(c) => onChange({color: c})} className="flex-1" />
            {v.color && (
              <button
                type="button"
                onClick={() => onChange({color: undefined})}
                title="Restablecer (heredar del tema)"
                aria-label="Restablecer color (heredar del tema)"
                className="h-8 px-2 rounded-lg text-[11px] font-medium bg-elevated border border-border-default text-secondary hover:bg-card-hover"
              >
                Auto
              </button>
            )}
          </div>
        )}
      </div>
      {showOverflow && (
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Desbordamiento</label>
          <div className="flex gap-1 mt-1.5">
            <button type="button" onClick={() => onChange({overflow: undefined})} className={chipClass(v.overflow === undefined)} aria-label="Desbordamiento automático">Auto</button>
            {TEXT_OVERFLOWS.map((o) => (
              <button key={o.value} type="button" onClick={() => onChange({overflow: o.value})} className={chipClass(v.overflow === o.value)} aria-label={`Desbordamiento ${o.label}`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Alineación</label>
        <div className="flex gap-1 mt-1.5">
          <button type="button" onClick={() => onChange({align: undefined})} className={chipClass(v.align === undefined)} aria-label="Alineación automática">Auto</button>
          {TEXT_ALIGNS.map((a) => (
            <button key={a.value} type="button" onClick={() => onChange({align: a.value})} className={chipClass(v.align === a.value)} aria-label={`Alinear ${a.label}`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      {showTextTransform && (
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-widest font-display">Mayúsculas / minúsculas</label>
          <div className="grid grid-cols-4 gap-1 mt-1.5">
            {([
              ['none', 'Normal'],
              ['uppercase', 'MAY'],
              ['lowercase', 'min'],
              ['capitalize', 'Cap'],
            ] as const).map(([val, lab]) => (
              <button key={val} type="button" onClick={() => onChange({textTransform: val === 'none' ? undefined : val})} className={chipClass((v.textTransform ?? 'none') === val)} aria-label={`Texto ${lab}`}>
                {lab}
              </button>
            ))}
          </div>
        </div>
      )}
      {showSpacing && (
        <div className="grid grid-cols-2 gap-2">
          <NumberControl label="Interletrado (px)" value={v.letterSpacing} min={-2} max={20} onChange={(n) => onChange({letterSpacing: n})} />
          <NumberControl label="Alto de línea" value={v.lineHeight} min={0.8} max={2} step={0.1} onChange={(n) => onChange({lineHeight: n})} />
        </div>
      )}
      {showHighlight && (
        <div className="rounded-lg border border-border-subtle p-2.5 space-y-2">
          <p className="text-sm font-medium">Resaltado</p>
          <div className="flex items-end gap-1">
            <ColorPickerControl label="Color de fondo" value={v.highlightColor} onChange={(c) => onChange({highlightColor: c})} className="flex-1" />
            {v.highlightColor && (
              <button
                type="button"
                onClick={() => onChange({highlightColor: undefined})}
                title="Quitar resaltado"
                aria-label="Quitar resaltado"
                className="h-8 px-2 rounded-lg text-[11px] font-medium bg-elevated border border-border-default text-secondary hover:bg-card-hover"
              >
                Auto
              </button>
            )}
          </div>
          {v.highlightColor && (
            <NumberControl label="Radio de esquinas (px)" value={v.highlightRadius} min={0} max={48} onChange={(n) => onChange({highlightRadius: n || undefined})} />
          )}
        </div>
      )}
      {showUnderline && (
        <SwitchControl label="Subrayado" checked={!!v.underline} onChange={(b) => onChange({underline: b || undefined})} />
      )}
    </div>
  );
}