export type ColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
};

export type ForeignKeyInfo = {
  column: string;
  refTable: string;
  refColumn: string;
};

export type TableInfo = {
  name: string;
  kind: 'table' | 'view';
  columns: ColumnInfo[];
  primaryKey: string[];
  foreignKeys: ForeignKeyInfo[];
};

export type SchemaMetadata = {
  tables: TableInfo[];
};

let cached: SchemaMetadata | null = null;

export async function getSchemaMetadata(): Promise<SchemaMetadata> {
  if (cached) return cached;

  const res = await fetch('/api/schema-metadata');
  if (!res.ok) throw new Error(`Failed to fetch schema metadata: ${res.status}`);
  cached = (await res.json()) as SchemaMetadata;
  return cached;
}

export function invalidateSchemaCache() {
  cached = null;
}

export function getTableByName(tables: TableInfo[], name: string): TableInfo | undefined {
  return tables.find((t) => t.name === name);
}

export function getColumnsForTable(table: TableInfo): ColumnInfo[] {
  return table.columns;
}

export function getForeignKey(tables: TableInfo[], fromTable: string, column: string): ForeignKeyInfo | undefined {
  const table = getTableByName(tables, fromTable);
  return table?.foreignKeys.find((fk) => fk.column === column);
}

export function getTablesByKind(tables: TableInfo[], kind: 'table' | 'view'): TableInfo[] {
  return tables.filter((t) => t.kind === kind);
}

export function isNumericType(type: string): boolean {
  return /^(int|bigint|smallint|numeric|decimal|real|double|float|serial|bigserial)/.test(type);
}

export function isDateType(type: string): boolean {
  return /^(date|timestamp|timestamptz|time|timetz)/.test(type);
}

export function isTextType(type: string): boolean {
  return /^(text|char|varchar|character)/.test(type);
}
