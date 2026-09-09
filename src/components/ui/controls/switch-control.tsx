import React from 'react';

interface SwitchControlProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function SwitchControl({ label, checked, onChange, className = '' }: SwitchControlProps) {
  return (
    <label className={`flex items-center justify-between cursor-pointer select-none ${className}`}>
      <span className="text-sm text-secondary font-medium">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        aria-label={label}
      />
      <span
        aria-hidden="true"
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-amber-500' : 'bg-border-default'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </span>
    </label>
  );
}
