'use client';

import {useState, useMemo, useEffect, useRef} from 'react';
import React from 'react';
import {Player} from '@remotion/player';
import type {QuerySpec} from '@/lib/query-spec';
import type {ChartConfig} from '@/lib/chart-config';
import {convertToRemotionProps} from '@/lib/viz-to-remotion';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';

type RenderState =
  | {status: 'idle'}
  | {status: 'rendering'; phase: string; progress: number}
  | {status: 'done'; url: string; size: number}
  | {status: 'error'; message: string};

type AnimationPreviewProps = {
  templateId: string;
  data: Record<string, unknown>[];
  config: ChartConfig;
  spec: QuerySpec;
  templateProps?: Record<string, unknown> | null;
  duration?: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAZY_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<any>>> = {
  'ranking-barras': React.lazy(() =>
    import('@/remotion/templates/ranking-barras').then((m) => ({default: m.RankingBarras})),
  ),
  'head-to-head': React.lazy(() =>
    import('@/remotion/templates/head-to-head').then((m) => ({default: m.HeadToHead})),
  ),
  'stats-kpi': React.lazy(() =>
    import('@/remotion/templates/stats-kpi').then((m) => ({default: m.StatsKpi})),
  ),
  'win-streak': React.lazy(() =>
    import('@/remotion/templates/win-streak').then((m) => ({default: m.WinStreak})),
  ),
  'timeline-reinados': React.lazy(() =>
    import('@/remotion/templates/timeline-reinados').then((m) => ({default: m.TimelineReinados})),
  ),
  'heatmap-luchas': React.lazy(() =>
    import('@/remotion/templates/heatmap-luchas').then((m) => ({default: m.HeatmapLuchas})),
  ),
};

export function AnimationPreview({
  templateId,
  data,
  config,
  spec,
  templateProps: externalProps,
  duration: externalDuration,
}: AnimationPreviewProps) {
  const [renderState, setRenderState] = useState<RenderState>({status: 'idle'});
  const [duration, setDuration] = useState(externalDuration ?? 10);
  const [mounted, setMounted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => setMounted(true), []);

  const entry = TEMPLATES[templateId as TemplateId];
  const fps = entry?.meta.fps ?? 30;
  const compositionId = entry?.meta.componentId ?? templateId;

  // Use external props if provided (template data loaded), otherwise convert from query data
  const convertedProps = useMemo(
    () => convertToRemotionProps(config, data, spec, templateId),
    [templateId, config, data, spec],
  );

  const remotionProps = externalProps ?? convertedProps?.props ?? null;

  const handleExport = async () => {
    if (!remotionProps) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRenderState({status: 'rendering', phase: 'Iniciando...', progress: 0.05});
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          compositionId,
          inputProps: remotionProps,
          durationInFrames: duration * fps,
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.type === 'done') {
        setRenderState({status: 'done', url: data.url, size: data.size});
      } else if (data.type === 'error') {
        setRenderState({status: 'error', message: data.message});
      } else {
        setRenderState({status: 'error', message: 'Respuesta inesperada del servidor'});
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setRenderState({status: 'idle'});
      } else {
        setRenderState({status: 'error', message: (err as Error).message});
      }
    } finally {
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  if (!remotionProps) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        {data.length === 0
          ? 'Selecciona columnas en el canvas para ver la preview'
          : 'No se pudieron generar las props para este template'}
      </div>
    );
  }

  const Comp = LAZY_COMPONENTS[templateId];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Preview player */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-zinc-950">
        <div className="w-full max-w-4xl">
          <div className="border border-zinc-700 rounded-lg overflow-hidden shadow-2xl">
            {mounted && Comp && (
              <React.Suspense fallback={<div className="p-8 text-zinc-500 text-sm text-center">Cargando template...</div>}>
                <Player
                  component={Comp}
                  inputProps={remotionProps}
                  durationInFrames={duration * fps}
                  fps={fps}
                  compositionWidth={entry?.meta.width ?? 1920}
                  compositionHeight={entry?.meta.height ?? 1080}
                  style={{width: '100%'}}
                  controls
                  acknowledgeRemotionLicense
                />
              </React.Suspense>
            )}
          </div>
        </div>
      </div>

      {/* Export bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-t border-zinc-800 bg-zinc-900">
        {/* Duration control */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Duración:</label>
          <input
            type="range"
            min={1}
            max={20}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-20 accent-blue-500"
          />
          <span className="text-xs text-zinc-400 w-12 text-right">{duration}s</span>
        </div>

        <div className="flex-1" />

        {/* Render status */}
        {renderState.status === 'rendering' && (
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1">
              <div className="text-xs text-zinc-400 mb-1">{renderState.phase}</div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{width: `${renderState.progress * 100}%`}}
                />
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 text-xs transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {renderState.status === 'done' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-400">
              Listo ({(renderState.size / 1024 / 1024).toFixed(1)} MB)
            </span>
            <a
              href={renderState.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors"
            >
              Descargar MP4
            </a>
            <button
              onClick={() => setRenderState({status: 'idle'})}
              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}

        {renderState.status === 'error' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-red-400">{renderState.message}</span>
            <button
              onClick={() => setRenderState({status: 'idle'})}
              className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {renderState.status === 'idle' && (
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-sm font-medium transition-colors"
          >
            Exportar MP4
          </button>
        )}
      </div>
    </div>
  );
}
