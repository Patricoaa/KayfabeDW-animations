'use client';

import {useCallback} from 'react';
import type {DataOption} from '@/remotion/generated/registry';

type DataOptionsFormProps = {
  options: DataOption[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
};

export function DataOptionsForm({options, values, onChange}: DataOptionsFormProps) {
  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <div key={opt.key}>
          <label className="block text-sm font-medium mb-1 font-display">{opt.label}</label>
          {opt.type === 'select' && opt.options ? (
            <select
              value={String(values[opt.key] ?? opt.default ?? '')}
              onChange={(e) => onChange(opt.key, e.target.value)}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {opt.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : opt.type === 'number' ? (
            <input
              type="number"
              value={Number(values[opt.key] ?? opt.default ?? 0)}
              min={opt.min}
              max={opt.max}
              onChange={(e) => onChange(opt.key, Number(e.target.value))}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          ) : (
            <input
              type="text"
              value={String(values[opt.key] ?? opt.default ?? '')}
              onChange={(e) => onChange(opt.key, e.target.value)}
              className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          )}
        </div>
      ))}
    </div>
  );
}
