'use client';

import {memo, useCallback} from 'react';
import {Handle, Position} from '@xyflow/react';
import type {NodeProps} from '@xyflow/react';
import type {TableInfo, ColumnInfo} from '@/lib/schema-metadata';
import {isNumericType, isDateType, isBooleanType} from '@/lib/schema-metadata';

export type TableNodeData = {
  table: TableInfo;
  selectedColumns: string[];
  onToggleColumn: (tableName: string, columnName: string) => void;
};

function columnTypeColor(type: string): string {
  if (isNumericType(type)) return 'bg-blue-900/50 text-blue-300';
  if (isDateType(type)) return 'bg-purple-900/50 text-purple-300';
  if (isBooleanType(type)) return 'bg-green-900/50 text-green-300';
  return 'bg-zinc-800 text-zinc-400';
}

function columnTypeBadge(type: string): string {
  if (isNumericType(type)) return '#';
  if (isDateType(type)) return '@';
  if (isBooleanType(type)) return '0';
  return 'T';
}

function ColumnRow({
  col,
  isSelected,
  isPK,
  isFK,
  tableName,
  onToggle,
}: {
  col: ColumnInfo;
  isSelected: boolean;
  isPK: boolean;
  isFK: boolean;
  tableName: string;
  onToggle: (table: string, col: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded cursor-pointer transition-colors ${
        isSelected
          ? 'bg-blue-600/20 text-blue-300'
          : 'text-zinc-400 hover:bg-zinc-800/50'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(tableName, col.name);
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        id={col.name}
        className="!w-2 !h-2 !bg-zinc-600 !border-0 !right-[-4px]"
      />
      <Handle
        type="target"
        position={Position.Left}
        id={col.name}
        className="!w-2 !h-2 !bg-zinc-600 !border-0 !left-[-4px]"
      />
      <span
        className={`w-3.5 text-center text-[9px] font-mono rounded ${columnTypeColor(col.type)}`}
        title={col.type}
      >
        {columnTypeBadge(col.type)}
      </span>
      <span className="flex-1 truncate font-mono text-[10px]">{col.name}</span>
      {isPK && (
        <span className="text-[8px] px-1 py-0 rounded bg-yellow-900/50 text-yellow-400 font-bold">
          PK
        </span>
      )}
      {isFK && (
        <span className="text-[8px] px-1 py-0 rounded bg-orange-900/50 text-orange-400 font-bold">
          FK
        </span>
      )}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggle(tableName, col.name)}
        className="w-3 h-3 accent-blue-500"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function TableNodeComponent({data}: NodeProps) {
  const {table, selectedColumns, onToggleColumn} = data as unknown as TableNodeData;

  const fkColumns = new Set(table.foreignKeys.map((fk) => fk.column));
  const pkColumns = new Set(table.primaryKey);

  const toggleColumn = useCallback(
    (colName: string) => onToggleColumn(table.name, colName),
    [onToggleColumn, table.name],
  );

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl min-w-[200px] max-w-[260px] overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700">
        <span className="text-xs">{table.kind === 'view' ? '📋' : '🗄️'}</span>
        <span className="text-xs font-semibold text-white truncate">{table.name}</span>
        <span className="text-[9px] text-zinc-500 ml-auto">
          {selectedColumns.length}/{table.columns.length}
        </span>
      </div>
      <div className="max-h-[300px] overflow-y-auto py-1">
        {table.columns.map((col) => (
          <ColumnRow
            key={col.name}
            col={col}
            isSelected={selectedColumns.includes(col.name)}
            isPK={pkColumns.has(col.name)}
            isFK={fkColumns.has(col.name)}
            tableName={table.name}
            onToggle={onToggleColumn}
          />
        ))}
      </div>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
