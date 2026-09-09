import React from 'react';
import type {ColumnMeta} from '@/lib/chart-config';
import {SelectControl} from './select-control';

export type FieldRole = 'any' | 'numeric' | 'date';

// Column picker shared by the static chart and animation panels.
// - With rich metadata (`options`), filters numeric-only roles and labels
//   options with their table when several tables are present. The currently
//   selected value stays visible even if it no longer matches the role, so a
//   previous selection is never silently hidden.
// - `custom` renders `children` inside the select (used by the animation panel
//   to append extra computed options).
export function FieldSelect({
  label,
  value,
  options = [],
  fallback = [],
  role = 'any',
  onChange,
  optional = false,
  custom = false,
  children,
}: {
  label: string;
  value: string;
  options?: ColumnMeta[];
  fallback?: string[];
  role?: FieldRole;
  onChange: (v: string) => void;
  optional?: boolean;
  custom?: boolean;
  children?: React.ReactNode;
}) {
  if (custom) {
    return (
      <div>
        <SelectControl
          label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          {children}
        </SelectControl>
      </div>
    );
  }

  const useMeta = options.length > 0;
  const showTable = useMeta && new Set(options.map((o) => o.table)).size > 1;
  const numericList = options.filter((o) => o.isNumeric);
  const pickList = useMeta
    ? role === 'numeric'
      ? numericList
      : options
    : fallback;

  return (
    <div>
      <SelectControl
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {optional && <option value="">Ninguno</option>}
        {pickList.map((c) => {
          const alias = typeof c === 'string' ? c : c.alias;
          return (
            <option key={alias} value={alias}>
              {useMeta && typeof c !== 'string' && showTable ? `${c.table}.${c.name}` : alias}
            </option>
          );
        })}
        {useMeta && value && role === 'numeric' && !numericList.some((o) => o.alias === value) && (
          <option value={value} disabled>
            {value} (no disponible para este eje)
          </option>
        )}
      </SelectControl>
    </div>
  );
}