'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {DEFAULT_CHART_CONFIG} from '@/lib/chart-config';
import {BarChart} from './bar-chart';
import {PieChart} from './pie-chart';
import {FaceOffChart} from './faceoff-chart';

type ChartPreviewProps = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function ChartPreview({data, config}: ChartPreviewProps) {
  const cfg = {...DEFAULT_CHART_CONFIG, ...config};

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        Sin datos para mostrar
      </div>
    );
  }

  if (cfg.type === 'pie') return <PieChart data={data} config={cfg} />;
  if (cfg.type === 'faceoff') return <FaceOffChart data={data} config={cfg} />;
  return <BarChart data={data} config={cfg} />;
}