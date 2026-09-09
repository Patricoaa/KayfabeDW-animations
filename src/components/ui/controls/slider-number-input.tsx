import React from 'react';

// Slider + inline number input combo for bounded numeric fields.

export function SliderNumberInput({label, value, min, max, step = 1, onChange}: {label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void}) {
  const id = React.useId();
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          aria-label={label}
          className="w-16 bg-elevated border border-border-default rounded px-2 py-1 text-xs text-right font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full h-1.5 bg-border-subtle rounded-lg appearance-none cursor-pointer accent-amber-500"
      />
    </div>
  );
}