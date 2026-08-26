'use client';

import type {ChartConfig} from '@/lib/chart-config';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function TableView({data, config}: Props) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">Sin datos</div>;
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-zinc-700">
            {columns.map((col) => (
              <th key={col} className="text-left px-3 py-2 text-zinc-400 font-medium whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 50).map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              {columns.map((col) => (
                <td key={col} className="px-3 py-1.5 text-zinc-300 whitespace-nowrap">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 50 && (
        <div className="text-xs text-zinc-500 mt-2 text-center">
          Mostrando 50 de {data.length} filas
        </div>
      )}
    </div>
  );
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    return val >= 1000 ? val.toLocaleString() : String(val);
  }
  if (typeof val === 'string' && val.length > 40) {
    return val.slice(0, 40) + '…';
  }
  return String(val);
}
