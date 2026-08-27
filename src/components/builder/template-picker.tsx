'use client';

import {useMemo} from 'react';
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

const TEMPLATE_ICONS: Record<string, string> = {
  'ranking-barras': '📊',
  'head-to-head': '⚔️',
  'stats-kpi': '🔢',
  'win-streak': '🔥',
  'timeline-reinados': '📅',
  'heatmap-luchas': '🗺️',
};

export function TemplatePicker({data, config, selectedTemplate, onSelect}: TemplatePickerProps) {
  const templates = useMemo(() => getCompatibleTemplates(config, data), [config, data]);

  if (data.length === 0) {
    return (
      <div className="p-3 text-center text-zinc-600 text-xs">
        <p>Selecciona columnas en el canvas</p>
        <p className="mt-1 text-[10px]">para ver templates compatibles</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-3 text-center text-zinc-600 text-xs">
        <p>Sin templates compatibles</p>
        <p className="mt-1 text-[10px]">Los datos no coinciden con ningún template</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
        Templates ({templates.length})
      </label>
      <p className="text-[9px] text-zinc-600">
        Score = qué tan bien coinciden tus datos con el template (más alto = mejor)
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {templates.map((t) => {
          const entry = TEMPLATES[t.templateId as TemplateId];
          const icon = TEMPLATE_ICONS[t.templateId] ?? '🎬';
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
                  ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                  : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {isBest && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-blue-600 text-white px-1 rounded-full">
                  ★
                </span>
              )}
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] font-medium leading-tight">{t.label}</span>
              <span className="text-[8px] opacity-50 leading-tight line-clamp-2">{description}</span>
              <span className="text-[8px] opacity-40">score {t.score}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
