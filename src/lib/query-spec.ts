export type AggregateFunction = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'count_distinct';

export type SelectField = {
  column: string;
  alias?: string;
  aggregate?: AggregateFunction;
};

export type JoinClause = {
  table: string;
  on: string;
  type?: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
};

export type FilterOperator = '=' | '!=' | '<>' | '>' | '>=' | '<' | '<='
  | 'like' | 'ilike' | 'in' | 'is_null' | 'is_not_null' | 'between';

export type FilterLogic = 'AND' | 'OR';

export type FilterRule = {
  column: string;
  op: FilterOperator;
  value?: string;
  logic?: FilterLogic;
  table?: string;
};

export type OrderDirection = 'asc' | 'desc';

export type OrderClause = {
  column: string;
  direction?: OrderDirection;
  table?: string;
};

export type QuerySpec = {
  table: string;
  select?: SelectField[];
  joins?: JoinClause[];
  filters?: FilterRule[];
  groupBy?: string[];
  orderBy?: OrderClause[];
  limit?: number;
};

export function defaultQuerySpec(table: string): QuerySpec {
  return {
    table,
    select: [{ column: '*', alias: undefined }],
    joins: [],
    filters: [],
    groupBy: [],
    orderBy: [],
    limit: undefined,
  };
}

export function validateQuerySpec(spec: unknown): spec is QuerySpec {
  if (typeof spec !== 'object' || spec === null) return false;
  const s = spec as Record<string, unknown>;
  if (typeof s.table !== 'string' || s.table === '') return false;
  if (s.select !== undefined && !Array.isArray(s.select)) return false;
  if (s.joins !== undefined && !Array.isArray(s.joins)) return false;
  if (s.filters !== undefined && !Array.isArray(s.filters)) return false;
  if (s.groupBy !== undefined && !Array.isArray(s.groupBy)) return false;
  if (s.orderBy !== undefined && !Array.isArray(s.orderBy)) return false;
  if (s.limit !== undefined && typeof s.limit !== 'number') return false;
  return true;
}

export function describeQuerySpec(spec: QuerySpec): string {
  const parts: string[] = [];
  parts.push(`FROM ${spec.table}`);
  if (spec.select && spec.select.length > 0 && !(spec.select.length === 1 && spec.select[0].column === '*')) {
    const cols = spec.select.map((f) => {
      const agg = f.aggregate ? `${f.aggregate}(${f.column})` : f.column;
      return f.alias ? `${agg} AS ${f.alias}` : agg;
    });
    parts.push(`SELECT ${cols.join(', ')}`);
  }
  if (spec.joins && spec.joins.length > 0) {
    spec.joins.forEach((j) => parts.push(`${j.type ?? 'INNER'} JOIN ${j.table} ON ${j.on}`));
  }
  if (spec.filters && spec.filters.length > 0) {
    const clauses: string[] = [];
    spec.filters.forEach((f, i) => {
      const clause = `${f.column} ${f.op} ${f.value ?? ''}`;
      if (i > 0) clauses.push(spec.filters![i - 1].logic ?? 'AND');
      clauses.push(clause);
    });
    parts.push(`WHERE ${clauses.join(' ')}`);
  }
  if (spec.groupBy && spec.groupBy.length > 0) {
    parts.push(`GROUP BY ${spec.groupBy.join(', ')}`);
  }
  if (spec.orderBy && spec.orderBy.length > 0) {
    const orders = spec.orderBy.map((o) => `${o.column} ${(o.direction ?? 'asc').toUpperCase()}`);
    parts.push(`ORDER BY ${orders.join(', ')}`);
  }
  if (spec.limit) parts.push(`LIMIT ${spec.limit}`);
  return parts.join('\n');
}
