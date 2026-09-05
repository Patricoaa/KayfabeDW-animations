'use client';

import {useState, useMemo, useEffect, useRef} from 'react';
import React from 'react';
import {Player} from '@remotion/player';
import type {ChartConfig} from '@/lib/chart-config';
import {convertToRemotionProps} from '@/lib/viz-to-remotion';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';
import {EXPORT_PRESETS} from '@/lib/export-presets';
import type {ExportPresetId} from '@/lib/export-presets';

type RenderState =
  | {status: 'idle'}
  | {status: 'rendering'; phase: string; progress: number}
  | {status: 'done'; url: string; size: number}
  | {status: 'error'; message: string};

type AnimationPreviewProps = {
  templateId: string;
  data: Record<string, unknown>[];
  config: ChartConfig;
  duration?: number;
  showExportBar?: boolean;
  templateConfig?: import('@/lib/animation-config').AnimationTemplateConfig;
  onDurationChange?: (d: number) => void;
  width?: number;
  height?: number;
  presetId?: ExportPresetId;
  onPresetChange?: (id: ExportPresetId) => void;
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
  'timeline-race': React.lazy(() =>
    import('@/remotion/templates/timeline-race').then((m) => ({default: m.TimelineRace})),
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
  duration: externalDuration,
  showExportBar = true,
  templateConfig,
  onDurationChange,
  width,
  height,
  presetId,
  onPresetChange,
}: AnimationPreviewProps) {
  const [renderState, setRenderState] = useState<RenderState>({status: 'idle'});
  const [duration, setDuration] = useState(externalDuration ?? 10);
  const [mounted, setMounted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => setMounted(true), []);

  // Keep the internal duration in sync when the parent controls it (the
  // duration slider lives under the preview in the builder).
  useEffect(() => {
    if (externalDuration != null && externalDuration !== duration) {
      setDuration(externalDuration);
    }
  }, [externalDuration]); // eslint-disable-line react-hooks/exhaustive-deps

  const entry = TEMPLATES[templateId as TemplateId];
  const fps = entry?.meta.fps ?? 30;
  const compositionId = entry?.meta.componentId ?? templateId;

  // Convert query data into template props so the MP4 matches the static/preview
  // chart. (The canonical template data feature was removed.)
  const remotionProps = useMemo(
    () => (data.length > 0 ? convertToRemotionProps(config, data, templateId, templateConfig)?.props ?? null : null),
    [templateId, config, data, templateConfig],
  );

  const changeDuration = (d: number) => {
    setDuration(d);
    onDurationChange?.(d);
  };

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
          width: width ?? entry?.meta.width ?? 1920,
          height: height ?? entry?.meta.height ?? 1080,
          fps,
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
  const compW = width ?? entry?.meta.width ?? 1920;
  const compH = height ?? entry?.meta.height ?? 1080;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Preview player — fits fully inside the area (no scroll/zoom needed) by
          constraining the player to the canvas aspect ratio and centering it. */}
      <div className="flex-1 flex items-center justify-center p-6 bg-card overflow-hidden">
        {!mounted && (
          <div className="p-8 text-muted text-sm text-center">Cargando preview...</div>
        )}
        {mounted && Comp && (
          <React.Suspense fallback={<div className="p-8 text-muted text-sm text-center">Cargando template...</div>}>
            <div
              className="border border-border-default rounded-lg overflow-hidden"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: '100%',
                aspectRatio: `${compW} / ${compH}`,
              }}
            >
              <Player
                component={Comp}
                inputProps={remotionProps}
                durationInFrames={duration * fps}
                fps={fps}
                compositionWidth={compW}
                compositionHeight={compH}
                style={{width: '100%', height: '100%'}}
                controls
                acknowledgeRemotionLicense
              />
            </div>
          </React.Suspense>
        )}
      </div>

      {/* Duración — configuración principal bajo el preview. Controla la
          velocidad de la animación (inicio a fin). */}
      <div className="flex items-center gap-4 px-6 py-3 border-t border-border-default bg-elevated">
        <label htmlFor="duration-main-slider" className="text-xs font-medium text-secondary w-24 shrink-0 font-body">
          Duración
        </label>
        <input
          id="duration-main-slider"
          type="range"
          min={1}
          max={60}
          value={duration}
          onChange={(e) => changeDuration(Number(e.target.value))}
          className="flex-1 accent-amber-500"
          aria-label="Duración de la animación en segundos"
        />
        <span className="text-sm text-secondary w-40 text-right font-mono shrink-0">
          {duration}s · {duration * fps} frames
        </span>
      </div>

      {/* Tamaño / preset — ajusta el canvas de la preview (paso 2) */}
      {onPresetChange && (
      <div className="flex items-center gap-3 px-6 py-3 border-t border-border-subtle bg-elevated">
        <label className="text-xs font-medium text-secondary w-24 shrink-0 font-body">
          Tamaño
        </label>
        <div className="flex flex-wrap gap-1.5">
          {EXPORT_PRESETS.filter((p) => p.id !== 'custom').map((p) => (
            <button
              key={p.id}
              onClick={() => onPresetChange(p.id)}
              title={`${p.label} · ${p.width}×${p.height}`}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                presetId === p.id
                  ? 'bg-amber-500 text-black'
                  : 'bg-card-hover text-secondary hover:bg-border-default'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted font-mono ml-auto shrink-0">
          {width}×{height}
        </span>
      </div>
      )}

      {/* Export bar — hidden when showExportBar is false (step 2 in builder) */}
      {showExportBar && (
      <div className="flex items-center gap-3 px-6 py-3 border-t border-border-subtle bg-elevated">
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
