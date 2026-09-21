import type {ChartConfig} from './chart-config';

// Claves del bloque "Texto de la leyenda", keyed por el label ORIGINAL que el
// gráfico realmente renderiza (resolución de legendItemsFrom en chart-frame:
// legendTextOverrides[label] > legendItems[].overrideLabel > label).
//
// Los gráficos multi-serie usan los nombres de serie detectados (legendItems);
// todo lo demás — slices de torta, categorías de scatter, barras de serie
// única — usa los valores distintos del xField, replicando la derivación de
// label de prepareSeries (String(row[xField] ?? '')). La torta expone además
// el slice sintético "Otros" que crea sliceLimit.
export function legendOverrideKeys(
  config: Pick<ChartConfig, 'type' | 'seriesField' | 'legendItems' | 'xField' | 'sliceLimit'>,
  data: Record<string, unknown>[],
): string[] {
  const isPie = (config.type ?? 'bar') === 'pie';
  const legendItems = config.legendItems ?? [];
  if (!isPie && config.seriesField && legendItems.length > 0) {
    return legendItems.map((li) => li.label);
  }
  const catCol = config.xField;
  const keys: string[] = [];
  if (catCol) {
    for (const row of data ?? []) {
      const label = String(row[catCol] ?? '');
      if (keys.length < 50 && !keys.includes(label)) keys.push(label);
    }
  }
  const limit = config.sliceLimit ?? 0;
  if (limit > 0 && keys.length > limit) keys.push('Otros');
  return keys;
}