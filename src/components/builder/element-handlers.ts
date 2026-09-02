import type {ChartConfig} from '@/lib/chart-config';

export type MoveResult = {
  titleOffset?: ChartConfig['titleOffset'];
  subtitleOffset?: ChartConfig['subtitleOffset'];
  legendOffset?: ChartConfig['legendOffset'];
  legendPosition?: ChartConfig['legendPosition'];
  xLabelOffset?: ChartConfig['xLabelOffset'];
  yLabelOffset?: ChartConfig['yLabelOffset'];
  categoryLabelPosition?: ChartConfig['categoryLabelPosition'];
};

export function computeMove(
  elementId: string,
  config: ChartConfig,
  svgDx: number,
  svgDy: number,
): MoveResult | null {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const w = config.width ?? 600;
  const h = config.height ?? 380;

  switch (elementId) {
    case 'title': {
      const base = config.titleOffset ?? {x: 0, y: 0};
      return {titleOffset: {x: clamp((base.x ?? 0) + svgDx, -w / 2, w / 2), y: clamp((base.y ?? 0) + svgDy, -h / 2, h / 2)}};
    }
    case 'subtitle': {
      const base = config.subtitleOffset ?? {x: 0, y: 0};
      return {subtitleOffset: {x: clamp((base.x ?? 0) + svgDx, -w / 2, w / 2), y: clamp((base.y ?? 0) + svgDy, -h / 2, h / 2)}};
    }
    case 'legend': {
      const base = config.legendOffset ?? {x: 0, y: 0};
      const newX = clamp((base.x ?? 0) + svgDx, -w / 2, w / 2);
      const newY = clamp((base.y ?? 0) + svgDy, -h / 2, h / 2);
      const result: MoveResult = {legendOffset: {x: newX, y: newY}};
      if (Math.abs(newX) > 40) {
        const current = config.legendPosition ?? 'bottom';
        if (newX > 30 && current !== 'right') result.legendPosition = 'right';
        else if (Math.abs(newX) <= 30 && current === 'right') {
          result.legendPosition = newY < -10 ? 'top' : 'bottom';
        }
      }
      return result;
    }
    case 'xLabel': {
      const base = config.xLabelOffset ?? {x: 0, y: 0};
      return {xLabelOffset: {x: 0, y: clamp((base.y ?? 0) + svgDy, -h / 2, h / 2)}};
    }
    case 'yLabel': {
      const base = config.yLabelOffset ?? {x: 0, y: 0};
      return {yLabelOffset: {x: clamp((base.x ?? 0) + svgDx, -w / 2, w / 2), y: 0}};
    }
    default:
      return null;
  }
}

export function getHiddenElements(config: ChartConfig): string[] {
  return config.hiddenElements ?? [];
}

export function isLocked(config: ChartConfig, elementId: string): boolean {
  return (config.lockedElements ?? []).includes(elementId);
}

export function toggleHidden(config: ChartConfig, elementId: string): ChartConfig {
  const hidden = new Set(config.hiddenElements ?? []);
  if (hidden.has(elementId)) hidden.delete(elementId);
  else hidden.add(elementId);
  return {...config, hiddenElements: [...hidden]};
}

export function toggleLocked(config: ChartConfig, elementId: string): ChartConfig {
  const locked = new Set(config.lockedElements ?? []);
  if (locked.has(elementId)) locked.delete(elementId);
  else locked.add(elementId);
  return {...config, lockedElements: [...locked]};
}
