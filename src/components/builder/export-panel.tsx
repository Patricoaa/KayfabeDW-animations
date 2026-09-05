'use client';

import {useState, useRef, useCallback} from 'react';
import type {RefObject} from 'react';
import {Download, FileDown, Image, Film, Loader2, CheckCircle2, XCircle} from 'lucide-react';
import type {ChartConfig} from '@/lib/chart-config';
import {downloadChartSvg, downloadChartPng, downloadChartJpg, sanitizeFilename} from '@/lib/export-static';
import {useToast} from '@/components/ui/toast';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';
import {EXPORT_PRESETS, getExportPreset} from '@/lib/export-presets';
import type {ExportPresetId} from '@/lib/export-presets';

type StaticFormat = 'png' | 'jpg' | 'svg';
type AnimatedFormat = 'mp4' | 'gif';
type RenderState =
  | {status: 'idle'}
  | {status: 'rendering'; phase: string; progress: number}
  | {status: 'done'; url: string; size: number}
  | {status: 'error'; message: string};

type ExportPanelProps = {
  outputMode: 'static' | 'animated';
  // Static
  staticExportRef?: RefObject<HTMLDivElement | null>;
  filteredData: Record<string, unknown>[];
  chartConfig: ChartConfig;
  vizName: string;
  // Animated
  templateId?: string | null;
  duration: number;
  onDurationChange: (d: number) => void;
  remotionProps?: Record<string, unknown> | null;
  // Size / preset (controlled from the builder so preview + export stay in sync)
  presetId: ExportPresetId;
  onPresetChange: (id: ExportPresetId) => void;
  customSize: {width: number; height: number};
  onCustomSizeChange: (s: {width: number; height: number}) => void;
};

export function ExportPanel({
  outputMode,
  staticExportRef,
  filteredData,
  chartConfig,
  vizName,
  templateId,
  duration,
  onDurationChange,
  remotionProps,
  presetId,
  onPresetChange,
  customSize,
  onCustomSizeChange,
}: ExportPanelProps) {
  const {addToast} = useToast();

  // Static state
  const [staticFormat, setStaticFormat] = useState<StaticFormat>('png');
  const [staticScale, setStaticScale] = useState(2);
  const [staticExporting, setStaticExporting] = useState(false);

  // Animated state
  const [animatedFormat, setAnimatedFormat] = useState<AnimatedFormat>('mp4');
  const [renderState, setRenderState] = useState<RenderState>({status: 'idle'});
  const abortRef = useRef<AbortController | null>(null);

  const entry = templateId ? TEMPLATES[templateId as TemplateId] : null;
  const fps = entry?.meta.fps ?? 30;
  const compositionId = entry?.meta.componentId ?? templateId;

  const canvasWidth = chartConfig.width ?? 600;
  const canvasHeight = chartConfig.height ?? 380;

  const preset = getExportPreset(presetId);
  // Resolve the effective export size for the animated preset.
  const exportSize: {width: number; height: number} =
    presetId === 'custom'
      ? {width: customSize.width, height: customSize.height}
      : {width: preset.width, height: preset.height};

  // Static export
  const handleStaticExport = useCallback(async () => {
    if (!staticExportRef?.current || filteredData.length === 0) return;
    const filename = sanitizeFilename(vizName);
    setStaticExporting(true);
    try {
      let ok = false;
      if (staticFormat === 'svg') {
        ok = downloadChartSvg(staticExportRef.current, filename);
      } else if (staticFormat === 'png') {
        ok = await downloadChartPng(staticExportRef.current, filename, staticScale);
      } else {
        ok = await downloadChartJpg(staticExportRef.current, filename, staticScale);
      }
      if (ok) {
        addToast(`Gráfico exportado (${staticFormat.toUpperCase()})`, 'success');
      } else {
        addToast('No se encontró el gráfico para exportar', 'error');
      }
    } catch (e) {
      addToast(`Error al exportar: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setStaticExporting(false);
    }
  }, [staticFormat, staticScale, staticExportRef, filteredData, vizName, addToast]);

  // Animated export
  const handleAnimatedExport = useCallback(async () => {
    if (!remotionProps || !compositionId) return;
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
          format: animatedFormat,
          width: exportSize.width,
          height: exportSize.height,
          fps,
        }),
        signal: controller.signal,
      });
      const result = await res.json();
      if (result.type === 'done') {
        setRenderState({status: 'done', url: result.url, size: result.size});
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
          // Non-fatal
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
  }, [remotionProps, compositionId, duration, fps, animatedFormat, templateId, exportSize]);

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-secondary font-display">Formato de salida</h3>
        <p className="text-[11px] text-muted mt-0.5">
          {outputMode === 'static'
            ? 'Elegí el formato y resolución para descargar tu gráfico.'
            : 'Configurá la animación y exportá tu video.'}
        </p>
      </div>

      {outputMode === 'static' ? (
        <>
          {/* Canvas size info */}
          <div className="p-3 bg-elevated rounded-lg">
            <div className="text-[10px] text-muted uppercase tracking-wider mb-1 font-display">Dimensiones del canvas</div>
            <div className="text-sm text-secondary font-mono">
              {canvasWidth} × {canvasHeight} px
            </div>
            <div className="text-[10px] text-muted mt-1">
              Resultado: {canvasWidth * staticScale} × {canvasHeight * staticScale} px
            </div>
          </div>

          {/* Format selector */}
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2 block font-display">
              Formato
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(['png', 'jpg', 'svg'] as StaticFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setStaticFormat(fmt)}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                    staticFormat === fmt
                      ? 'bg-amber-500 text-black'
                      : 'bg-elevated text-secondary hover:bg-card-hover'
                  }`}
                >
                  {fmt === 'svg' ? <FileDown size={12} /> : <Image size={12} />}
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution selector (not for SVG) */}
          {staticFormat !== 'svg' && (
            <div>
              <label className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2 block font-display">
                Resolución
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  {scale: 1, label: '1x', desc: 'Original'},
                  {scale: 2, label: '2x', desc: 'Retina'},
                  {scale: 3, label: '3x', desc: 'HD'},
                ].map((opt) => (
                  <button
                    key={opt.scale}
                    onClick={() => setStaticScale(opt.scale)}
                    className={`px-2 py-2 rounded-lg text-xs font-semibold transition-colors flex flex-col items-center gap-0.5 ${
                      staticScale === opt.scale
                        ? 'bg-amber-500 text-black'
                        : 'bg-elevated text-secondary hover:bg-card-hover'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="text-[9px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Download button */}
          <button
            onClick={handleStaticExport}
            disabled={staticExporting || filteredData.length === 0}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-elevated disabled:text-muted text-black font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 font-display"
          >
            {staticExporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {staticExporting ? 'Exportando...' : `Descargar ${staticFormat.toUpperCase()}`}
          </button>

          {filteredData.length === 0 && (
            <p className="text-[10px] text-muted text-center">Cargá datos en el canvas para exportar</p>
          )}
        </>
      ) : (
        <>
          {/* Duration */}
          <div>
            <label htmlFor="export-duration" className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2 block font-display">
              Duración
            </label>
            <div className="flex items-center gap-3">
              <input
                id="export-duration"
                type="range"
                min={1}
                max={20}
                value={duration}
                onChange={(e) => onDurationChange(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="text-sm text-secondary w-20 text-right font-mono">
                {duration}s ({duration * fps} frames)
              </span>
            </div>
          </div>

          {/* Format selector */}
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2 block font-display">
              Formato
            </label>
            <div className="grid grid-cols-2 gap-1">
              {(['mp4', 'gif'] as AnimatedFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setAnimatedFormat(fmt)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    animatedFormat === fmt
                      ? 'bg-amber-500 text-black'
                      : 'bg-elevated text-secondary hover:bg-card-hover'
                  }`}
                >
                  <Film size={14} />
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Preset selector */}
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2 block font-display">
              Tamaño / preset
            </label>
            <div className="grid grid-cols-2 gap-1">
              {EXPORT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPresetChange(p.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex flex-col items-start gap-0.5 ${
                    presetId === p.id
                      ? 'bg-amber-500 text-black'
                      : 'bg-elevated text-secondary hover:bg-card-hover'
                  }`}
                  title={`${p.width} × ${p.height}`}
                >
                  <span>{p.label}</span>
                  <span className={`text-[9px] ${presetId === p.id ? 'opacity-80' : 'opacity-60'}`}>
                    {p.hint} · {p.width}×{p.height}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {presetId === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={128}
                max={3840}
                value={customSize.width}
                onChange={(e) => onCustomSizeChange({...customSize, width: Number(e.target.value)})}
                className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm text-secondary font-mono"
                aria-label="Ancho personalizado"
                placeholder="Ancho"
              />
              <span className="text-muted">×</span>
              <input
                type="number"
                min={128}
                max={3840}
                value={customSize.height}
                onChange={(e) => onCustomSizeChange({...customSize, height: Number(e.target.value)})}
                className="w-full bg-elevated border border-border-default rounded-lg px-3 py-2 text-sm text-secondary font-mono"
                aria-label="Alto personalizado"
                placeholder="Alto"
              />
            </div>
          )}

          {/* Render progress */}
          {renderState.status === 'rendering' && (
            <div className="space-y-2">
              <div className="text-xs text-secondary">{renderState.phase}</div>
              <div className="w-full bg-border-subtle rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                  style={{width: `${renderState.progress * 100}%`}}
                />
              </div>
              <button
                onClick={handleCancel}
                className="w-full px-3 py-1.5 bg-card-hover hover:bg-border-default rounded text-secondary text-xs transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Render done */}
          {renderState.status === 'done' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-emerald-500">
                <CheckCircle2 size={14} />
                Listo ({(renderState.size / 1024 / 1024).toFixed(1)} MB)
              </div>
              <a
                href={renderState.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 font-display"
              >
                <Download size={14} />
                Descargar {animatedFormat.toUpperCase()}
              </a>
              <button
                onClick={() => setRenderState({status: 'idle'})}
                className="w-full px-3 py-1.5 bg-card-hover hover:bg-border-default rounded text-secondary text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Render error */}
          {renderState.status === 'error' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-red-500">
                <XCircle size={14} />
                {renderState.message}
              </div>
              <button
                onClick={() => setRenderState({status: 'idle'})}
                className="w-full px-3 py-1.5 bg-card-hover hover:bg-border-default rounded text-secondary text-xs transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Export button (idle state) */}
          {renderState.status === 'idle' && (
            <button
              onClick={handleAnimatedExport}
              disabled={!remotionProps}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-elevated disabled:text-muted text-black font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 font-display"
            >
              <Film size={14} />
              Exportar {animatedFormat.toUpperCase()}
            </button>
          )}

          {!remotionProps && (
            <p className="text-[10px] text-muted text-center">
              Seleccioná un template y configurá los datos para exportar
            </p>
          )}
        </>
      )}
    </div>
  );
}
