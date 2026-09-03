'use client';

import React, {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import type {ColumnMeta} from '@/components/builder/chart-config-panel';
import type {TimelineRaceConfig, DateFormat} from '@/lib/animation-config';

type AnimationConfigPanelProps = {
  templateId: string;
  columns: string[];
  fieldMeta: ColumnMeta[];
  value: TimelineRaceConfig;
  onChange: (next: TimelineRaceConfig) => void;
};

// Collapsible accordion section (Flourish-style), mirrors the static chart
// config panel. "Datos" is open by default.
function Section({title, defaultOpen = false, children}: {title: string; defaultOpen?: boolean; children: React.ReactNode}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium font-display transition-colors ${
          open ? 'bg-amber-500/10 text-amber-500' : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
        }`}
      >
        {title}
        <ChevronDown size={14} className={`transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

// Renders per-template column config. Currently only Timeline Race has an
// explicit config UI; other templates inherit the static xField/yField mapping.
export function AnimationConfigPanel({templateId, columns, fieldMeta, value, onChange}: AnimationConfigPanelProps) {
  if (templateId !== 'timeline-race') return null;

  const update = (patch: Partial<TimelineRaceConfig>) => onChange({...value, ...patch});
  const fmt = (value.dateFormat ?? 'day') as DateFormat;

  return (
    <div className="space-y-3">
      <Section title="Datos" defaultOpen>
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
      </Section>

      <Section title="Eje X" defaultOpen>
        <FieldSelect
          label="Campo de fecha"
          value={value.dateField ?? ''}
          options={fieldMeta}
          fallback={columns}
          role="date"
          onChange={(v) => update({dateField: v || undefined})}
        />
        <div>
          <label className="text-sm font-medium mb-1 block">Formato de fecha</label>
          <select
            value={fmt}
            onChange={(e) => update({dateFormat: e.target.value as DateFormat})}
            className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="day">Día</option>
            <option value="month">Mes</option>
            <option value="year">Año</option>
          </select>
          <p className="text-[10px] text-muted mt-0.5">
            Agrupa los datos por día, mes o año y re-agrega el valor acumulado en cada rango.
          </p>
        </div>
      </Section>

      <Section title="Eje Y / Valor">
        <FieldSelect
          label="Campo de valor acumulado"
          value={value.valueField ?? ''}
          options={fieldMeta}
          fallback={columns}
          role="numeric"
          onChange={(v) => update({valueField: v || undefined})}
        />
        <p className="text-[10px] text-muted">
          Una guía vertical barre el eje de fechas de izquierda a derecha; al pasar la fecha de un
          participante su valor acumulado salta y entra al ranking. Si un participante tiene varias
          fechas, su valor se acumula a lo largo del tiempo.
        </p>
      </Section>
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
    </div>
  );
}
