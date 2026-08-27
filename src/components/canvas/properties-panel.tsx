'use client';

import {useCallback} from 'react';
import {X} from 'lucide-react';
import type {TableInfo, ColumnInfo} from '@/lib/schema-metadata';
import {isNumericType, isDateType, isBooleanType} from '@/lib/schema-metadata';
import type {QuerySpec, FilterRule, OrderClause, SelectField} from '@/lib/query-spec';
import type {JoinType} from './join-edge';

type PropertiesPanelProps = {
  spec: QuerySpec;
  meta: TableInfo[];
  selectedTable: string | null;
  selectedColumns: string[];
  selectedEdge: {
    id: string;
    joinType: JoinType;
    condition: string;
    sourceTable: string;
    targetTable: string;
  } | null;
  onSpecChange: (spec: QuerySpec) => void;
  onEdgeUpdate: (edgeId: string, joinType: JoinType, condition: string) => void;
  onToggleColumn: (tableName: string, columnName: string) => void;
};

export function PropertiesPanel({
  spec,
  meta,
  selectedTable,
  selectedColumns,
  selectedEdge,
  onSpecChange,
  onEdgeUpdate,
  onToggleColumn,
}: PropertiesPanelProps) {
  if (selectedEdge) {
    return (
      <EdgeProperties
        edge={selectedEdge}
        meta={meta}
        onUpdate={onEdgeUpdate}
      />
    );
  }

  if (selectedTable) {
    const table = meta.find((t) => t.name === selectedTable);
    if (table) {
      return (
        <TableProperties
          table={table}
          selectedColumns={selectedColumns}
          spec={spec}
          onSpecChange={onSpecChange}
          onToggleColumn={onToggleColumn}
        />
      );
    }
  }

  return <SummaryPanel spec={spec} meta={meta} />;
}

function TableProperties({
  table,
  selectedColumns,
  spec,
  onSpecChange,
  onToggleColumn,
}: {
  table: TableInfo;
  selectedColumns: string[];
  spec: QuerySpec;
  onSpecChange: (spec: QuerySpec) => void;
  onToggleColumn: (tableName: string, columnName: string) => void;
}) {
  const tableFilters = spec.filters?.filter(
    (f) => f.table === table.name,
  ) ?? [];
  const tableGroupBy = spec.groupBy?.filter((g) => g.startsWith(`${table.name}.`)) ?? [];
  const tableOrderBy = spec.orderBy?.filter((o) => o.table === table.name) ?? [];

  const addFilter = useCallback(() => {
    const newFilter: FilterRule = {
      column: table.columns[0]?.name ?? '',
      op: '=',
      value: '',
      table: table.name,
    };
    onSpecChange({
      ...spec,
      filters: [...(spec.filters ?? []), newFilter],
    });
  }, [spec, onSpecChange, table]);

  const updateFilter = useCallback(
    (idx: number, patch: Partial<FilterRule>) => {
      const filters = [...(spec.filters ?? [])];
      filters[idx] = {...filters[idx], ...patch};
      onSpecChange({...spec, filters});
    },
    [spec, onSpecChange],
  );

  const removeFilter = useCallback(
    (idx: number) => {
      onSpecChange({
        ...spec,
        filters: (spec.filters ?? []).filter((_, i) => i !== idx),
      });
    },
    [spec, onSpecChange],
  );

  const toggleGroupBy = useCallback(
    (col: string) => {
      const qualified = `${table.name}.${col}`;
      const exists = spec.groupBy?.includes(qualified);
      onSpecChange({
        ...spec,
        groupBy: exists
          ? (spec.groupBy ?? []).filter((g) => g !== qualified)
          : [...(spec.groupBy ?? []), qualified],
      });
    },
    [spec, onSpecChange, table.name],
  );

  const addOrderBy = useCallback(() => {
    onSpecChange({
      ...spec,
      orderBy: [
        ...(spec.orderBy ?? []),
        {column: table.columns[0]?.name ?? '', direction: 'asc' as const, table: table.name},
      ],
    });
  }, [spec, onSpecChange, table]);

  const updateOrderBy = useCallback(
    (idx: number, patch: Partial<OrderClause>) => {
      const orders = [...(spec.orderBy ?? [])];
      orders[idx] = {...orders[idx], ...patch};
      onSpecChange({...spec, orderBy: orders});
    },
    [spec, onSpecChange],
  );

  const removeOrderBy = useCallback(
    (idx: number) => {
      onSpecChange({
        ...spec,
        orderBy: (spec.orderBy ?? []).filter((_, i) => i !== idx),
      });
    },
    [spec, onSpecChange],
  );

  const updateLimit = useCallback(
    (limit: number) => {
      onSpecChange({...spec, limit});
    },
    [spec, onSpecChange],
  );

  const AGGREGATES = ['sum', 'avg', 'count', 'min', 'max', 'count_distinct'] as const;
  const setAggregate = useCallback(
    (colName: string, agg: (typeof AGGREGATES)[number] | '') => {
      const select = [...(spec.select ?? [])];
      const idx = select.findIndex((f) => f.column === colName || f.column === `${table.name}.${colName}`);
      if (idx === -1) return;
      select[idx] = {...select[idx], aggregate: agg === '' ? undefined : agg};
      onSpecChange({...spec, select});
    },
    [spec, onSpecChange, table.name],
  );

  const getAggregate = (colName: string): string => {
    const f = (spec.select ?? []).find((r) => r.column === colName || r.column === `${table.name}.${colName}`);
    return f?.aggregate ?? '';
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-micro font-semibold text-secondary uppercase tracking-widest mb-2 block font-display">
          Columnas de {table.name}
        </label>
        <div className="space-y-0.5">
          {table.columns.map((col) => {
            const isSelected = selectedColumns.includes(col.name);
            return (
              <div
                key={col.name}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] cursor-pointer transition-colors ${
                  isSelected ? 'bg-amber-500/15 text-amber-500' : 'text-secondary hover:bg-card-hover'
                }`}
                onClick={() => onToggleColumn(table.name, col.name)}
              >
                <span className={`text-[9px] font-mono px-1 rounded ${
                  isNumericType(col.type) ? 'bg-blue-500/15 text-blue-400' :
                  isDateType(col.type) ? 'bg-purple-500/15 text-purple-400' :
                  isBooleanType(col.type) ? 'bg-emerald-500/15 text-emerald-400' :
                  'bg-elevated text-muted'
                }`}>
                  {isNumericType(col.type) ? '#' : isDateType(col.type) ? '@' : 'T'}
                </span>
                <span className="flex-1 truncate font-mono">{col.name}</span>
                {isSelected && isNumericType(col.type) && (
                  <select
                    value={getAggregate(col.name)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setAggregate(col.name, e.target.value as typeof AGGREGATES[number] | '')}
                    className="bg-elevated border border-border-default rounded px-1 text-[9px] focus:ring-1 focus:ring-amber-500"
                    aria-label={`Agregación para ${col.name}`}
                  >
                    <option value="">—</option>
                    {AGGREGATES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                )}
                <span className="text-[9px] text-muted">{col.type}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-micro font-semibold text-secondary">Filtros</label>
          <button onClick={addFilter} className="text-[10px] text-amber-500 hover:text-amber-400 font-semibold">
            + Agregar
          </button>
        </div>
        {tableFilters.length === 0 ? (
          <p className="text-[10px] text-muted">Sin filtros</p>
        ) : (
          <div className="space-y-1">
            {tableFilters.map((f, idx) => {
              const realIdx = (spec.filters ?? []).indexOf(f);
              return (
                <FilterRow
                  key={realIdx}
                  filter={f}
                  table={table}
                  onUpdate={(patch) => updateFilter(realIdx, patch)}
                  onRemove={() => removeFilter(realIdx)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="text-micro font-semibold text-secondary mb-1 block">GROUP BY</label>
        <div className="flex flex-wrap gap-1">
          {table.columns.map((col) => {
            const qualified = `${table.name}.${col.name}`;
            const active = spec.groupBy?.includes(qualified);
            return (
              <button
                key={col.name}
                onClick={() => toggleGroupBy(col.name)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  active ? 'bg-amber-500 text-black' : 'bg-elevated text-secondary hover:bg-card-hover'
                }`}
              >
                {col.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-micro font-semibold text-secondary">ORDER BY</label>
          <button onClick={addOrderBy} className="text-[10px] text-amber-500 hover:text-amber-400 font-semibold">
            + Agregar
          </button>
        </div>
        {tableOrderBy.map((o, idx) => {
          const realIdx = (spec.orderBy ?? []).indexOf(o);
          return (
            <div key={realIdx} className="flex items-center gap-1 mb-1">
              <select
                value={o.column}
                onChange={(e) => updateOrderBy(realIdx, {column: e.target.value})}
                className="flex-1 bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-body"
              >
                {table.columns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                value={o.direction ?? 'asc'}
                onChange={(e) => updateOrderBy(realIdx, {direction: e.target.value as 'asc' | 'desc'})}
                className="w-14 bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-body"
              >
                <option value="asc">ASC</option>
                <option value="desc">DESC</option>
              </select>
              <button onClick={() => removeOrderBy(realIdx)} className="p-0.5 text-muted hover:text-red-500 rounded" aria-label="Quitar orden">
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>

      <div>
        <label className="text-micro font-semibold text-secondary mb-1 block">LÍMITE</label>
        <input
          type="number"
          min={1}
          max={5000}
          value={spec.limit ?? 100}
          onChange={(e) => updateLimit(Number(e.target.value))}
          className="w-full bg-elevated border border-border-default rounded px-2 py-1 text-[10px] font-body focus:ring-1 focus:ring-amber-500"
        />
      </div>
    </div>
  );
}

function FilterRow({
  filter,
  table,
  onUpdate,
  onRemove,
}: {
  filter: FilterRule;
  table: TableInfo;
  onUpdate: (patch: Partial<FilterRule>) => void;
  onRemove: () => void;
}) {
  const ops: FilterRule['op'][] = ['=', '!=', '>', '>=', '<', '<=', 'like', 'ilike', 'in', 'is_null', 'is_not_null', 'between'];
  const col = table.columns.find((c) => c.name === filter.column);
  const isNumeric = col ? isNumericType(col.type) : false;
  const isDate = col ? isDateType(col.type) : false;

  return (
    <div className="flex items-center gap-1">
      <select
        value={filter.column}
        onChange={(e) => onUpdate({column: e.target.value})}
        className="flex-1 bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-body"
      >
        {table.columns.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
      <select
        value={filter.op}
        onChange={(e) => onUpdate({op: e.target.value as FilterRule['op']})}
        className="w-14 bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-mono"
      >
        {ops.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {filter.op !== 'is_null' && filter.op !== 'is_not_null' && (
        isDate ? (
          <input
            type="date"
            value={filter.value ?? ''}
            onChange={(e) => onUpdate({value: e.target.value})}
            className="flex-1 bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-body"
          />
        ) : isNumeric ? (
          <input
            type="number"
            value={filter.value ?? ''}
            onChange={(e) => onUpdate({value: e.target.value})}
            className="flex-1 bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-body"
          />
        ) : (
          <input
            type="text"
            value={filter.value ?? ''}
            onChange={(e) => onUpdate({value: e.target.value})}
            className="flex-1 bg-elevated border border-border-default rounded px-1.5 py-0.5 text-[10px] font-body"
            placeholder="valor"
          />
        )
      )}
      <button onClick={onRemove} className="p-0.5 text-muted hover:text-red-500 rounded" aria-label="Quitar filtro">
        <X size={11} />
      </button>
    </div>
  );
}

function EdgeProperties({
  edge,
  meta,
  onUpdate,
}: {
  edge: {id: string; joinType: JoinType; condition: string; sourceTable: string; targetTable: string};
  meta: TableInfo[];
  onUpdate: (edgeId: string, joinType: JoinType, condition: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-micro font-semibold text-secondary uppercase tracking-widest mb-2 block font-display">Tipo de JOIN</label>
        <div className="grid grid-cols-2 gap-1">
          {(['INNER', 'LEFT', 'RIGHT', 'FULL'] as JoinType[]).map((jt) => (
            <button
              key={jt}
              onClick={() => onUpdate(edge.id, jt, edge.condition)}
              className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                edge.joinType === jt
                  ? 'bg-amber-500 text-black'
                  : 'bg-elevated text-secondary hover:bg-card-hover'
              }`}
            >
              {jt}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-micro font-semibold text-secondary mb-1 block font-display">Condición ON</label>
        <input
          type="text"
          value={edge.condition}
          onChange={(e) => onUpdate(edge.id, edge.joinType, e.target.value)}
          className="w-full bg-elevated border border-border-default rounded px-2 py-1.5 text-[10px] font-mono focus:ring-1 focus:ring-amber-500"
          placeholder="table1.column = table2.column"
        />
      </div>

      <div className="text-[10px] text-muted space-y-1">
        <p>Origen: {edge.sourceTable}</p>
        <p>Destino: {edge.targetTable}</p>
      </div>
    </div>
  );
}

function SummaryPanel({spec, meta}: {spec: QuerySpec; meta: TableInfo[]}) {
  const tableCount = new Set([
    spec.table,
    ...(spec.joins?.map((j) => j.table) ?? []),
  ]).size;

  const colCount = spec.select?.length ?? 0;
  const filterCount = spec.filters?.length ?? 0;
  const joinCount = spec.joins?.length ?? 0;

  const sqlParts: string[] = [];
  if (spec.table) sqlParts.push(`FROM ${spec.table}`);
  if (spec.select && spec.select.length > 0 && !(spec.select.length === 1 && spec.select[0].column === '*')) {
    const cols = spec.select.map((f) => {
      const agg = f.aggregate ? `${f.aggregate}(${f.column})` : f.column;
      return f.alias ? `${agg} AS ${f.alias}` : agg;
    });
    sqlParts.push(`SELECT ${cols.join(', ')}`);
  }
  if (spec.joins && spec.joins.length > 0) {
    spec.joins.forEach((j) => sqlParts.push(`${j.type ?? 'INNER'} JOIN ${j.table} ON ${j.on}`));
  }
  if (spec.filters && spec.filters.length > 0) {
    const filters = spec.filters.map((f) => `${f.table ?? spec.table}.${f.column} ${f.op} ${f.value ?? ''}`);
    sqlParts.push(`WHERE ${filters.join(' AND ')}`);
  }
  if (spec.groupBy && spec.groupBy.length > 0) {
    sqlParts.push(`GROUP BY ${spec.groupBy.join(', ')}`);
  }
  if (spec.orderBy && spec.orderBy.length > 0) {
    const orders = spec.orderBy.map((o) => `${o.table ?? spec.table}.${o.column} ${(o.direction ?? 'asc').toUpperCase()}`);
    sqlParts.push(`ORDER BY ${orders.join(', ')}`);
  }
  if (spec.limit) sqlParts.push(`LIMIT ${spec.limit}`);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-elevated rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-primary font-display">{tableCount}</div>
          <div className="text-micro text-muted font-display uppercase tracking-widest">Tablas</div>
        </div>
        <div className="bg-elevated rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-primary font-display">{colCount}</div>
          <div className="text-micro text-muted font-display uppercase tracking-widest">Columnas</div>
        </div>
        <div className="bg-elevated rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-primary font-display">{joinCount}</div>
          <div className="text-micro text-muted font-display uppercase tracking-widest">JOINs</div>
        </div>
        <div className="bg-elevated rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-primary font-display">{filterCount}</div>
          <div className="text-micro text-muted font-display uppercase tracking-widest">Filtros</div>
        </div>
      </div>

      <div>
        <label className="text-micro font-semibold text-secondary mb-1 block font-display">SQL Generado</label>
        <pre className="p-2 bg-elevated border border-border-default rounded-lg text-[10px] text-primary font-mono overflow-x-auto max-h-[200px]">
          {sqlParts.length > 0 ? sqlParts.join('\n') : '-- Selecciona una tabla para comenzar --'}
        </pre>
      </div>
    </div>
  );
}
