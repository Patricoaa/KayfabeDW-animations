import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface NumberControlProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  description?: string;
}

export function NumberControl({ 
  label, 
  value, 
  onChange, 
  step = 1, 
  min, 
  max, 
  description,
  className = '', 
  ...props 
}: NumberControlProps) {
  
  const handleIncrement = () => {
    const current = value ?? 0;
    const next = current + step;
    if (max !== undefined && next > max) return;
    onChange(Number(next.toFixed(5))); // avoid floating point issues
  };

  const handleDecrement = () => {
    const current = value ?? 0;
    const next = current - step;
    if (min !== undefined && next < min) return;
    onChange(Number(next.toFixed(5)));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value === '') {
      onChange(undefined);
      return;
    }
    const val = Number(e.target.value);
    if (!isNaN(val)) {
      onChange(val);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <label className="text-sm font-medium mb-1 block font-display text-secondary">{label}</label>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value !== undefined && min !== undefined && value <= min}
          className="p-1.5 rounded-md bg-elevated border border-border-default text-muted hover:text-secondary hover:bg-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={`Decrementar ${label}`}
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={value ?? ''}
          onChange={handleChange}
          step={step}
          min={min}
          max={max}
          className="flex-1 min-w-0 bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-center text-sm font-body text-primary focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          {...props}
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value !== undefined && max !== undefined && value >= max}
          className="p-1.5 rounded-md bg-elevated border border-border-default text-muted hover:text-secondary hover:bg-card-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={`Incrementar ${label}`}
        >
          <Plus size={14} />
        </button>
      </div>
      {description && <p className="text-[10px] text-muted mt-1">{description}</p>}
    </div>
  );
}
