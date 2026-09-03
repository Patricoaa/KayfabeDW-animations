'use client';

import {useState, useMemo, useEffect, useRef} from 'react';
import React from 'react';
import {Player} from '@remotion/player';
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
  templateProps?: Record<string, unknown> | null;
  preferTemplateProps?: boolean;
  duration?: number;
  showExportBar?: boolean;
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
  'generic-bar': React.lazy(() =>
    import('@/remotion/templates/generic-bar').then((m) => ({default: m.GenericBar})),
  ),
  'generic-line': React.lazy(() =>
    import('@/remotion/templates/generic-line').then((m) => ({default: m.GenericLine})),
  ),
  'generic-kpi': React.lazy(() =>
    import('@/remotion/templates/generic-kpi').then((m) => ({default: m.GenericKpi})),
  ),
};

export function AnimationPreview({
  templateId,
  data,
  config,
  templateProps: externalProps,
  preferTemplateProps = false,
  duration: externalDuration,
  showExportBar = true,
}: AnimationPreviewProps) {
  const [renderState, setRenderState] = useState<RenderState>({status: 'idle'});
  const [duration, setDuration] = useState(externalDuration ?? 10);
  const [mounted, setMounted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => setMounted(true), []);

  const entry = TEMPLATES[templateId as TemplateId];
  const fps = entry?.meta.fps ?? 30;
  const compositionId = entry?.meta.componentId ?? templateId;

  // Convert query data into template props. When there's query data we prefer
  // the converted (canonical) props so the MP4 matches the static chart;
  // externalProps (template-canonical data) are only used when the user
  // explicitly opted in via the "Usar datos canónicos de la plantilla" button.
  const convertedProps = useMemo(
    () => (data.length > 0 ? convertToRemotionProps(config, data, templateId) : null),
    [templateId, config, data],
  );

  const remotionProps = useMemo(() => {
    if (preferTemplateProps && externalProps) return externalProps;
    if (convertedProps?.props) return convertedProps.props;
    return externalProps ?? null;
  }, [preferTemplateProps, externalProps, convertedProps]);

  const handleExport = async () => {
    if (!remotionProps) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const startedAt = Date.now();
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
      const result = await res.json();
      if (result.type === 'done') {
        setRenderState({status: 'done', url: result.url, size: result.size});
        // Best-effort render history entry (D4: persist animation_render).
        try {
          await fetch('/api/renders', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              template_id: templateId,
              input_props: remotionProps,
              output_url: result.url,
              output_size: result.size,
              render_time_ms: Date.now() - startedAt,
            }),
          });
        } catch {
          // Non-fatal — download link already shown.
        }
      } else if (result.type === 'error') {
        setRenderState({status: 'error', message: result.message});
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
      <div className="flex-1 flex items-center justify-center text-muted text-sm">
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
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-card">
        <div className="w-full max-w-4xl">
          <div className="border border-border-default rounded-lg overflow-hidden">
            {!mounted && (
              <div className="p-8 text-muted text-sm text-center">Cargando preview...</div>
            )}
            {mounted && Comp && (
              <React.Suspense fallback={<div className="p-8 text-muted text-sm text-center">Cargando template...</div>}>
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

      {/* Export bar — hidden when showExportBar is false (step 2 in builder) */}
      {showExportBar && (
      <div className="flex items-center gap-3 px-6 py-3 border-t border-border-subtle bg-elevated">
        {/* Duration control */}
        <div className="flex items-center gap-2">
          <label htmlFor="duration-slider" className="text-xs text-muted">Duración:</label>
          <input
            id="duration-slider"
            type="range"
            min={1}
            max={20}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-20 accent-amber-500"
            aria-label="Duración de la animación en segundos"
          />
          <span className="text-xs text-secondary w-12 text-right">{duration}s</span>
        </div>

        <div className="flex-1" />

        {/* Render status */}
        {renderState.status === 'rendering' && (
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1">
              <div className="text-xs text-secondary mb-1">{renderState.phase}</div>
              <div className="w-full bg-border-subtle rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                  style={{width: `${renderState.progress * 100}%`}}
                />
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 bg-card-hover hover:bg-border-default rounded text-secondary text-xs transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {renderState.status === 'done' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-500">
              Listo ({(renderState.size / 1024 / 1024).toFixed(1)} MB)
            </span>
            <a
              href={renderState.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 rounded text-black font-medium transition-colors"
              aria-label="Descargar video MP4"
            >
              Descargar MP4
            </a>
            <button
              onClick={() => setRenderState({status: 'idle'})}
              className="px-3 py-1.5 bg-card-hover hover:bg-border-default rounded text-secondary transition-colors"
              aria-label="Cerrar resultado del render"
            >
              Cerrar
            </button>
          </div>
        )}

        {renderState.status === 'error' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-red-500">{renderState.message}</span>
            <button
              onClick={() => setRenderState({status: 'idle'})}
              className="px-3 py-1.5 bg-card-hover hover:bg-border-default rounded text-secondary transition-colors"
              aria-label="Reintentar render"
            >
              Reintentar
            </button>
          </div>
        )}

        {renderState.status === 'idle' && (
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded text-sm font-semibold text-black transition-colors font-display"
            aria-label="Exportar animación como MP4"
          >
            Exportar MP4
          </button>
        )}
      </div>
      )}
    </div>
  );
}
