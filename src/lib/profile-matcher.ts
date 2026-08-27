import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';

export type DataProfile = {
  requiredColumns?: string[];
  optionalColumns?: string[];
  columnHints?: {
    label?: string[];
    value?: string[];
  };
  minRows?: number;
  maxRows?: number;
  rowMatch?: 'exact' | 'range' | 'at_least';
};

export type MatchResult = {
  templateId: TemplateId;
  score: number;
  reasons: string[];
};

const ALIAS_MAP: Record<string, string[]> = {
  label: ['name', 'champion', 'wrestler', 'title', 'promotion', 'category', 'item', 'key', 'group'],
  value: ['wins', 'count', 'total', 'days', 'defenses', 'score', 'amount', 'sum', 'avg', 'metric', 'duration'],
  date: ['start', 'end', 'date', 'year', 'month', 'period', 'start_date', 'end_date'],
  row: ['promotion', 'category', 'group', 'name', 'wrestler', 'champion'],
  col: ['year', 'month', 'period', 'date', 'event'],
};

function normalizeColumn(col: string): string {
  const lower = col.toLowerCase();
  for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
    if (lower === canonical || aliases.includes(lower)) return canonical;
  }
  return lower;
}

function getColumnType(data: Record<string, unknown>[], col: string): 'number' | 'text' | 'date' | 'unknown' {
  if (data.length === 0) return 'unknown';
  const sample = data.slice(0, 10).map((r) => r[col]);
  const numbers = sample.filter((v) => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v !== ''));
  if (numbers.length > sample.length * 0.7) return 'number';
  const dates = sample.filter((v) => {
    if (typeof v !== 'string') return false;
    const d = new Date(v);
    return !isNaN(d.getTime()) && v.length >= 8;
  });
  if (dates.length > sample.length * 0.7) return 'date';
  return 'text';
}

function scoreTemplate(
  templateId: TemplateId,
  columns: string[],
  normalizedColumns: string[],
  dataLength: number,
  colTypes: Record<string, string>,
): MatchResult {
  const entry = TEMPLATES[templateId];
  if (!entry) return {templateId, score: 0, reasons: ['Template not found']};

  const profile = entry.meta.dataProfile as DataProfile | undefined;
  if (!profile) return {templateId, score: 0, reasons: ['No data profile']};

  let score = 0;
  const reasons: string[] = [];

  // Check required columns
  if (profile.requiredColumns) {
    const matchedRequired = profile.requiredColumns.filter((rc) => normalizedColumns.includes(rc));
    const matchRatio = matchedRequired.length / profile.requiredColumns.length;
    score += matchRatio * 50;
    if (matchRatio === 1) {
      reasons.push(`All required columns matched: ${profile.requiredColumns.join(', ')}`);
    } else {
      reasons.push(`Missing required: ${profile.requiredColumns.filter((rc) => !normalizedColumns.includes(rc)).join(', ')}`);
    }
  }

  // Check column hints (bonus for matching types)
  if (profile.columnHints) {
    for (const [role, expectedTypes] of Object.entries(profile.columnHints)) {
      const matchingCols = normalizedColumns.filter((nc) => nc === role);
      for (const mc of matchingCols) {
        const origCol = columns[normalizedColumns.indexOf(mc)];
        if (origCol && expectedTypes.includes(colTypes[origCol] ?? 'unknown')) {
          score += 10;
          reasons.push(`Type match for ${role}: ${colTypes[origCol]}`);
        }
      }
    }
  }

  // Check row count
  if (profile.minRows !== undefined) {
    if (profile.rowMatch === 'exact') {
      if (dataLength === profile.minRows) {
        score += 25;
        reasons.push(`Exact row match: ${dataLength}`);
      } else {
        score -= 10;
        reasons.push(`Expected exactly ${profile.minRows} rows, got ${dataLength}`);
      }
    } else if (profile.rowMatch === 'range') {
      const max = profile.maxRows ?? profile.minRows * 3;
      if (dataLength >= profile.minRows && dataLength <= max) {
        score += 20;
        reasons.push(`Row count in range: ${dataLength} [${profile.minRows}-${max}]`);
      } else if (dataLength < profile.minRows) {
        score -= 15;
        reasons.push(`Too few rows: ${dataLength} < ${profile.minRows}`);
      }
    } else if (profile.rowMatch === 'at_least') {
      if (dataLength >= profile.minRows) {
        score += 15;
        reasons.push(`Row count meets minimum: ${dataLength} >= ${profile.minRows}`);
      } else {
        score -= 15;
        reasons.push(`Too few rows: ${dataLength} < ${profile.minRows}`);
      }
    }
  }

  return {templateId, score, reasons};
}

export function matchTemplates(
  columns: string[],
  data: Record<string, unknown>[],
): MatchResult[] {
  const normalizedColumns = columns.map(normalizeColumn);
  const colTypes: Record<string, string> = {};
  for (const col of columns) {
    colTypes[col] = getColumnType(data, col);
  }

  const allTemplateIds = Object.keys(TEMPLATES) as TemplateId[];
  const results = allTemplateIds.map((id) =>
    scoreTemplate(id, columns, normalizedColumns, data.length, colTypes),
  );

  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function suggestBestTemplate(
  columns: string[],
  data: Record<string, unknown>[],
): TemplateId | null {
  const results = matchTemplates(columns, data);
  return results[0]?.templateId ?? null;
}
