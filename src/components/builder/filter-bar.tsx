'use client';

import {useCallback, useEffect, useState} from 'react';
import type {FilterRule} from '@/lib/query-spec';
import type {SchemaMetadata} from '@/lib/schema-metadata';

type FilterBarProps = {
  specTable: string;
  filters: FilterRule[];
  onChange: (filters: FilterRule[]) => void;
};

type PrebuiltFilter = {
  label: string;
  column: string;
  table?: string;
  type: 'text' | 'select' | 'date';
  options?: {value: string; label: string}[];
};

const PREBUILT_FILTERS: PrebuiltFilter[] = [
  {label: 'Promoción', column: 'promotion_name', type: 'text'},
  {label: 'Fecha desde', column: 'date', type: 'date'},
  {label: 'Fecha hasta', column: 'date', type: 'date'},
  {label: 'Luchador', column: 'ring_name', type: 'text'},
  {label: 'Tipo de lucha', column: 'match_type_name', type: 'text'},
  {label: 'Resultado', column: 'outcome', type: 'select', options: [
    {value: 'decided', label: 'Decidido'},
    {value: 'draw', label: 'Empate'},
    {value: 'no_contest', label: 'Sin resultado'},
    {value: 'pending', label: 'Pendiente'},
  ]},
  {label: 'Género', column: 'gender', type: 'select', options: [
    {value: 'male', label: 'Masculino'},
    {value: 'female', label: 'Femenino'},
    {value: 'mixed', label: 'Mixto'},
  ]},
  {label: 'Año', column: 'date', type: 'text'},
];

export function FilterBar({specTable, filters, onChange}: FilterBarProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      const newFilters = {...activeFilters, [key]: value};
      setActiveFilters(newFilters);

      const ruleFilters: FilterRule[] = Object.entries(newFilters)
        .filter(([, v]) => v !== '')
        .map(([k]) => {
          const prebuilt = PREBUILT_FILTERS.find((f) => f.label === k);
          const val = newFilters[k];
          if (prebuilt?.type === 'date' && k === 'Fecha desde') {
            return {column: 'date', op: '>=' as const, value: val};
          }
          if (prebuilt?.type === 'date' && k === 'Fecha hasta') {
            return {column: 'date', op: '<=' as const, value: val};
          }
          if (prebuilt?.type === 'select') {
            return {column: prebuilt.column, op: '=' as const, value: val};
          }
          return {column: prebuilt?.column ?? k, op: 'ilike' as const, value: `%${val}%`};
        });

      onChange(ruleFilters);
    },
    [activeFilters, onChange],
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Filtros rápidos</label>
      <div className="grid grid-cols-2 gap-2">
        {PREBUILT_FILTERS.map((f) => (
          <div key={f.label}>
            <label className="text-xs text-zinc-500 mb-0.5 block">{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={activeFilters[f.label] ?? ''}
                onChange={(e) => handleFilterChange(f.label, e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                <option value="">Todos</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.type === 'date' ? (
              <input
                type="date"
                value={activeFilters[f.label] ?? ''}
                onChange={(e) => handleFilterChange(f.label, e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              />
            ) : (
              <input
                type="text"
                placeholder={f.label}
                value={activeFilters[f.label] ?? ''}
                onChange={(e) => handleFilterChange(f.label, e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
