'use client';

import type {ChartConfig} from '@/lib/chart-config';
import {DEFAULT_CHART_CONFIG} from '@/lib/chart-config';
import {BarChart} from './bar-chart';
import {PieChart} from './pie-chart';
import {LineChart} from './line-chart';
import {AreaChart} from './area-chart';
import {ScatterChart} from './scatter-chart';
import {TableView} from './table-view';

type ChartPreviewProps = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function ChartPreview({data, config}: ChartPreviewProps) {
  const cfg = {...DEFAULT_CHART_CONFIG, ...config};

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        Sin datos para mostrar
      </div>
    );
  }

  switch (cfg.type) {
    case 'bar':
      return <BarChart data={data} config={cfg} />;
    case 'pie':
      return <PieChart data={data} config={cfg} />;
    case 'line':
      return <LineChart data={data} config={cfg} />;
    case 'area':
      return <AreaChart data={data} config={cfg} />;
    case 'scatter':
      return <ScatterChart data={data} config={cfg} />;
    case 'table':
      return <TableView data={data} config={cfg} />;
    default:
      return <BarChart data={data} config={cfg} />;
  }
}
