import {useCallback, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';

export type ResizableEdge = 'left' | 'right';

type UseResizableWidthOptions = {
  min?: number;
  max?: number;
  edge?: ResizableEdge;
};

export function useResizableWidth(defaultWidth: number, opts?: UseResizableWidthOptions) {
  const {min = 320, max = 640, edge = 'left'} = opts ?? {};
  const [width, setWidth] = useState(defaultWidth);
  const drag = useRef<{startX: number; startWidth: number} | null>(null);
  const raf = useRef<number | null>(null);

  const onMove = useCallback((e: PointerEvent) => {
    if (!drag.current) return;
    const {startX, startWidth} = drag.current;
    const delta = edge === 'left' ? startX - e.clientX : e.clientX - startX;
    const next = Math.round(Math.min(max, Math.max(min, startWidth + delta)));
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setWidth(next));
  }, [edge, min, max]);

  const stop = useCallback(() => {
    drag.current = null;
    document.body.style.cursor = '';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }, [onMove]);

  const onUp = useCallback(() => stop(), [stop]);

  const onHandlePointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    drag.current = {startX: e.clientX, startWidth: width};
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [onMove, onUp, width]);

  return {width, setWidth, onHandlePointerDown};
}