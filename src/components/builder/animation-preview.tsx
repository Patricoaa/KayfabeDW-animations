'use client';

import {useState, useMemo, useEffect, useRef} from 'react';
import React from 'react';
import {Minus, Plus, Maximize} from 'lucide-react';
import {Player} from '@remotion/player';
import type {ChartConfig} from '@/lib/chart-config';
import {convertToRemotionProps} from '@/lib/viz-to-remotion';
import {getItems, parseRenderResponse, renderPhaseLabel} from '@/lib/render-export';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';
import {EXPORT_PRESETS} from '@/lib/export-presets';
import type {ExportPresetId} from '@/lib/export-presets';
import {loadSafeZones, saveSafeZones, type SafeZoneSettings} from '@/lib/safe-zones';
import {SafeZoneControls} from '@/components/builder/safe-zone-controls';
import {SafeZoneOverlay} from '@/components/builder/safe-zone-overlay';

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
  showSafeZones?: boolean;
  // Controlled safe-zone settings. When omitted, the preview manages its own
  // state (initialized from and written back to localStorage).
  safeZones?: SafeZoneSettings;
  onSafeZonesChange?: (s: SafeZoneSettings) => void;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LAZY_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC<any>>> = {
  'timeline-race': React.lazy(() =>
    import('@/remotion/templates/timeline-race').then((m) => ({default: m.TimelineRace})),
  ),
  'race-scrolling': React.lazy(() =>
    import('@/remotion/templates/race-scrolling').then((m) => ({default: m.RaceScrolling})),
  ),
  'ranking': React.lazy(() =>
    import('@/remotion/templates/ranking').then((m) => ({default: m.Ranking})),
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
  showSafeZones = false,
  safeZones: safeZonesProp,
  onSafeZonesChange,
}: AnimationPreviewProps) {
  const [renderState, setRenderState] = useState<RenderState>({status: 'idle'});
  const [duration, setDuration] = useState(externalDuration ?? 10);
  const [mounted, setMounted] = useState(false);
  const [internalSafeZones, setInternalSafeZones] = useState<SafeZoneSettings>(() => loadSafeZones());
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => setMounted(true), []);

  const entry = TEMPLATES[templateId as TemplateId];

  const safeZones = safeZonesProp ?? internalSafeZones;
  const handleSafeZonesChange = (s: SafeZoneSettings) => {
    setInternalSafeZones(s);
    onSafeZonesChange?.(s);
  };

  // Preview-only safe-zone overlay: persisted locally (keeps them as global
  // defaults across vizs), never part of an export.
  useEffect(() => {
    saveSafeZones(safeZones);
  }, [safeZones]);

  // Effective composition size (export canvas). Known before the early return
  // so the fit-measure hook below can depend on it.
  const compW = width ?? entry?.meta.width ?? 1920;
  const compH = height ?? entry?.meta.height ?? 1080;

  // Pixel-exact fit box: size the player frame to the composition's aspect
  // ratio within the measured area. Avoiding the CSS `aspect-ratio + maxHeight`
  // combo, which breaks on vertical canvases (9:16 wide preview area squishes
  // the box, the Player letterboxes, and the safe-zone overlay misaligns).
  const [fitBox, setFitBox] = useState<{w: number; h: number} | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);

  // Zoom state: "fit" (Ajustar, default) or an explicit percentage of the
  // composition size. At 100% the preview shows the real export size in CSS px.
  const MIN_PCT = 25;
  const MAX_PCT = 300;
  const [pctMode, setPctMode] = useState(false);
  const [pctScale, setPctScale] = useState(100);
  const clampPct = (v: number) => Math.max(MIN_PCT, Math.min(MAX_PCT, Math.round(v)));
  const zoomScaled = (factor: number) => {
    setPctMode(true);
    setPctScale((p) => clampPct(p * factor));
  };
  const zoomAbsolute = (v: number) => {
    setPctMode(true);
    setPctScale(clampPct(v));
  };
  const fitView = () => setPctMode(false);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => {
      const PAD = 24; // p-6 around the preview
      const availW = Math.max(0, el.clientWidth - PAD * 2);
      const availH = Math.max(0, el.clientHeight - PAD * 2);
      if (availW <= 0 || availH <= 0) return;
      const scale = Math.min(availW / compW, availH / compH);
      setFitBox({w: Math.max(1, Math.round(compW * scale)), h: Math.max(1, Math.round(compH * scale))});
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, [compW, compH]);

  // Keep the internal duration in sync when the parent controls it (the
  // duration slider lives under the preview in the builder).
  useEffect(() => {
    if (externalDuration != null && externalDuration !== duration) {
      setDuration(externalDuration);
    }
  }, [externalDuration]); // eslint-disable-line react-hooks/exhaustive-deps

  const fps = entry?.meta.fps ?? 30;
  const compositionId = entry?.meta.componentId ?? templateId;

  // Convert query data into template props so the MP4 matches the static/preview
  // chart. (The canonical template data feature was removed.)
  const remotionProps = useMemo(
    () => (data.length > 0 ? convertToRemotionProps(config, data, templateId, templateConfig)?.props ?? null : null),
    [templateId, config, data, templateConfig],
  );

  // Race-scrolling tick sound mounts ONE <Audio> per date crossing, and each
  // crossing's <Sequence> stays active until the end of the video, so the tags
  // remain mounted simultaneously. The Player pre-mounts a LIMITED pool of
  // shared audio tags (default 5) and THROWS when more tags are mounted at once,
  // replacing the whole canvas with an error icon. Size the pool to the actual
  // event count (distinct axis positions) whenever a tick sound is set.
  //
  // Remotion additionally THROWS "number of shared audio tags has changed
  // dynamically" if this value ever differs between renders of the same Player
  // instance — so it must be constant for the Player's lifetime. The value only
  // changes when the template or the event count changes; remounting the Player
  // (via `key`) with a fresh pool whenever it does keeps the pool exact while
  // never tripping the dynamic-change guard.
  const numberOfSharedAudioTags = useMemo(() => {
    if (templateId !== 'race-scrolling') return 5;
    const p = remotionProps as {barSoundSrc?: string; items?: {pos?: unknown}[]} | null;
    if (!p?.barSoundSrc || !Array.isArray(p.items)) return 5;
    const eventCount = new Set(p.items.map((it) => it.pos)).size;
    return Math.max(5, eventCount + 1);
  }, [templateId, remotionProps]);

  const changeDuration = (d: number) => {
    setDuration(d);
    onDurationChange?.(d);
  };

  const handleExport = async () => {
    if (!remotionProps) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const items = getItems(remotionProps);
    const frames = duration * fps;
    const effW = width ?? entry?.meta.width ?? 1920;
    const effH = height ?? entry?.meta.height ?? 1080;
    setRenderState({status: 'rendering', phase: renderPhaseLabel(frames, items, effH > effW), progress: 0.05});
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          compositionId,
          inputProps: remotionProps,
          durationInFrames: frames,
          width: effW,
          height: effH,
          fps,
        }),
        signal: controller.signal,
      });
      const result = await parseRenderResponse(res);
      if (result.type === 'done') {
        setRenderState({status: 'done', url: result.url, size: result.size});
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

  // Current on-screen frame box and its scale relative to the composition.
  const boxPx = pctMode
    ? {w: Math.max(1, Math.round((compW * pctScale) / 100)), h: Math.max(1, Math.round((compH * pctScale) / 100))}
    : fitBox;
  const displayW = boxPx?.w ?? compW;
  const displayH = boxPx?.h ?? compH;
  const fitPct = fitBox ? Math.round((fitBox.w / compW) * 100) : 100;
  const displayPct = pctMode ? clampPct(pctScale) : fitPct;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Preview player — fits fully inside the area (no scroll/zoom needed) by
          constraining the player to the canvas aspect ratio and centering it. */}
      <div className="flex-1 flex items-center justify-center p-6 bg-card overflow-hidden relative" ref={areaRef}>
        {!mounted && (
          <div className="p-8 text-muted text-sm text-center">Cargando preview...</div>
        )}
        {mounted && Comp && (
          <React.Suspense fallback={<div className="p-8 text-muted text-sm text-center">Cargando template...</div>}>
            <div
              className={pctMode ? 'overflow-auto' : ''}
              style={pctMode ? {width: 'max-content', maxWidth: '100%', height: 'max-content', maxHeight: '100%', margin: 'auto'} : undefined}
            >
              <div
                className="border border-border-default rounded-lg overflow-hidden relative"
                style={
                  boxPx
                    ? {width: boxPx.w, height: boxPx.h}
                    : {width: '100%', maxHeight: '100%', aspectRatio: `${compW} / ${compH}`}
                }
              >
                <Player
                  key={`${templateId}:${numberOfSharedAudioTags}`}
                  component={Comp}
                  inputProps={remotionProps}
                  durationInFrames={duration * fps}
                  fps={fps}
                  compositionWidth={compW}
                  compositionHeight={compH}
                  numberOfSharedAudioTags={numberOfSharedAudioTags}
                  style={{width: '100%', height: '100%'}}
                  controls
                  acknowledgeRemotionLicense
                />
                {showSafeZones && boxPx && (
                  <SafeZoneOverlay width={compW} height={compH} scale={boxPx.w / compW} settings={safeZones} />
                )}
              </div>
            </div>
          </React.Suspense>
        )}

        {/* Zoom — porque el preview escala para caber; "100%" muestra el canvas
            a su tamaño de export real (px CSS), con scroll si no entra. */}
        <div className="absolute left-2 top-2 z-30 flex items-center gap-0.5 rounded-lg border border-border-default bg-card px-1.5 py-1 shadow-md">
          <button
            type="button"
            onClick={() => zoomScaled(1 / 1.25)}
            aria-label="Reducir"
            className="p-1 rounded-md text-secondary hover:bg-card-hover transition-colors"
          >
            <Minus size={13} />
          </button>
          <input
            type="range"
            min={MIN_PCT}
            max={MAX_PCT}
            value={displayPct}
            onChange={(e) => zoomAbsolute(Number(e.target.value))}
            className="w-20 accent-amber-500"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => zoomAbsolute(100)}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-secondary hover:bg-card-hover transition-colors"
          >
            100%
          </button>
          <button
            type="button"
            onClick={fitView}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              pctMode ? 'text-secondary hover:bg-card-hover' : 'bg-amber-500 text-black'
            }`}
          >
            <Maximize size={10} className="inline mr-0.5 -mt-px" /> Ajustar
          </button>
          <button
            type="button"
            onClick={() => zoomScaled(1.25)}
            aria-label="Ampliar"
            className="p-1 rounded-md text-secondary hover:bg-card-hover transition-colors"
          >
            <Plus size={13} />
          </button>
          <span className="w-8 text-right text-[10px] text-muted tabular-nums">{displayPct}%</span>
        </div>

        {showSafeZones && (
          <SafeZoneControls settings={safeZones} onChange={handleSafeZonesChange} width={compW} height={compH} />
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
        <span className="text-[11px] text-muted font-mono ml-auto shrink-0" title={`Export: ${width}×${height}`}>
          {displayW}×{displayH} · {displayPct}%
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
