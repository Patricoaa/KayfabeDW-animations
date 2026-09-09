// Color swatch + "Auto" (clear/inherit) reset.
import React from 'react';

export function AutoColorInput({label, value, onChange}: {label: string; value?: string; onChange: (v?: string) => void}) {
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium mb-1 block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value ?? '#888888'}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border border-border-default bg-transparent"
          aria-label={`Color de ${label}`}
        />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          title="Restablecer (heredar del tema)"
          className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors bg-elevated border border-border-default text-secondary hover:bg-card-hover"
        >
          Auto
        </button>
      </div>
    </div>
  );
}