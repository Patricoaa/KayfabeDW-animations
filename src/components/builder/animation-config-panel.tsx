'use client';

import React from 'react';
import type {ColumnMeta} from '@/components/builder/chart-config-panel';
import type {TimelineRaceConfig} from '@/lib/animation-config';

type AnimationConfigPanelProps = {
  templateId: string;
  columns: string[];
  fieldMeta: ColumnMeta[];
  value: TimelineRaceConfig;
  onChange: (next: TimelineRaceConfig) => void;
};

// Renders per-template column config. Currently only Timeline Race has an
// explicit config UI; other templates inherit the static xField/yField mapping.
export function AnimationConfigPanel({templateId, columns, fieldMeta, value, onChange}: AnimationConfigPanelProps) {
  if (templateId !== 'timeline-race') return null;

  const update = (patch: Partial<TimelineRaceConfig>) => onChange({...value, ...patch});

  return (
    <div className="space-y-3 border-t border-border-default pt-3">
      <label className="text-micro font-semibold text-secondary uppercase tracking-widest font-display">
        Datos del Timeline Race
      </label>

      <FieldSelect
        label="Participante / etiqueta"
        value={value.labelField ?? ''}
        options={fieldMeta}
        fallback={columns}
        onChange={(v) => update({labelField: v || undefined})}
      />
      <FieldSelect
        label="Inicio / posición"
        value={value.startField ?? ''}
        options={fieldMeta}
        fallback={columns}
        onChange={(v) => update({startField: v || undefined})}
      />
      <FieldSelect
        label="Fin (opcional)"
        value={value.endField ?? ''}
        options={fieldMeta}
        fallback={columns}
        onChange={(v) => update({endField: v || undefined})}
        optional
      />
      <FieldSelect
        label="Valor / duración"
        value={value.valueField ?? ''}
        options={fieldMeta}
        fallback={columns}
        role="numeric"
        onChange={(v) => update({valueField: v || undefined})}
      />
      <FieldSelect
        label="Secundario (opcional)"
        value={value.secondaryField ?? ''}
        options={fieldMeta}
        fallback={columns}
        role="numeric"
        onChange={(v) => update({secondaryField: v || undefined})}
        optional
      />

      <p className="text-[10px] text-muted">
        Mapea las columnas del timeline. Si dejás un campo vacío, se usa la asignación del gráfico estático.
      </p>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  options = [],
  fallback = [],
  role = 'any',
  onChange,
  optional = false,
}: {
  label: string;
  value: string;
  options?: ColumnMeta[];
  fallback?: string[];
  role?: 'any' | 'numeric';
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  const useMeta = options.length > 0;
  const numericList = options.filter((o) => o.isNumeric);

  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {optional && <option value="">Ninguno</option>}
        {!useMeta &&
          fallback.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        {useMeta &&
          (role === 'numeric' ? numericList : options).map((o) => (
            <option key={o.alias} value={o.alias}>
              {o.alias}
            </option>
          ))}
      </select>
    </div>
  );
}