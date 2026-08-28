'use client';

import type {ChartConfig} from '@/lib/chart-config';

type Props = {
  data: Record<string, unknown>[];
  config: ChartConfig;
};

export function TableView({data, config}: Props) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-muted text-sm">Sin datos</div>;
  }

  const allKeys = Object.keys(data[0]);
  const columns =
    config.tableColumns && config.tableColumns.length > 0
      ? config.tableColumns.filter((c) => allKeys.includes(c))
      : allKeys;

  let rows = data;
  if (config.tableSort?.column && allKeys.includes(config.tableSort.column)) {
    const {column, direction} = config.tableSort;
    const dir = direction === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const av = a[column];
      const bv = b[column];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  // Text search across all visible columns.
  const query = (config.tableSearch ?? '').trim().toLowerCase();
  if (query) {
    const cols = columns;
    rows = rows.filter((row) => cols.some((c) => String(row[c] ?? '').toLowerCase().includes(query)));
  }

  const limit = config.tableLimit ?? 50;
  const shown = rows.slice(0, limit);
  const sticky = config.stickyHeader ?? false;

  const thead = (
    <thead>
      <tr className="border-b border-border-default">
        {columns.map((col) => (
          <th
            key={col}
            className={`text-left px-3 py-2 text-secondary font-medium whitespace-nowrap ${sticky ? 'sticky top-0 bg-elevated z-10' : ''}`}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div className={sticky ? 'overflow-auto max-h-96' : 'overflow-x-auto'}>
      <table className="w-full text-xs">
        {thead}
        <tbody>
          {shown.map((row, i) => (
            <tr key={i} className="border-b border-border-subtle hover:bg-card-hover">
              {columns.map((col) => (
                <td key={col} className="px-3 py-1.5 text-primary whitespace-nowrap">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="text-xs text-muted my-4 text-center">Sin coincidencias</p>}
      {rows.length > limit && (
        <div className="text-xs text-muted mt-2 text-center">
          Mostrando {shown.length} de {rows.length} filas
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
