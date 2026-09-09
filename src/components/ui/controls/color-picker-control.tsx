import React from 'react';
import { Pipette } from 'lucide-react';

interface ColorPickerControlProps {
  label: string;
  value?: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPickerControl({ label, value, onChange, className = '' }: ColorPickerControlProps) {
  const displayValue = value ?? '#888888';

  return (
    <div className={`w-full ${className}`}>
      <label className="flex items-center gap-2 cursor-pointer group">
        <div className="relative w-8 h-8 rounded-md overflow-hidden border border-border-default shrink-0 group-hover:border-amber-500/50 transition-colors">
          <input
            type="color"
            value={displayValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
            aria-label={`Color de ${label}`}
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs text-secondary truncate font-medium">{label}</span>
          <span className="text-[10px] text-muted font-mono uppercase">{displayValue}</span>
        </div>
        <Pipette size={14} className="text-muted group-hover:text-amber-500 transition-colors" />
      </label>
    </div>
  );
}
