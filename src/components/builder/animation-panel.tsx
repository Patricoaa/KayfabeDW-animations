'use client';

import {useState, useMemo} from 'react';
import {Player} from '@remotion/player';
import type {QuerySpec} from '@/lib/query-spec';
import type {ChartConfig} from '@/lib/chart-config';
import {getCompatibleTemplates, convertToRemotionProps, suggestBestTemplate} from '@/lib/viz-to-remotion';

type AnimationPanelProps = {
  data: Record<string, unknown>[];
  config: ChartConfig;
  spec: QuerySpec;
};

export function AnimationPanel({data, config, spec}: AnimationPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<string | null>(null);

  const templates = useMemo(() => getCompatibleTemplates(config, data), [config, data]);
  const bestTemplate = useMemo(() => suggestBestTemplate(config, data), [config, data]);
  const activeTemplate = selectedTemplate ?? bestTemplate;

  const remotionProps = useMemo(
    () => activeTemplate ? convertToRemotionProps(config, data, spec, activeTemplate) : null,
    [activeTemplate, config, data, spec],
  );

  const handleExport = async () => {
    if (!activeTemplate || !remotionProps) return;
    setRendering(true);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          template: activeTemplate,
          dataOptions: remotionProps.props,
        }),
      });
      if (!res.ok) throw new Error('Error rendering');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setRenderResult(url);
    } catch (e) {
      console.error('Render error:', e);
    } finally {
      setRendering(false);
    }
  };

  if (data.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm">
        <p>Sin datos para animación</p>
        <p className="text-xs mt-1">Selecciona columnas en el canvas para generar datos</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm">
        <p>No hay templates compatibles</p>
        <p className="text-xs mt-1">Los datos no coinciden con ningún template</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-zinc-400 mb-2 block">Template de animación</label>
        <div className="space-y-1">
          {templates.map((t) => (
            <button
              key={t.templateId}
              onClick={() => setSelectedTemplate(t.templateId)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                activeTemplate === t.templateId
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <span className="font-medium">{t.label}</span>
              <span className="ml-2 opacity-60">score: {t.score}</span>
              {t.templateId === bestTemplate && (
                <span className="ml-2 text-[10px] opacity-60">(recomendado)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {remotionProps && (
        <div>
          <label className="text-xs font-medium text-zinc-400 mb-2 block">Preview</label>
          <div className="border border-zinc-700 rounded overflow-hidden">
            <Player
              component={loadComponent(remotionProps.templateId)}
              inputProps={remotionProps.props}
              durationInFrames={120}
              fps={30}
              compositionWidth={1920}
              compositionHeight={1080}
              style={{width: '100%'}}
              controls
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={rendering || !activeTemplate}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 rounded text-sm transition-colors"
        >
          {rendering ? 'Renderizando...' : 'Exportar MP4'}
        </button>
      </div>

      {renderResult && (
        <div>
          <a
            href={renderResult}
            download="visualizacion.mp4"
            className="block text-center px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm transition-colors"
          >
            Descargar MP4
          </a>
        </div>
      )}
    </div>
  );
}

function loadComponent(templateId: string): React.FC<Record<string, unknown>> {
  switch (templateId) {
    case 'ranking-barras':
      return require('@/remotion/templates/ranking-barras').RankingBarras;
    case 'head-to-head':
      return require('@/remotion/templates/head-to-head').HeadToHead;
    case 'stats-kpi':
      return require('@/remotion/templates/stats-kpi').StatsKpi;
    case 'win-streak':
      return require('@/remotion/templates/win-streak').WinStreak;
    case 'timeline-reinados':
      return require('@/remotion/templates/timeline-reinados').TimelineReinados;
    case 'heatmap-luchas':
      return require('@/remotion/templates/heatmap-luchas').HeatmapLuchas;
    default:
      return require('@/remotion/templates/ranking-barras').RankingBarras;
  }
}
