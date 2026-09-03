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
        label="Imagen del participante (opcional)"
        value={value.imageField ?? ''}
        options={fieldMeta}
        fallback={columns}
        role="any"
        optional
        onChange={(v) => update({imageField: v || undefined})}
      />
      <FieldSelect
        label="Fecha (eje X / guía)"
        value={value.dateField ?? ''}
        options={fieldMeta}
        fallback={columns}
        role="date"
        onChange={(v) => update({dateField: v || undefined})}
      />
      <FieldSelect
        label="Valor acumulado"
        value={value.valueField ?? ''}
        options={fieldMeta}
        fallback={columns}
        role="numeric"
        onChange={(v) => update({valueField: v || undefined})}
      />

      <p className="text-[10px] text-muted">
        Una guía vertical barre el eje de fechas de izquierda a derecha; al pasar la fecha de un
        participante, su valor acumulado salta y entra al ranking. Dejá la fecha vacía para usar
        una vista de barras simples.
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
  role?: 'any' | 'numeric' | 'date';
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  const useMeta = options.length > 0;
  const numericList = options.filter((o) => o.isNumeric);

  const pickList = useMeta
    ? role === 'numeric'
      ? numericList
      : options
    : fallback;

  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        {optional && <option value="">Ninguno</option>}
        {pickList.map((c) => {
          const alias = typeof c === 'string' ? c : c.alias;
          return (
            <option key={alias} value={alias}>
              {alias}
            </option>
          );
        })}
      </select>
      {role === 'date' && useMeta && numericList.length === options.length && (
        <p className="text-[10px] text-muted mt-0.5">
          Si tu columna de fecha no se detecta, se intentará parsear en el render.
        </p>
      )}
    </div>
  );
}
