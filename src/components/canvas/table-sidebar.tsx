'use client';

import {useCallback, useState} from 'react';
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
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs"
      />

      {relatedToShow.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">
              Relacionadas a {showRelated}
            </label>
            <button
              onClick={() => setShowRelated(null)}
              className="text-[10px] text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-0.5">
            {relatedToShow.map((t) => (
              <button
                key={t.name}
                draggable
                onDragStart={(e) => handleDragStart(e, t)}
                onClick={() => onAddTable(t)}
                className="w-full text-left px-2 py-1 rounded text-[11px] text-blue-300 bg-blue-900/20 hover:bg-blue-900/40 transition-colors flex items-center gap-1.5"
              >
                <span>{t.kind === 'view' ? '📋' : '🗄️'}</span>
                {t.name}
                <span className="ml-auto text-[9px] text-blue-500">
                  {t.columns.length} cols
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tablesList.length > 0 && (
        <div>
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
            Tablas ({tablesList.length})
          </label>
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
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
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
            Vistas ({viewsList.length})
          </label>
          <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
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
          ? 'text-zinc-600 cursor-default'
          : 'text-zinc-300 hover:bg-zinc-800 cursor-grab'
      }`}
    >
      <span className="text-xs">{table.kind === 'view' ? '📋' : '🗄️'}</span>
      <span className="flex-1 truncate font-mono">{table.name}</span>
      {!isInCanvas && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowRelated(table.name);
            }}
            className="text-[9px] text-zinc-600 hover:text-blue-400 px-1"
            title="Ver tablas relacionadas"
          >
            🔗
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(table);
            }}
            className="text-[9px] text-zinc-600 hover:text-green-400 px-1"
            title="Agregar al canvas"
          >
            +
          </button>
        </>
      )}
      {isInCanvas && (
        <span className="text-[9px] text-green-600">●</span>
      )}
    </div>
  );
}
