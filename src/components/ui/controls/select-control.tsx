import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectControlProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string; label: string }[];
}

export function SelectControl({ label, options, children, className, ...props }: SelectControlProps) {
  const id = React.useId();
  return (
    <div className={`w-full ${className || ''}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium mb-1 block font-display text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          className="w-full appearance-none bg-elevated border border-border-default rounded-lg pl-3 pr-8 py-2 text-sm font-body text-primary focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-card-hover"
          {...props}
        >
          {options ? options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )) : children}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
      </div>
    </div>
  );
}