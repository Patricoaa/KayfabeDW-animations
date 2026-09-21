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

// Tope de legibilidad del preview: por encima de esta cardinalidad de
// categorías, un gráfico de barras/torta degenera en marcas de subpíxel que se
// leen como un canvas vacío (una viz nueva renderiza todas las filas capturadas
// cuando no hay campo asignado — p. ej. 32k filas → 32k barras de 0.02px).
// Coincide con el máximo del control «Filas del gráfico» del panel.
const MAX_CATEGORIES_IN_PREVIEW = 200;

// Guía para una visualización nueva: los datos ya llegaron, pero el config no
// tiene un mapeo que produzca un gráfico legible (campo sin asignar, o una
// columna de categoría de altísima cardinalidad).
function MappingHint({title, message}: {title: string; message: string}) {
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-2 text-center px-6">
      <p className="text-sm font-semibold text-secondary">{title}</p>
      <p className="text-xs text-muted leading-relaxed max-w-[380px]">{message}</p>
    </div>
  );
}

function distinctCount(data: Record<string, unknown>[], field: string): number {
  const seen = new Set<unknown>();
  for (const row of data) {
    const v = row[field];
    seen.add(v === null || v === undefined ? '\u0000' : v);
  }
  return seen.size;
}

export function ChartPreview({data, config}: ChartPreviewProps) {
  const cfg = {...DEFAULT_CHART_CONFIG, ...config};

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        Sin datos para mostrar
      </div>
    );
  }

  // Sin campo de mapeo explícito (o que ya no existe en las filas): guía en vez
  // de renderizar un gráfico con campos auto-elegidos.
  if (cfg.type === 'faceoff') {
    if (!cfg.faceEntityField || !(cfg.faceEntityField in data[0])) {
      return (
        <MappingHint
          title="Tus datos están listos"
          message="Asigná el campo «Entidad» (y los campos de ícono y valor) en la sección Cara a cara del panel para comparar los dos luchadores."
        />
      );
    }
  } else if (cfg.type === 'bar' || cfg.type === 'pie') {
    if (!cfg.xField || !(cfg.xField in data[0])) {
      return (
        <MappingHint
          title="Tus datos están listos"
          message="Asigná al menos «Eje X / Categoría» y «Eje Y / Valor» en el panel para ver tu gráfico."
        />
      );
    }
    const categories = distinctCount(data, cfg.xField);
    if (categories > MAX_CATEGORIES_IN_PREVIEW) {
      return (
        <MappingHint
          title="Demasiadas categorías"
          message={`«${cfg.xField}» tiene ${categories} valores distintos. Elegí una columna de menor cardinalidad en Eje X / Categoría o usá «Filas del gráfico» para limitar el preview.`}
        />
      );
    }
  }

  if (cfg.type === 'pie') return <PieChart data={data} config={cfg} />;
  if (cfg.type === 'faceoff') return <FaceOffChart data={data} config={cfg} />;
  return <BarChart data={data} config={cfg} />;
}