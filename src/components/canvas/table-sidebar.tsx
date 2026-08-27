'use client';

import {useCallback, useState} from 'react';
import {LayoutGrid, Eye, Link2, Plus, X, Circle} from 'lucide-react';
import type {TableInfo} from '@/lib/schema-metadata';
import {getRelatedTables} from '@/lib/schema-metadata';

type TableSidebarProps = {
  tables: TableInfo[];
  canvasTables: string[];
  onAddTable: (table: TableInfo) => void;
};

export function TableSidebar({tables, canvasTables, onAddTable}: TableSidebarProps) {
  const [search, setSearch] = useState('');
  const [showRelated, setShowRelated] = useState<string | null>(null);

  const filtered = tables.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  const tablesList = filtered.filter((t) => t.kind === 'table');
  const viewsList = filtered.filter((t) => t.kind === 'view');

  const relatedToShow = showRelated
    ? getRelatedTables(tables, showRelated).filter(
        (t) => !canvasTables.includes(t.name),
      )
    : [];

  const handleDragStart = useCallback(
    (e: React.DragEvent, table: TableInfo) => {
      e.dataTransfer.setData('application/table', JSON.stringify(table));
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar tabla..."
        className="w-full bg-elevated border border-border-default rounded-lg px-2 py-1.5 text-xs font-body focus:outline-none focus:ring-1 focus:ring-amber-500"
      />

      {relatedToShow.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-micro font-semibold text-amber-500 uppercase tracking-widest font-display">
              Relacionadas a {showRelated}
            </label>
            <button
              onClick={() => setShowRelated(null)}
              className="p-0.5 text-muted hover:text-primary rounded"
              aria-label="Cerrar relacionadas"
            >
              <X size={11} />
            </button>
          </div>
          <div className="space-y-0.5">
            {relatedToShow.map((t) => (
              <button
                key={t.name}
                draggable
                onDragStart={(e) => handleDragStart(e, t)}
                onClick={() => onAddTable(t)}
                className="w-full text-left px-2 py-1 rounded text-[11px] text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 font-mono"
              >
                {t.kind === 'view' ? <Eye size={11} /> : <LayoutGrid size={11} />}
                {t.name}
                <span className="ml-auto text-[9px] text-amber-500/70">
                  {t.columns?.length ?? 0} cols
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tablesList.length > 0 && (
        <div>
          <label className="text-micro font-semibold text-muted uppercase tracking-widest mb-1 block font-display">
            Tablas ({tablesList.length})
          </label>
          <div className="space-y-0.5">
            {tablesList.map((t) => (
              <TableItem
                key={t.name}
                table={t}
                isInCanvas={canvasTables.includes(t.name)}
                onAdd={onAddTable}
                onDragStart={handleDragStart}
                onShowRelated={setShowRelated}
              />
            ))}
          </div>
        </div>
      )}

      {viewsList.length > 0 && (
        <div>
          <label className="text-micro font-semibold text-muted uppercase tracking-widest mb-1 block font-display">
            Vistas ({viewsList.length})
          </label>
          <div className="space-y-0.5">
            {viewsList.map((t) => (
              <TableItem
                key={t.name}
                table={t}
                isInCanvas={canvasTables.includes(t.name)}
                onAdd={onAddTable}
                onDragStart={handleDragStart}
                onShowRelated={setShowRelated}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TableItem({
  table,
  isInCanvas,
  onAdd,
  onDragStart,
  onShowRelated,
}: {
  table: TableInfo;
  isInCanvas: boolean;
  onAdd: (t: TableInfo) => void;
  onDragStart: (e: React.DragEvent, t: TableInfo) => void;
  onShowRelated: (name: string | null) => void;
}) {
  return (
    <div
      draggable={!isInCanvas}
      onDragStart={(e) => !isInCanvas && onDragStart(e, table)}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors ${
        isInCanvas
          ? 'text-muted cursor-default'
          : 'text-secondary hover:bg-card-hover cursor-grab'
      }`}
    >
      {table.kind === 'view'
        ? <Eye size={12} className="text-muted shrink-0" />
        : <LayoutGrid size={12} className="text-muted shrink-0" />}
      <span className="flex-1 truncate font-mono">{table.name}</span>
      {!isInCanvas && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowRelated(table.name);
            }}
            className="p-0.5 text-muted hover:text-amber-500 rounded"
            title="Ver tablas relacionadas"
            aria-label={`Ver tablas relacionadas a ${table.name}`}
          >
            <Link2 size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(table);
            }}
            className="p-0.5 text-muted hover:text-amber-500 rounded"
            title="Agregar al canvas"
            aria-label={`Agregar ${table.name} al canvas`}
          >
            <Plus size={11} />
          </button>
        </>
      )}
      {isInCanvas && (
        <Circle size={6} className="text-emerald-500 fill-emerald-500 shrink-0" />
      )}
    </div>
  );
}
