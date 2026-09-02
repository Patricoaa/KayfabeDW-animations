'use client';

import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {Minus, Plus, Maximize} from 'lucide-react';

const MIN_S = 0.25;
const MAX_S = 3;
const PAD = 40;

/**
 * Zoomable viewport for the static chart preview. Applies a CSS transform
 * around the children so the visuals scale freely, while the inner SVG keeps
 * its natural size (export reads user-space geometry, so SVG/PNG output stays
 * untouched). Wheel zooms around the pointer; the toolbar offers −/+,
 * a 25–300% slider, "100%" and "Ajustar". Default scale is "fit".
 */
export default function CanvasZoom({
  children,
  contentWidth,
  contentHeight,
}: {
  children: ReactNode;
  contentWidth?: number;
  contentHeight?: number;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [fitMode, setFitMode] = useState(true);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
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
    if (!vp) return;
    if (!w || !h || !fitMode) return;
    const availW = Math.max(80, vp.clientWidth - PAD * 2);
    const availH = Math.max(80, vp.clientHeight - PAD * 2);
    setScale(Math.max(0.1, Math.min(1, availW / w, availH / h)));
    setTx(0);
    setTy(0);
  }, [w, h, fitMode]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const obs = new ResizeObserver(computeFit);
    obs.observe(vp);
    return () => obs.disconnect();
  }, [computeFit]);

  const zoomAt = useCallback((next: number, px: number, py: number) => {
    const vp = viewportRef.current;
    const stage = stageRef.current;
    if (!vp || !stage) return;
    const s = Math.min(MAX_S, Math.max(MIN_S, next));
    const r = stage.getBoundingClientRect();
    const cx = (px - r.left - tx) / scale;
    const cy = (py - r.top - ty) / scale;
    setFitMode(false);
    setTx(px - r.left - cx * s);
    setTy(py - r.top - cy * s);
    setScale(s);
  }, [tx, ty, scale]);

  const centerZoom = useCallback((next: number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    zoomAt(next, r.left + r.width / 2, r.top + r.height / 2);
  }, [zoomAt]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0016);
      zoomAt(scale * factor, e.clientX, e.clientY);
    };
    vp.addEventListener('wheel', onWheel, {passive: false});
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoomAt, scale]);

  const fitToViewport = useCallback(() => {
    setFitMode(true);
    computeFit();
  }, [computeFit]);

  const pct = Math.round(scale * 100);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div ref={viewportRef} className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={stageRef}
            className="relative"
            style={{width: w || '100%', height: h || '100%'}}
          >
            <div
              style={{
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                transformOrigin: '0 0',
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-t border-border-default bg-card shrink-0">
        <button
          type="button"
          onClick={() => centerZoom(scale / 1.25)}
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
          onChange={(e) => centerZoom(Number(e.target.value) / 100)}
          className="w-32 accent-amber-500"
          aria-label="Zoom"
        />
        <button
          type="button"
          onClick={() => centerZoom(1)}
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
          onClick={() => centerZoom(scale * 1.25)}
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