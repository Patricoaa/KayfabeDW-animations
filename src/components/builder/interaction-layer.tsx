'use client';

import {useEffect, useLayoutEffect, useRef, useState, useCallback, type RefObject, type PointerEvent as ReactPointerEvent} from 'react';
import type {ChartConfig} from '@/lib/chart-config';
import {computeMove} from './element-handlers';

export type InteractionLayerProps = {
  svgRef: RefObject<SVGSVGElement | null>;
  config: ChartConfig;
  onConfigChange: (patch: Partial<ChartConfig>) => void;
  activeElement: string | null;
  onSelectElement: (id: string | null) => void;
  hiddenElements?: string[];
  lockedElements?: string[];
};

type BBox = {x: number; y: number; w: number; h: number};
type SnapGuide = {type: 'h' | 'v'; pos: number};

function viewBoxOf(svg: SVGSVGElement): {w: number; h: number} {
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const parts = vb.split(/\s+/).map(Number);
    if (parts.length === 4) return {w: parts[2], h: parts[3]};
  }
  return {w: 600, h: 380};
}

function toSvgCoords(svg: SVGSVGElement, clientX: number, clientY: number): {x: number; y: number} {
  const rect = svg.getBoundingClientRect();
  const {w, h} = viewBoxOf(svg);
  return {
    x: ((clientX - rect.left) / rect.width) * w,
    y: ((clientY - rect.top) / rect.height) * h,
  };
}

function getEditableBBox(svg: SVGSVGElement, id: string): BBox | null {
  const el = svg.querySelector(`[data-editable="${id}"]`) as SVGElement | null;
  if (!el) return null;
  try {
    const vb = viewBoxOf(svg);
    const svgRect = svg.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const sx = vb.w / svgRect.width;
    const sy = vb.h / svgRect.height;
    return {
      x: (elRect.left - svgRect.left) * sx,
      y: (elRect.top - svgRect.top) * sy,
      w: elRect.width * sx,
      h: elRect.height * sy,
    };
  } catch {
    return null;
  }
}

function getBBoxForElement(svg: SVGSVGElement, id: string, config: ChartConfig): BBox | null {
  const w = config.width ?? 600;
  const h = config.height ?? 380;
  const vb = viewBoxOf(svg);
  const sx = vb.w / w;
  const sy = vb.h / h;

  if (id === 'title') {
    const o = config.titleOffset ?? {x: 0, y: 0};
    const textSize = config.headerFont?.size ?? config.style?.titleFontSize ?? 20;
    return {x: w / 2 - textSize * 3 + (o.x ?? 0) * sx, y: 12 + (o.y ?? 0) * sy, w: textSize * 6, h: textSize * 1.3};
  }
  if (id === 'subtitle') {
    const o = config.subtitleOffset ?? {x: 0, y: 0};
    const textSize = config.subtitleFont?.size ?? 12;
    return {x: w / 2 - textSize * 4 + (o.x ?? 0) * sx, y: 16 + (config.title ? textSize * 1.8 : 0) + (o.y ?? 0) * sy, w: textSize * 8, h: textSize * 1.3};
  }
  if (id === 'legend') {
    const textSize = 11;
    const nItems = config.seriesField ? 3 : 1;
    return {x: w / 2 - textSize * 2 * nItems, y: h - textSize * 3, w: textSize * 4 * nItems, h: textSize * 2};
  }
  if (id === 'xLabel') {
    const o = config.xLabelOffset ?? {x: 0, y: 0};
    return {x: w / 4, y: h - 18 + (o.y ?? 0) * sy, w: w / 2, h: 14};
  }
  if (id === 'yLabel') {
    const o = config.yLabelOffset ?? {x: 0, y: 0};
    return {x: 2 + (o.x ?? 0) * sx, y: h / 4, w: 14, h: h / 2};
  }
  return getEditableBBox(svg, id);
}

function svgPathForBBox(b: BBox, radius = 4): string {
  const r = Math.min(radius, b.w / 2, b.h / 2);
  return `M${b.x + r},${b.y} L${b.x + b.w - r},${b.y} Q${b.x + b.w},${b.y} ${b.x + b.w},${b.y + r} L${b.x + b.w},${b.y + b.h - r} Q${b.x + b.w},${b.y + b.h} ${b.x + b.w - r},${b.y + b.h} L${b.x + r},${b.y + b.h} Q${b.x},${b.y + b.h} ${b.x},${b.y + b.h - r} L${b.x},${b.y + r} Q${b.x},${b.y} ${b.x + r},${b.y}Z`;
}

const ALL_IDS = ['title', 'subtitle', 'legend', 'xLabel', 'yLabel'];

function findSnapGuides(svg: SVGSVGElement, elementId: string, bbox: BBox, config: ChartConfig): SnapGuide[] {
  const w = config.width ?? 600;
  const h = config.height ?? 380;
  const cx = w / 2;
  const cy = h / 2;
  const guides: SnapGuide[] = [];
  const threshold = 5;
  const elCx = bbox.x + bbox.w / 2;
  const elCy = bbox.y + bbox.h / 2;
  if (Math.abs(elCx - cx) < threshold) guides.push({type: 'v', pos: cx});
  if (Math.abs(elCy - cy) < threshold) guides.push({type: 'h', pos: cy});
  return guides;
}

export function InteractionLayer({
  svgRef,
  config,
  onConfigChange,
  activeElement,
  onSelectElement,
  hiddenElements = [],
  lockedElements = [],
}: InteractionLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selBBox, setSelBBox] = useState<BBox | null>(null);
  const [hoverElement, setHoverElement] = useState<string | null>(null);
  const [hoverBBox, setHoverBBox] = useState<BBox | null>(null);
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [editingText, setEditingText] = useState<{elementId: string; currentValue: string; x: number; y: number; fontSize: number} | null>(null);
  const [editingColor, setEditingColor] = useState<{elementId: string; currentColor: string; x: number; y: number} | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{x: number; y: number} | null>(null);

  const dragRef = useRef<{elementId: string; startSvg: {x: number; y: number}; startConfig: Partial<ChartConfig>} | null>(null);
  const isDragging = useRef(false);

  const isLocked = useCallback((id: string) => lockedElements.includes(id), [lockedElements]);
  const isHidden = useCallback((id: string) => hiddenElements.includes(id), [hiddenElements]);

  const getBBox = useCallback((id: string) => {
    const svg = svgRef.current;
    if (!svg) return null;
    return getBBoxForElement(svg, id, config);
  }, [svgRef, config]);

  const updateSelectionBBox = useCallback(() => {
    if (!activeElement) { setSelBBox(null); return; }
    const b = getBBox(activeElement);
    setSelBBox(b);
    if (b) setToolbarPos({x: b.x + b.w + 10, y: b.y});
  }, [activeElement, getBBox]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useLayoutEffect(() => { updateSelectionBBox(); }, [updateSelectionBBox, config]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const obs = new MutationObserver(updateSelectionBBox);
    obs.observe(svg, {attributes: true, childList: true, subtree: true});
    return () => obs.disconnect();
  }, [svgRef, updateSelectionBBox]);

  const findElement = useCallback((target: EventTarget | null): string | null => {
    const svg = svgRef.current;
    if (!svg || !(target instanceof Element)) return null;
    let el: Element | null = target;
    while (el && el !== svg) {
      const id = el.getAttribute?.('data-editable');
      if (id && !id.match(/^dataLabel$/) && !isHidden(id)) return id;
      el = el.parentElement;
    }
    return null;
  }, [svgRef, isHidden]);

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (editingText || editingColor) return;
    const svg = svgRef.current;
    if (!svg) return;

    const target = document.elementFromPoint(e.clientX, e.clientY);
    const elementId = findElement(target);
    if (!elementId) { onSelectElement(null); return; }
    if (isLocked(elementId)) { onSelectElement(elementId); return; }

    onSelectElement(elementId);
    const svgPt = toSvgCoords(svg, e.clientX, e.clientY);
    dragRef.current = {elementId, startSvg: svgPt, startConfig: {}};
    isDragging.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [svgRef, findElement, onSelectElement, isLocked, editingText, editingColor]);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    if (!dragRef.current) {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const el = findElement(target);
      setHoverElement(el);
      if (el && el !== activeElement) {
        const b = getBBox(el);
        setHoverBBox(b);
      } else {
        setHoverBBox(null);
      }
      return;
    }

    isDragging.current = true;
    const {elementId, startSvg} = dragRef.current;
    const current = toSvgCoords(svg, e.clientX, e.clientY);
    const rawDx = current.x - startSvg.x;
    const rawDy = current.y - startSvg.y;

    const bbox = getBBox(elementId);
    const snapped = bbox ? findSnapGuides(svg, elementId, {...bbox, x: bbox.x + rawDx, y: bbox.y + rawDy}, config) : [];
    setGuides(snapped);

    let dx = rawDx;
    let dy = rawDy;
    if (bbox) {
      const w = config.width ?? 600;
      const h = config.height ?? 380;
      const cx = w / 2;
      if (snapped.some((g) => g.type === 'v')) dx = cx - (bbox.x + bbox.w / 2);
      const cy = h / 2;
      if (snapped.some((g) => g.type === 'h')) dy = cy - (bbox.y + bbox.h / 2);
    }

    const result = computeMove(elementId, config, dx, dy);
    if (result) onConfigChange(result);
  }, [svgRef, findElement, getBBox, config, onConfigChange, activeElement]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    isDragging.current = false;
    setGuides([]);
  }, []);

  const handleDoubleClick = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const elementId = findElement(target);
    if (!elementId) return;

    if (elementId === 'title' || elementId === 'subtitle') {
      const currentVal = elementId === 'title' ? (config.title ?? '') : (config.subtitle ?? '');
      const textSize = elementId === 'title' ? (config.headerFont?.size ?? 20) : (config.subtitleFont?.size ?? 12);
      const bbox = getBBox(elementId);
      if (!bbox) return;
      const svgRect = svg.getBoundingClientRect();
      const vb = viewBoxOf(svg);
      const sx = svgRect.width / vb.w;
      const sy = svgRect.height / vb.h;
      setEditingText({elementId, currentValue: currentVal, x: bbox.x * sx + svgRect.left, y: bbox.y * sy + svgRect.top, fontSize: textSize});
    } else if (elementId === 'legend') {
      const bbox = getBBox('legend');
      if (!bbox) return;
      const svgRect = svg.getBoundingClientRect();
      const vb = viewBoxOf(svg);
      const sx = svgRect.width / vb.w;
      const sy = svgRect.height / vb.h;
      setEditingColor({elementId: 'legend', currentColor: config.colors?.[0] ?? '#6366f1', x: (bbox.x + bbox.w) * sx + svgRect.left + 8, y: bbox.y * sy + svgRect.top});
    }
  }, [svgRef, findElement, config, getBBox]);

  useEffect(() => {
    if (!activeElement) return;
    const handler = (e: KeyboardEvent) => {
      if (editingText || editingColor) {
        if (e.key === 'Escape') { setEditingText(null); setEditingColor(null); }
        return;
      }
      if (e.key === 'Escape') { onSelectElement(null); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onConfigChange({hiddenElements: [...(config.hiddenElements ?? []), activeElement]});
        onSelectElement(null);
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const visible = ALL_IDS.filter((id) => !isHidden(id));
        const idx = visible.indexOf(activeElement);
        const next = e.shiftKey
          ? visible[(idx - 1 + visible.length) % visible.length]
          : visible[(idx + 1) % visible.length];
        onSelectElement(next);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeElement, config, onConfigChange, onSelectElement, editingText, editingColor, isHidden]);

  const getToolbarItems = useCallback((id: string) => {
    if (id === 'title') {
      return {hasFontSize: true, fontSize: config.headerFont?.size ?? 20, hasColor: true, color: config.headerFont?.color ?? '#111', hasBold: false};
    }
    if (id === 'subtitle') {
      return {hasFontSize: true, fontSize: config.subtitleFont?.size ?? 12, hasColor: true, color: config.subtitleFont?.color ?? '#666', hasBold: true, bold: (config.subtitleFont?.weight ?? 400) === 700};
    }
    if (id === 'legend') return {hasFontSize: false, hasColor: true, color: config.legendFont?.color ?? '#333', hasBold: false};
    if (id === 'xLabel' || id === 'yLabel') return {hasFontSize: true, fontSize: config.xLabelFont?.size ?? 11, hasColor: true, color: config.xLabelFont?.color ?? '#666', hasBold: false};
    return {hasFontSize: false, hasColor: false, hasBold: false};
  }, [config]);

  const visibleIds = ALL_IDS.filter((id) => !isHidden(id));

  const handleTextEdit = useCallback((val: string) => {
    if (!editingText) return;
    const patch: Record<string, unknown> = {};
    patch[editingText.elementId === 'title' ? 'title' : 'subtitle'] = val;
    onConfigChange(patch as Partial<ChartConfig>);
  }, [editingText, onConfigChange]);

  const handleTextEditDone = useCallback(() => setEditingText(null), []);

  const pathFontKey = (id: string): 'headerFont' | 'subtitleFont' | 'xLabelFont' | 'yLabelFont' | 'legendFont' | null =>
    id === 'title' ? 'headerFont' : id === 'subtitle' ? 'subtitleFont' : id === 'xLabel' ? 'xLabelFont' : id === 'yLabel' ? 'yLabelFont' : id === 'legend' ? 'legendFont' : null;

  const fontOf = (config: ChartConfig, key: 'headerFont' | 'subtitleFont' | 'xLabelFont' | 'yLabelFont' | 'legendFont'): Record<string, unknown> => {
    return {...(config[key] ?? {})} as Record<string, unknown>;
  };

  const handleColorChange = useCallback((color: string) => {
    if (!activeElement) return;
    const key = pathFontKey(activeElement);
    if (!key) return;
    onConfigChange({[key]: {...fontOf(config, key), color}} as Partial<ChartConfig>);
  }, [activeElement, config, onConfigChange]);

  const handleBoldToggle = useCallback(() => {
    if (activeElement !== 'subtitle') return;
    const key = pathFontKey(activeElement);
    if (!key) return;
    const current = fontOf(config, key);
    onConfigChange({[key]: {...current, weight: (current.weight ?? 400) === 700 ? 400 : 700}} as Partial<ChartConfig>);
  }, [activeElement, config, onConfigChange]);

  const handleFontSizeChange = useCallback((size: number) => {
    if (!activeElement) return;
    const key = pathFontKey(activeElement);
    if (!key) return;
    onConfigChange({[key]: {...fontOf(config, key), size}} as Partial<ChartConfig>);
  }, [activeElement, config, onConfigChange]);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{cursor: editingText || editingColor ? 'auto' : hoverElement ? 'grab' : 'default'}} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onDoubleClick={handleDoubleClick}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        {guides.map((g, i) => (
          g.type === 'v'
            ? <line key={i} x1={`${(g.pos / (config.width ?? 600)) * 100}%`} y1="0" x2={`${(g.pos / (config.width ?? 600)) * 100}%`} y2="100%" stroke="#6366f1" strokeWidth={1} strokeDasharray="4 3" />
            : <line key={i} x1="0" y1={`${(g.pos / (config.height ?? 380)) * 100}%`} x2="100%" y2={`${(g.pos / (config.height ?? 380)) * 100}%`} stroke="#6366f1" strokeWidth={1} strokeDasharray="4 3" />
        ))}
        {activeElement && selBBox && !isLocked(activeElement) && (
          <>
            <path d={svgPathForBBox(selBBox)} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="6 3" />
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => {
              const cx = corner.includes('r') ? selBBox.x + selBBox.w : selBBox.x;
              const cy = corner.includes('b') ? selBBox.y + selBBox.h : selBBox.y;
              return <rect key={corner} x={cx - 3.5} y={cy - 3.5} width={7} height={7} fill="white" stroke="#3b82f6" strokeWidth={1.5} rx={1} />;
            })}
          </>
        )}
        {hoverElement && hoverElement !== activeElement && !isLocked(hoverElement) && hoverBBox && (
          <path d={svgPathForBBox(hoverBBox, 3)} fill="rgba(59,130,246,0.04)" stroke="#93c5fd" strokeWidth={1} strokeDasharray="4 3" />
        )}
      </svg>

      {activeElement && !isLocked(activeElement) && !editingText && !editingColor && (() => {
        const items = getToolbarItems(activeElement);
        const pos = toolbarPos ?? {x: 300, y: 40};
        return (
          <div className="absolute z-50 flex items-center gap-1 px-2 py-1.5 bg-surface border border-border rounded-lg shadow-lg pointer-events-auto" style={{left: pos.x, top: pos.y}}>
            {items.hasFontSize && (
              <input type="number" min={6} max={72} value={items.fontSize} onChange={(e) => handleFontSizeChange(Number(e.target.value))} className="w-12 px-1 py-0.5 text-xs text-center border border-border rounded bg-surface text-fg" />
            )}
            {items.hasColor && (
              <label className="flex items-center gap-1 cursor-pointer" title="Color">
                <input type="color" value={items.color} onChange={(e) => handleColorChange(e.target.value)} className="w-5 h-5 rounded border border-border cursor-pointer" />
              </label>
            )}
            {items.hasBold && (
              <button type="button" onClick={handleBoldToggle} className={`px-1.5 py-0.5 text-xs rounded border border-border transition-colors ${items.bold ? 'bg-accent/10 text-accent' : 'text-muted hover:text-fg'}`} title="Negrita">B</button>
            )}
          </div>
        );
      })()}

      {editingText && (
        <EditingText value={editingText.currentValue} x={editingText.x} y={editingText.y} fontSize={editingText.fontSize} onChange={handleTextEdit} onDone={handleTextEditDone} />
      )}
      {editingColor && (
        <EditingColor value={editingColor.currentColor} x={editingColor.x} y={editingColor.y} onChange={handleColorChange} onDone={() => setEditingColor(null)} />
      )}

      <div className="absolute top-1 right-1 flex gap-1 pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
        {visibleIds.map((id) => (
          <button key={id} type="button" onClick={() => onSelectElement(id)} className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${activeElement === id ? 'bg-accent text-white border-accent' : 'bg-surface text-muted border-border hover:text-fg'}`} title={id === 'title' ? 'Título' : id === 'subtitle' ? 'Subtítulo' : id === 'legend' ? 'Leyenda' : id === 'xLabel' ? 'Eje X' : 'Eje Y'}>
            {id === 'title' ? '📌' : id === 'subtitle' ? '📝' : id === 'legend' ? '📋' : '➖'}
          </button>
        ))}
      </div>
    </div>
  );
}

function EditingText({value, x, y, fontSize, onChange, onDone}: {value: string; x: number; y: number; fontSize: number; onChange: (v: string) => void; onDone: () => void}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      type="text"
      defaultValue={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => { if (e.key === 'Enter') onDone(); if (e.key === 'Escape') onDone(); }}
      className="fixed z-[9999] bg-white text-black border-2 border-blue-500 rounded px-1 outline-none"
      style={{left: x, top: y, fontSize: Math.max(12, fontSize * 0.9), lineHeight: '1.3', minWidth: 80}}
    />
  );
}

function EditingColor({value, x, y, onChange, onDone}: {value: string; x: number; y: number; onChange: (c: string) => void; onDone: () => void}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.click(); }, []);
  return (
    <input
      ref={ref}
      type="color"
      defaultValue={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      className="fixed z-[9999] w-8 h-8 cursor-pointer"
      style={{left: x, top: y}}
    />
  );
}
