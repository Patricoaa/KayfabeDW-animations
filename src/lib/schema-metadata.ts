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

export type ReverseForeignKeyInfo = {
  column: string;
  fromTable: string;
  fromColumn: string;
};

export type TableInfo = {
  name: string;
  kind: 'table' | 'view';
  columns: ColumnInfo[];
  primaryKey: string[];
  foreignKeys: ForeignKeyInfo[];
  referencedBy: ReverseForeignKeyInfo[];
  viewRefs?: {table: string; kind?: 'table' | 'view'}[];
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
  for (const t of cached.tables) {
    t.foreignKeys ??= [];
    t.referencedBy ??= [];
    t.primaryKey ??= [];
    t.columns ??= [];
  }
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

export function getViewSourceTables(
  tables: TableInfo[],
  viewName: string,
): TableInfo[] {
  const view = getTableByName(tables, viewName);
  if (!view || view.kind !== 'view' || !view.viewRefs) return [];
  return view.viewRefs
    .map((ref) => getTableByName(tables, ref.table))
    .filter((t): t is TableInfo => t !== undefined);
}

export function getSuggestedJoin(
  tables: TableInfo[],
  fromTable: string,
  toTable: string,
): {sourceColumn: string; targetColumn: string} | null {
  const from = getTableByName(tables, fromTable);
  const to = getTableByName(tables, toTable);
  if (!from || !to) return null;

  const fk = from.foreignKeys.find((f) => f.refTable === toTable);
  if (fk) return {sourceColumn: fk.column, targetColumn: fk.refColumn};

  const reverseFk = to.foreignKeys.find((f) => f.refTable === fromTable);
  if (reverseFk) return {sourceColumn: reverseFk.refColumn, targetColumn: reverseFk.column};

  return null;
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

/**
 * Multiplicity of the relationship between two tables, from the perspective of
 * `fromTable → toTable`. Deduced from FK metadata:
 * - `fromTable` holds a foreign key pointing at `toTable` ⇒ many `from` per one `to` (N:1).
 * - `toTable` holds a foreign key pointing at `fromTable` ⇒ one `from` per many `to` (1:N).
 * - Both directions present ⇒ N:N (e.g. a join-table pattern).
 * - Neither ⇒ unknown.
 */
export function getRelationCardinality(
  tables: TableInfo[],
  fromTable: string,
  toTable: string,
): '1:1' | '1:N' | 'N:1' | 'N:N' | 'unknown' {
  const from = getTableByName(tables, fromTable);
  const to = getTableByName(tables, toTable);
  if (!from || !to) return 'unknown';

  const fromHasFkTo = from.foreignKeys.some((fk) => fk.refTable === toTable);
  const toHasFkTo = to.foreignKeys.some((fk) => fk.refTable === fromTable);

  if (fromHasFkTo && toHasFkTo) return 'N:N';
  if (fromHasFkTo) return 'N:1';
  if (toHasFkTo) return '1:N';
  return 'unknown';
}

/**
 * Depth (distance in the JOIN graph) of each table relative to the FROM table.
 * The FROM table has depth 0; each JOIN target is one deeper than its source.
 * The deepest table(s) are the most granular — an entity count of any shallower
 * table is inflated by the fan-out unless it is aggregated with count_distinct.
 */
export function getTableDepth(
  tables: TableInfo[],
  spec: {table: string; joins?: {table: string; on?: string}[]},
): Record<string, number> {
  const depth: Record<string, number> = {};
  const root = spec.table;
  if (!root) return depth;
  depth[root] = 0;

  const joins = spec.joins ?? [];
  if (joins.length === 0) return depth;

  // Build an adjacency from each source (the table named in the ON clause) to
  // the join target, so we can walk the graph even if the FROM root isn't
  // explicitly listed as a source.
  const adjacency = new Map<string, string[]>();
  const ensure = (t: string) => {
    if (!adjacency.has(t)) adjacency.set(t, []);
    return adjacency.get(t)!;
  };
  for (const j of joins) {
    const sourceMatch = /([A-Za-z_][A-Za-z0-9_]*)\./.exec(j.on ?? '');
    const source = sourceMatch ? sourceMatch[1] : root;
    ensure(source).push(j.table);
  }

  const queue = [root];
  while (queue.length) {
    const cur = queue.shift()!;
    const curDepth = depth[cur];
    for (const next of adjacency.get(cur) ?? []) {
      if (depth[next] === undefined) {
        depth[next] = curDepth + 1;
        queue.push(next);
      }
    }
  }
  return depth;
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
