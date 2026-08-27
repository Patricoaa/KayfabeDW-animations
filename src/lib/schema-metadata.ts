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
  referencedBy: ForeignKeyInfo[];
};

export type SchemaMetadata = {
  tables: TableInfo[];
};

export type DataProfile = {
  requiredColumns: string[];
  optionalColumns?: string[];
  minRows: number;
  maxRows?: number;
  columnHints?: {
    label?: ('text' | 'number' | 'date')[];
    value?: ('number')[];
  };
  autoMap: Record<string, string>;
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

export function getRelatedTables(tables: TableInfo[], tableName: string): TableInfo[] {
  const table = getTableByName(tables, tableName);
  if (!table) return [];

  const related = new Set<string>();

  for (const fk of table.foreignKeys) {
    related.add(fk.refTable);
  }
  for (const rb of table.referencedBy) {
    related.add(rb.fromTable);
  }

  return Array.from(related)
    .map((name) => getTableByName(tables, name))
    .filter((t): t is TableInfo => t !== undefined);
}

export function findJoinPath(
  tables: TableInfo[],
  fromTable: string,
  toTable: string,
): ForeignKeyInfo | null {
  const from = getTableByName(tables, fromTable);
  if (!from) return null;

  const directFk = from.foreignKeys.find((fk) => fk.refTable === toTable);
  if (directFk) return directFk;

  const to = getTableByName(tables, toTable);
  if (!to) return null;

  const reverseFk = to.foreignKeys.find((fk) => fk.refTable === fromTable);
  if (reverseFk) {
    return {
      column: reverseFk.refColumn,
      refTable: toTable,
      refColumn: reverseFk.column,
    };
  }

  return null;
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

export function isBooleanType(type: string): boolean {
  return /^bool/.test(type);
}

export function checkDataCompatibility(
  data: Record<string, unknown>[],
  profile: DataProfile,
): { compatible: boolean; missingColumns: string[]; rowIssue?: string } {
  if (data.length === 0) {
    return { compatible: false, missingColumns: profile.requiredColumns, rowIssue: 'Sin datos' };
  }

  const columns = Object.keys(data[0]);
  const missingColumns = profile.requiredColumns.filter((c) => !columns.includes(c));

  let rowIssue: string | undefined;
  if (data.length < profile.minRows) {
    rowIssue = `Se necesitan al menos ${profile.minRows} filas, hay ${data.length}`;
  } else if (profile.maxRows && data.length > profile.maxRows) {
    rowIssue = `Máximo ${profile.maxRows} filas, hay ${data.length}`;
  }

  return {
    compatible: missingColumns.length === 0 && !rowIssue,
    missingColumns,
    rowIssue,
  };
}
