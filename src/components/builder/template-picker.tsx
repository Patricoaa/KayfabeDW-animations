'use client';

import {useMemo} from 'react';
import {BarChart3, Swords, Hash, Flame, Calendar, Map, Star} from 'lucide-react';
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
  'timeline-reinados': Calendar,
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
        Templates ({templates.length})
      </label>
      <p className="text-[9px] text-muted">
        Score = qué tan bien coinciden tus datos con el template (más alto = mejor)
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {templates.map((t) => {
          const entry = TEMPLATES[t.templateId as TemplateId];
          const Icon = TEMPLATE_ICONS[t.templateId] ?? BarChart3;
          const isSelected = selectedTemplate === t.templateId;
          const isBest = t === templates[0];
          const description = entry?.meta.description ?? '';

          return (
            <button
              key={t.templateId}
              onClick={() => onSelect(t.templateId)}
              title={`${entry?.meta.name}: ${description}`}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-all ${
                isSelected
                  ? 'bg-amber-500/15 border border-amber-500/60 text-amber-500'
                  : 'bg-elevated border border-border-default text-secondary hover:bg-card-hover hover:text-primary'
              }`}
            >
              {isBest && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-black rounded-full p-0.5" aria-label="Mejor coincidencia">
                  <Star size={9} fill="currentColor" />
                </span>
              )}
              <Icon size={18} className="text-amber-500" />
              <span className="text-[10px] font-semibold leading-tight font-display">{t.label}</span>
              <span className="text-[8px] opacity-60 leading-tight line-clamp-2">{description}</span>
              <span className="text-[8px] opacity-40">score {t.score}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
