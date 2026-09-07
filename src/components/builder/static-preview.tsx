'use client';

import type {RefObject} from 'react';
import type {ChartConfig} from '@/lib/chart-config';
import {STATIC_SIZE_PRESETS, staticSizeKey} from '@/lib/static-sizes';
import type {SafeZoneSettings} from '@/lib/safe-zones';
import {ChartPreview} from '@/components/charts/chart-preview';
import CanvasZoom from '@/components/builder/static-canvas';
import {SafeZoneOverlay} from '@/components/builder/safe-zone-overlay';
import {SafeZoneControls} from '@/components/builder/safe-zone-controls';

type StaticPreviewProps = {
  data: Record<string, unknown>[];
  config: ChartConfig;
  // The exported subtree (read by export-static). Safe-zone layers are rendered
  // outside of it so they can never reach a downloaded file.
  exportRef: RefObject<HTMLDivElement | null>;
  safeZones: SafeZoneSettings;
  onSafeZonesChange: (s: SafeZoneSettings) => void;
  onCanvasSizeChange: (width: number, height: number) => void;
};

export function StaticPreview({
  data,
  config,
  exportRef,
  safeZones,
  onSafeZonesChange,
  onCanvasSizeChange,
}: StaticPreviewProps) {
  const canvasW = config.width ?? 600;
  const canvasH = config.height ?? 380;
  const sizeKey = staticSizeKey(canvasW, canvasH);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <CanvasZoom
        contentWidth={canvasW}
        contentHeight={canvasH}
        overlay={
          <SafeZoneOverlay width={canvasW} height={canvasH} scale={1} settings={safeZones} />
        }
        panel={
          <SafeZoneControls settings={safeZones} onChange={onSafeZonesChange} width={canvasW} height={canvasH} />
        }
      >
        <div ref={exportRef} className="w-full">
          {data.length === 0 ? (
            <div className="text-center text-muted text-sm font-body p-6">
              {data.length > 0
                ? 'Ninguna fila coincide con el filtro del gráfico'
                : 'Cargá datos en el canvas para ver tu gráfico'}
            </div>
          ) : (
            <ChartPreview data={data} config={config} />
          )}
        </div>
      </CanvasZoom>

      {/* Tamaño — presets de plataforma (reposicionan el lienzo; la preview y
          la exportación reaccionan porque ancho/alto viven en el config). */}
      <div className="flex items-center gap-3 px-6 py-3 border-t border-border-default bg-elevated shrink-0">
        <label className="text-xs font-medium text-secondary w-24 shrink-0 font-body">
          Tamaño
        </label>
        <div className="flex flex-wrap gap-1.5">
          {STATIC_SIZE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onCanvasSizeChange(p.width, p.height)}
              title={`${p.hint} · ${p.width}×${p.height}`}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                sizeKey === p.id
                  ? 'bg-amber-500 text-black'
                  : 'bg-card-hover text-secondary hover:bg-border-default'
              }`}
            >
              {p.label}
            </button>
          ))}
          {sizeKey === 'custom' && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-card-hover text-secondary">
              Lienzo actual · {canvasW}×{canvasH}
            </span>
          )}
        </div>
        <span className="text-[11px] text-muted font-mono ml-auto shrink-0" title="Lienzo actual">
          {canvasW}×{canvasH}
        </span>
      </div>
    </div>
  );
}