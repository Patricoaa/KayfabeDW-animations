'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {DEFAULT_CHART_CONFIG} from '@/lib/chart-config';
import {BarChart} from './bar-chart';

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

  return <BarChart data={data} config={cfg} />;
}