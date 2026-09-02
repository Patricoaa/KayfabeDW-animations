'use client';

import {useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject, type ReactNode} from 'react';
import {Minus, Plus, Maximize} from 'lucide-react';
import {InteractionLayer} from './interaction-layer';
import type {ChartConfig} from '@/lib/chart-config';

const MIN_S = 0.25;
const MAX_S = 3;
const PAD = 40;

/**
 * Zoomable viewport for the static chart preview. The chart is scaled around
 * its own center, so the visualization always stays centered in the viewport
 * regardless of the zoom level. Applies a CSS transform only, so the inner SVG
 * keeps its natural size (export reads user-space geometry and stays
 * untouched). Wheel zooms keeping the center pinned; the toolbar offers −/+,
 * a 25–300% slider, "100%" and "Ajustar". Default scale is "fit".
 */
export default function CanvasZoom({
  children,
  contentWidth,
  contentHeight,
  editMode,
  svgRef,
  config,
  onConfigChange,
  activeElement,
  onSelectElement,
}: {
  children: ReactNode;
  contentWidth?: number;
  contentHeight?: number;
  editMode?: boolean;
  svgRef?: RefObject<SVGSVGElement | null>;
  config?: ChartConfig;
  onConfigChange?: (patch: Partial<ChartConfig>) => void;
  activeElement?: string | null;
  onSelectElement?: (id: string | null) => void;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [fitMode, setFitMode] = useState(true);
  const [scale, setScale] = useState(1);
  const [w, setW] = useState(contentWidth ?? 0);
  const [h, setH] = useState(contentHeight ?? 0);

  useLayoutEffect(() => {
    if (w && h) return;
    const stage = stageRef.current?.firstElementChild;
    if (stage instanceof HTMLElement && stage.offsetWidth && stage.offsetHeight) {
      setW(stage.offsetWidth);
      setH(stage.offsetHeight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computeFit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || !w || !h) return;
    const availW = Math.max(80, vp.clientWidth - PAD * 2);
    const availH = Math.max(80, vp.clientHeight - PAD * 2);
    setScale(Math.max(0.1, Math.min(1, availW / w, availH / h)));
  }, [w, h]);

  useEffect(() => {
    if (fitMode) computeFit();
  }, [fitMode, computeFit]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const obs = new ResizeObserver(() => {
      if (fitMode) computeFit();
    });
    obs.observe(vp);
    return () => obs.disconnect();
  }, [computeFit, fitMode]);

  // Scale around the chart center: exits "fit" and pins the center.
  const zoomScaled = useCallback((factor: number) => {
    setFitMode(false);
    setScale((prev) => Math.min(MAX_S, Math.max(MIN_S, prev * factor)));
  }, []);

  const zoomAbsolute = useCallback((next: number) => {
    setFitMode(false);
    setScale(Math.min(MAX_S, Math.max(MIN_S, next)));
  }, []);

  const fitToViewport = useCallback(() => {
    setFitMode(true);
  }, []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0016);
      zoomScaled(factor);
    };
    vp.addEventListener('wheel', onWheel, {passive: false});
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoomScaled]);

  const pct = Math.round(scale * 100);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div ref={viewportRef} className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            ref={stageRef}
            className="relative shrink-0"
            style={{width: w || '100%', height: h || '100%'}}
          >
            {editMode && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{border: '1px dashed #cbd5e1', borderRadius: 2, zIndex: 5}}
              >
                <span className="absolute bottom-0.5 right-1 text-[9px] text-slate-400 pointer-events-none select-none">
                  {w && h ? `${w} × ${h}` : ''}
                </span>
              </div>
            )}
            <div
              className="h-full relative"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center center',
              }}
            >
              <div ref={(el) => {
                if (!svgRef) return;
                const svg = el?.querySelector('svg') as SVGSVGElement | null;
                Object.assign(svgRef, {current: svg});
              }} className="h-full">
                {children}
              </div>
              {editMode && svgRef && config && onConfigChange && onSelectElement && (
                <InteractionLayer
                  svgRef={svgRef}
                  config={config}
                  onConfigChange={onConfigChange}
                  activeElement={activeElement ?? null}
                  onSelectElement={onSelectElement}
                  hiddenElements={config.hiddenElements}
                  lockedElements={config.lockedElements}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-border-default bg-card shrink-0">
        <button
          type="button"
          onClick={() => zoomScaled(1 / 1.25)}
          aria-label="Reducir"
          className="p-1.5 rounded-md text-secondary hover:bg-card-hover transition-colors"
        >
          <Minus size={14} />
        </button>
        <input
          type="range"
          min={MIN_S * 100}
          max={MAX_S * 100}
          value={pct}
          onChange={(e) => zoomAbsolute(Number(e.target.value) / 100)}
          className="w-32 accent-amber-500"
          aria-label="Zoom"
        />
        <button
          type="button"
          onClick={() => zoomAbsolute(1)}
          className="px-2 py-1 rounded-md text-xs font-medium text-secondary hover:bg-card-hover transition-colors"
        >
          100%
        </button>
        <button
          type="button"
          onClick={fitToViewport}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
            fitMode ? 'bg-amber-500 text-black' : 'text-secondary hover:bg-card-hover'
          }`}
        >
          <Maximize size={12} /> Ajustar
        </button>
        <button
          type="button"
          onClick={() => zoomScaled(1.25)}
          aria-label="Ampliar"
          className="p-1.5 rounded-md text-secondary hover:bg-card-hover transition-colors"
        >
          <Plus size={14} />
        </button>
        <span className="ml-1 text-[10px] text-muted tabular-nums w-9 text-right">{pct}%</span>
      </div>
    </div>
  );
}