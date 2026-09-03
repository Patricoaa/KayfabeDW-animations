'use client';

import {useMemo} from 'react';
import {BarChart3, Swords, Hash, Flame, Calendar, Map} from 'lucide-react';
import type {ChartConfig} from '@/lib/chart-config';
import {getCompatibleTemplates} from '@/lib/viz-to-remotion';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';

type TemplatePickerProps = {
  data: Record<string, unknown>[];
  config: ChartConfig;
  selectedTemplate: string | null;
  onSelect: (templateId: string) => void;
};

const TEMPLATE_ICONS: Record<string, typeof BarChart3> = {
  'ranking-barras': BarChart3,
  'head-to-head': Swords,
  'stats-kpi': Hash,
  'win-streak': Flame,
  'timeline-race': Calendar,
  'heatmap-luchas': Map,
};

export function TemplatePicker({data, config, selectedTemplate, onSelect}: TemplatePickerProps) {
  const templates = useMemo(() => getCompatibleTemplates(config, data), [config, data]);

  if (data.length === 0) {
    return (
      <div className="p-3 text-center text-muted text-xs">
        <p>Selecciona columnas en el canvas</p>
        <p className="mt-1 text-[10px]">para ver templates compatibles</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-3 text-center text-muted text-xs">
        <p>Sin templates compatibles</p>
        <p className="mt-1 text-[10px]">Los datos no coinciden con ningún template</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-micro font-semibold text-secondary uppercase tracking-widest font-display">
        Tipo de animación
      </label>
      <div className="grid grid-cols-3 gap-1">
        {templates.map((t) => {
          const Icon = TEMPLATE_ICONS[t.templateId] ?? BarChart3;
          const isSelected = selectedTemplate === t.templateId;
          return (
            <button
              key={t.templateId}
              onClick={() => onSelect(t.templateId)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded text-xs transition-colors ${
                isSelected
                  ? 'bg-amber-500 text-black'
                  : 'bg-elevated text-secondary hover:bg-card-hover hover:text-primary'
              }`}
            >
              <Icon size={16} />
              <span className="leading-tight text-center">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}