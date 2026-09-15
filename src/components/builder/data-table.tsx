'use client';

import {useMemo} from 'react';
import {Loader2} from 'lucide-react';

const MAX_ROWS = 2000;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const s = JSON.stringify(value);
    return s && s.length > 80 ? `${s.slice(0, 80)}…` : (s ?? '');
  }
  const s = String(value);
  return s.length > 120 ? `${s.slice(0, 120)}…` : s;
}

type DataTableProps = {
  data: Record<string, unknown>[];
  loading?: boolean;
  tableName?: string;
  truncated?: boolean;
};

export function DataTable({data, loading, tableName, truncated}: DataTableProps) {
  // Columnas = unión de keys de las filas, en orden de primera aparición.
  const columns = useMemo(() => {
    const seen = new Set<string>();
    const cols: string[] = [];
    for (const row of data) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key);
          cols.push(key);
        }
      }
    }
    return cols;
  }, [data]);

  const shown = data.slice(0, MAX_ROWS);
  const overCap = data.length > MAX_ROWS;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm font-body gap-2">
        <Loader2 size={16} className="animate-spin text-amber-500" />
        Consultando...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 px-4 h-9 border-b border-border-default bg-elevated text-[11px] text-muted font-body shrink-0">
        <span className="font-semibold text-secondary">
          Resultado{tableName ? ` de ${tableName}` : ''}
        </span>
        <span className="ml-auto">
          {data.length} fila{data.length === 1 ? '' : 's'} · {columns.length} columna{columns.length === 1 ? '' : 's'}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted text-sm font-body">
          Ejecutá la consulta para ver las filas del resultado
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="border-collapse text-[11px] font-mono">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 z-20 px-2.5 py-1.5 text-right bg-card border-b border-r border-border-default text-[10px] font-semibold text-muted whitespace-nowrap">
                    #
                  </th>
                  {columns.map((c) => (
                    <th
                      key={c}
                      className="px-2.5 py-1.5 text-left bg-elevated border-b border-r border-border-default text-[10px] font-semibold text-secondary whitespace-nowrap"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, i) => (
                  <tr key={i} className={i % 2 === 1 ? 'bg-elevated/40' : ''}>
                    <td className="sticky left-0 z-10 px-2.5 py-1 text-right bg-background border-b border-r border-border-subtle text-muted">
                      {i + 1}
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c}
                        className="px-2.5 py-1 border-b border-r border-border-subtle text-secondary whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis"
                        title={formatCell(row[c])}
                      >
                        {formatCell(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(overCap || truncated) && (
            <div className="px-4 py-1.5 border-t border-border-default bg-elevated text-[10px] text-amber-600 shrink-0">
              {overCap
                ? `Mostrando las primeras ${MAX_ROWS} de ${data.length} filas`
                : 'Se capturaron hasta 50.000 filas'}
            </div>
          )}
        </>
      )}
    </div>
  );
}