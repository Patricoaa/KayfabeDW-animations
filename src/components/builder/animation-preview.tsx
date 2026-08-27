'use client';

import {useState, useMemo} from 'react';
import {Player} from '@remotion/player';
import type {QuerySpec} from '@/lib/query-spec';
import type {ChartConfig} from '@/lib/chart-config';
import {convertToRemotionProps} from '@/lib/viz-to-remotion';

type AnimationPreviewProps = {
  templateId: string;
  data: Record<string, unknown>[];
  config: ChartConfig;
  spec: QuerySpec;
};

export function AnimationPreview({templateId, data, config, spec}: AnimationPreviewProps) {
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'mp4' | 'gif'>('mp4');

  const remotionProps = useMemo(
    () => convertToRemotionProps(config, data, spec, templateId),
    [templateId, config, data, spec],
  );

  const handleExport = async () => {
    if (!remotionProps) return;
    setRendering(true);
    setRenderResult(null);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          template: templateId,
          dataOptions: remotionProps.props,
          format: exportFormat,
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

  if (!remotionProps) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        No se pudieron generar las props para este template
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Preview player */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-zinc-950">
        <div className="w-full max-w-4xl">
          <div className="border border-zinc-700 rounded-lg overflow-hidden shadow-2xl">
            <Player
              component={loadComponent(templateId)}
              inputProps={remotionProps.props}
              durationInFrames={150}
              fps={30}
              compositionWidth={1920}
              compositionHeight={1080}
              style={{width: '100%'}}
              controls
            />
          </div>
        </div>
      </div>

      {/* Export bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-t border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExportFormat('mp4')}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              exportFormat === 'mp4'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            MP4
          </button>
          <button
            onClick={() => setExportFormat('gif')}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              exportFormat === 'gif'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            GIF
          </button>
        </div>

        <button
          onClick={handleExport}
          disabled={rendering}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 rounded text-sm font-medium transition-colors"
        >
          {rendering ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⟳</span> Renderizando...
            </span>
          ) : (
            'Exportar'
          )}
        </button>

        {renderResult && (
          <a
            href={renderResult}
            download={`visualizacion.${exportFormat}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
          >
            Descargar
          </a>
        )}
      </div>
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
