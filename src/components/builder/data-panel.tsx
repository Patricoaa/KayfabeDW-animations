'use client';

import {useCallback, useEffect, useState} from 'react';
import type {SchemaMetadata, TableInfo} from '@/lib/schema-metadata';
import {getSchemaMetadata, isNumericType, isDateType} from '@/lib/schema-metadata';
import type {QuerySpec, SelectField, FilterRule, JoinClause, OrderClause} from '@/lib/query-spec';
import {defaultQuerySpec, describeQuerySpec} from '@/lib/query-spec';

type DataPanelProps = {
  spec: QuerySpec;
  onChange: (spec: QuerySpec) => void;
};

export function DataPanel({spec, onChange}: DataPanelProps) {
  const [meta, setMeta] = useState<SchemaMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sqlPreview, setSqlPreview] = useState(false);

  useEffect(() => {
    getSchemaMetadata()
      .then(setMeta)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const tables = meta?.tables ?? [];
  const selectedTable = tables.find((t) => t.name === spec.table);

  const updateSpec = useCallback(
    (patch: Partial<QuerySpec>) => onChange({...spec, ...patch}),
    [spec, onChange],
  );

  const handleTableChange = useCallback(
    (tableName: string) => {
      const newSpec = defaultQuerySpec(tableName);
      onChange(newSpec);
    },
    [onChange],
  );

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded" />
        <div className="h-8 bg-zinc-800 rounded" />
        <div className="h-20 bg-zinc-800 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table selector */}
      <div>
        <label className="block text-sm font-medium mb-1">Tabla / Vista</label>
        <select
          value={spec.table}
          onChange={(e) => handleTableChange(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
        >
          <option value="">Seleccionar...</option>
          <optgroup label="Tablas">
            {tables.filter((t) => t.kind === 'table').map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </optgroup>
          <optgroup label="Vistas">
            {tables.filter((t) => t.kind === 'view').map((t) => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {selectedTable && (
        <>
          {/* Columns */}
          <SelectColumns
            table={selectedTable}
            allTables={tables}
            select={spec.select ?? []}
            onChange={(select) => updateSpec({select})}
          />

          {/* Joins */}
          <JoinBuilder
            allTables={tables}
            currentTable={spec.table}
            joins={spec.joins ?? []}
            onChange={(joins) => updateSpec({joins})}
          />

          {/* Filters */}
          <FilterBuilder
            table={selectedTable}
            allTables={tables}
            filters={spec.filters ?? []}
            onChange={(filters) => updateSpec({filters})}
          />

          {/* Group By */}
          <GroupByBuilder
            table={selectedTable}
            groupBy={spec.groupBy ?? []}
            onChange={(groupBy) => updateSpec({groupBy})}
          />

          {/* Order By */}
          <OrderByBuilder
            table={selectedTable}
            orderBy={spec.orderBy ?? []}
            onChange={(orderBy) => updateSpec({orderBy})}
          />

          {/* Limit */}
          <div>
            <label className="block text-sm font-medium mb-1">Límite</label>
            <input
              type="number"
              min={1}
              max={5000}
              value={spec.limit ?? 100}
              onChange={(e) => updateSpec({limit: Number(e.target.value)})}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
          </div>
        </>
      )}

      {/* SQL Preview toggle */}
      <div>
        <button
          onClick={() => setSqlPreview(!sqlPreview)}
          className="text-xs text-zinc-400 hover:text-white transition-colors"
        >
          {sqlPreview ? 'Ocultar SQL' : 'Ver SQL generado'}
        </button>
        {sqlPreview && (
          <pre className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 overflow-x-auto">
            {describeQuerySpec(spec)}
          </pre>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function SelectColumns({
  table,
  allTables,
  select,
  onChange,
}: {
  table: TableInfo;
  allTables: TableInfo[];
  select: SelectField[];
  onChange: (select: SelectField[]) => void;
}) {
  const aggregates = ['count', 'sum', 'avg', 'min', 'max', 'count_distinct'];

  const addColumn = () => {
    onChange([...select, {column: table.columns[0]?.name ?? ''}]);
  };

  const removeColumn = (idx: number) => {
    onChange(select.filter((_, i) => i !== idx));
  };

  const updateColumn = (idx: number, field: Partial<SelectField>) => {
    const updated = [...select];
    updated[idx] = {...updated[idx], ...field};
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium">Columnas</label>
        <button onClick={addColumn} className="text-xs text-blue-400 hover:text-blue-300">
          + Agregar
        </button>
      </div>
      {select.length === 0 ? (
        <button onClick={addColumn} className="text-xs text-zinc-500 hover:text-white">
          Seleccionar columnas...
        </button>
      ) : (
        <div className="space-y-2">
          {select.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={s.column}
                onChange={(e) => updateColumn(idx, {column: e.target.value})}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                <option value="*">*</option>
                {table.columns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                value={s.aggregate ?? ''}
                onChange={(e) => updateColumn(idx, {aggregate: e.target.value || undefined})}
                className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                <option value="">sin agg</option>
                {aggregates.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="alias"
                value={s.alias ?? ''}
                onChange={(e) => updateColumn(idx, {alias: e.target.value || undefined})}
                className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              />
              <button onClick={() => removeColumn(idx)} className="text-zinc-500 hover:text-red-400 text-xs">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JoinBuilder({
  allTables,
  currentTable,
  joins,
  onChange,
}: {
  allTables: TableInfo[];
  currentTable: string;
  joins: JoinClause[];
  onChange: (joins: JoinClause[]) => void;
}) {
  const addJoin = () => {
    const firstFk = allTables.find((t) => t.name === currentTable)?.foreignKeys[0];
    onChange([
      ...joins,
      {
        table: firstFk?.refTable ?? allTables[0]?.name ?? '',
        on: firstFk ? `${currentTable}.${firstFk.column} = ${firstFk.refTable}.${firstFk.refColumn}` : '',
        type: 'INNER',
      },
    ]);
  };

  const removeJoin = (idx: number) => {
    onChange(joins.filter((_, i) => i !== idx));
  };

  const updateJoin = (idx: number, field: Partial<JoinClause>) => {
    const updated = [...joins];
    updated[idx] = {...updated[idx], ...field};
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium">JOINs</label>
        <button onClick={addJoin} className="text-xs text-blue-400 hover:text-blue-300">
          + Agregar
        </button>
      </div>
      {joins.length === 0 ? (
        <button onClick={addJoin} className="text-xs text-zinc-500 hover:text-white">
          Agregar JOIN...
        </button>
      ) : (
        <div className="space-y-2">
          {joins.map((j, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={j.type ?? 'INNER'}
                onChange={(e) => updateJoin(idx, {type: e.target.value as JoinClause['type']})}
                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                <option value="INNER">INNER</option>
                <option value="LEFT">LEFT</option>
                <option value="RIGHT">RIGHT</option>
                <option value="FULL">FULL</option>
              </select>
              <select
                value={j.table}
                onChange={(e) => updateJoin(idx, {table: e.target.value})}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                {allTables.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="ON condition"
                value={j.on}
                onChange={(e) => updateJoin(idx, {on: e.target.value})}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs font-mono"
              />
              <button onClick={() => removeJoin(idx)} className="text-zinc-500 hover:text-red-400 text-xs">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBuilder({
  table,
  allTables,
  filters,
  onChange,
}: {
  table: TableInfo;
  allTables: TableInfo[];
  filters: FilterRule[];
  onChange: (filters: FilterRule[]) => void;
}) {
  const ops: FilterRule['op'][] = ['=', '!=', '>', '>=', '<', '<=', 'like', 'ilike', 'in', 'is_null', 'is_not_null', 'between'];

  const addFilter = () => {
    onChange([...filters, {column: table.columns[0]?.name ?? '', op: '=', value: ''}]);
  };

  const removeFilter = (idx: number) => {
    onChange(filters.filter((_, i) => i !== idx));
  };

  const updateFilter = (idx: number, field: Partial<FilterRule>) => {
    const updated = [...filters];
    updated[idx] = {...updated[idx], ...field};
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium">Filtros</label>
        <button onClick={addFilter} className="text-xs text-blue-400 hover:text-blue-300">
          + Agregar
        </button>
      </div>
      {filters.length === 0 ? (
        <button onClick={addFilter} className="text-xs text-zinc-500 hover:text-white">
          Agregar filtro...
        </button>
      ) : (
        <div className="space-y-2">
          {filters.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {idx > 0 && (
                <select
                  value={f.logic ?? 'AND'}
                  onChange={(e) => updateFilter(idx, {logic: e.target.value as FilterLogic})}
                  className="w-14 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs"
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              )}
              <select
                value={f.column}
                onChange={(e) => updateFilter(idx, {column: e.target.value})}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                {table.columns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                value={f.op}
                onChange={(e) => updateFilter(idx, {op: e.target.value as FilterRule['op']})}
                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                {ops.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {f.op !== 'is_null' && f.op !== 'is_not_null' && (
                <input
                  type="text"
                  placeholder="valor"
                  value={f.value ?? ''}
                  onChange={(e) => updateFilter(idx, {value: e.target.value})}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
                />
              )}
              <button onClick={() => removeFilter(idx)} className="text-zinc-500 hover:text-red-400 text-xs">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupByBuilder({
  table,
  groupBy,
  onChange,
}: {
  table: TableInfo;
  groupBy: string[];
  onChange: (groupBy: string[]) => void;
}) {
  const toggle = (col: string) => {
    if (groupBy.includes(col)) {
      onChange(groupBy.filter((c) => c !== col));
    } else {
      onChange([...groupBy, col]);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium mb-1 block">GROUP BY</label>
      <div className="flex flex-wrap gap-1">
        {table.columns.map((c) => (
          <button
            key={c.name}
            onClick={() => toggle(c.name)}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              groupBy.includes(c.name)
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderByBuilder({
  table,
  orderBy,
  onChange,
}: {
  table: TableInfo;
  orderBy: OrderClause[];
  onChange: (orderBy: OrderClause[]) => void;
}) {
  const addOrder = () => {
    onChange([...orderBy, {column: table.columns[0]?.name ?? '', direction: 'asc'}]);
  };

  const removeOrder = (idx: number) => {
    onChange(orderBy.filter((_, i) => i !== idx));
  };

  const updateOrder = (idx: number, field: Partial<OrderClause>) => {
    const updated = [...orderBy];
    updated[idx] = {...updated[idx], ...field};
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium">ORDER BY</label>
        <button onClick={addOrder} className="text-xs text-blue-400 hover:text-blue-300">
          + Agregar
        </button>
      </div>
      {orderBy.length === 0 ? (
        <button onClick={addOrder} className="text-xs text-zinc-500 hover:text-white">
          Agregar orden...
        </button>
      ) : (
        <div className="space-y-2">
          {orderBy.map((o, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={o.column}
                onChange={(e) => updateOrder(idx, {column: e.target.value})}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                {table.columns.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                value={o.direction ?? 'asc'}
                onChange={(e) => updateOrder(idx, {direction: e.target.value as 'asc' | 'desc'})}
                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs"
              >
                <option value="asc">ASC</option>
                <option value="desc">DESC</option>
              </select>
              <button onClick={() => removeOrder(idx)} className="text-zinc-500 hover:text-red-400 text-xs">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
