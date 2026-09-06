import type {ChartConfig} from './chart-config';
import {TEMPLATES} from '@/remotion/generated/registry';
import type {TemplateId} from '@/remotion/generated/registry';
import {matchTemplates} from './profile-matcher';
import type {AnimationTemplateConfig, TimelineRaceConfig} from './animation-config';

export type RemotionInputProps = {
  templateId: string;
  props: Record<string, unknown>;
};

// Resolve an image-URL column value to a usable avatar URL (mirrors the static
// bar-chart avatar convention: only absolute/data/root-relative URLs count).
function avatarUrlOf(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  if (t === '') return null;
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:image/') || t.startsWith('/')) return t;
  return null;
}

function isImageUrl(value: unknown): boolean {
  return avatarUrlOf(value) != null;
}

// Pick the "Entidad / etiqueta" column (the participant label) for a timeline
// race. An explicit per-template mapping wins; otherwise we inherit the
// static xField — but we never pick an image/URL column (common when the
// static chart plots image URLs as labels), a purely numeric column, or a
// date/time column (JSONB normalizes object keys by length/alphabetically, so
// a layout like [wins, imagen_url, match_date, wrestler_name] must not land on
// match_date — that would turn every row into its own bar).
//
// Enriched views (e.g. v_wrestler_wins) also carry catalog columns — gender,
// result, participant_type... — whose distinct-count heuristic would beat the
// entity column on small filtered sets (your 3-wrestler race has only 3 names,
// so a "<6 distinct" cutoff would wrongly reject the entity). The reliable
// signal is avatar identity: a participant maps 1:1 to its image URL, so the
// label must be constant within every group of rows sharing the same avatar,
// while catalog columns vary across the wins/losses of the same wrestler and
// can never satisfy that. Among the survivors we prefer the one with the most
// distinct values (that is the entity), breaking ties by repetition.
function resolveLabelField(
  rows: Record<string, unknown>[],
  config: ChartConfig,
  tc?: TimelineRaceConfig,
): string {
  const push = (f: string | undefined | null) => (f && f.trim() !== '' ? f : undefined);
  const explicit = push(tc?.labelField);
  if (explicit) return explicit;

  const candidates = [push(config.xField), ...Object.keys(rows[0] ?? {})].filter(
    (c): c is string => !!c,
  );
  const isDateName = (f: string) =>
    /date|fecha|inicio|start|time|tiempo|a[ñn]o|dia|d[ií]a/i.test(f);
  const isDateValue = (vals: unknown[]) =>
    vals.some((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim()));
  const isUsable = (f: string) => {
    const vals = rows.map((r) => String(r[f] ?? '').trim()).filter((v) => v !== '');
    if (vals.length === 0) return false;
    if (vals.some((v) => isImageUrl(v))) return false;
    if (vals.some((v) => !isNaN(Number(v)))) return false;
    if (isDateName(f) || isDateValue(vals)) return false;
    return true;
  };

  const detectedImg = candidates.find((f) => rows.some((r) => isImageUrl(r[f])));
  const imageField =
    (tc?.imageField && rows.some((r) => isImageUrl(r[tc.imageField!])))
      ? tc.imageField
      : detectedImg;

  const byImage = new Map<string, Map<string, Set<string>>>();
  if (imageField) {
    for (const row of rows) {
      const img = String(row[imageField] ?? '').trim();
      if (img === '') continue;
      let per = byImage.get(img);
      if (!per) {
        per = new Map();
        byImage.set(img, per);
      }
      for (const f of candidates) {
        let set = per.get(f);
        if (!set) {
          set = new Set();
          per.set(f, set);
        }
        set.add(String(row[f] ?? '').trim());
      }
    }
  }

  const distinctOf = (f: string) =>
    new Set(rows.map((r) => String(r[f] ?? '').trim()).filter((v) => v !== '')).size;
  // Identity-ish column names, used to break ties between equally-distinct
  // candidates (e.g. wrestler_name vs result when no avatar column exists).
  const isIdentityName = (f: string) =>
    /name|nombre|luchador|wrestler|participant|entidad|compet|fighter|player|team|equipo|club/i.test(f);

  const labelLike = new Map<string, number>();
  for (const f of candidates) {
    if (!isUsable(f)) continue;
    const uniq = distinctOf(f);
    if (uniq < 2) continue; // constant column: an attribute, not an identity
    if (imageField) {
      let constantPerAvatar = true;
      for (const per of byImage.values()) {
        const set = per.get(f);
        if (set && set.size > 1) {
          constantPerAvatar = false;
          break;
        }
      }
      if (!constantPerAvatar) continue;
    }
    labelLike.set(f, uniq);
  }

  let best: string | null = null;
  let bestUniq = -1;
  let bestRatio = Infinity;
  let bestIdent = false;

  const consider = (f: string, uniq: number, ratio: number) => {
    const ident = isIdentityName(f);
    let better: boolean;
    if (labelLike.size > 0) {
      // Normal path: most distinct values first; identity-named column breaks
      // ties (e.g. wrestler_name over result when no avatar column exists).
      better =
        uniq > bestUniq ||
        (uniq === bestUniq &&
          ((ident && !bestIdent) || (ident === bestIdent && ratio < bestRatio)));
    } else {
      // Tiny set (single entity filtered): every column is constant, so prefer
      // the first identity-looking usable column, otherwise max distinctness.
      if (ident) better = !bestIdent;
      else if (bestIdent) better = false;
      else better = best === null || uniq > bestUniq || (uniq === bestUniq && ratio < bestRatio);
    }
    if (better) {
      best = f;
      bestUniq = uniq;
      bestRatio = ratio;
      bestIdent = ident;
    }
  };

  if (labelLike.size === 0) {
    for (const f of candidates) {
      if (!isUsable(f)) continue;
      const uniq = distinctOf(f);
      consider(f, uniq, uniq / rows.length);
    }
    return best ?? '';
  }

  for (const [f, uniq] of labelLike) {
    consider(f, uniq, uniq / rows.length);
  }
  return best ?? '';
}

function parseDateValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const t = new Date(value).getTime();
    return isNaN(t) ? null : t;
  }
  const s = String(value).trim();
  if (s === '') return null;
  if (!isNaN(Number(s))) {
    const n = Number(s);
    if (n < 1e10) return null; // not an epoch ms; treat as non-date
    const t = new Date(n).getTime();
    return isNaN(t) ? null : t;
  }
  // ISO 8601 (with or without time)
  const iso = Date.parse(s);
  if (!isNaN(iso)) return iso;
  // DD/MM/YYYY or DD-MM-YYYY (day first — common in es locales)
  const dm = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+.*)?$/);
  if (dm) {
    const [_, d, mo, y] = dm;
    let year = Number(y);
    if (year < 100) year += 2000;
    const t = new Date(year, Number(mo) - 1, Number(d)).getTime();
    if (!isNaN(t)) return t;
  }
  return null;
}

function convertTimelineRace(
  data: Record<string, unknown>[],
  config: ChartConfig,
  tc?: TimelineRaceConfig,
): Record<string, unknown> {
  // Presentation (avatar + canvas) fields shared by every output shape.
  const presentationOf = (t: TimelineRaceConfig | undefined) => ({
    showDateLabel: t?.showDateLabel,
    showXAxis: t?.showXAxis,
    axisPosition: t?.axisPosition,
    maxRows: t?.maxRows,
    holdFinalSeconds: t?.holdFinalSeconds,
    raceDurationSeconds: t?.raceDurationSeconds,
    podiumEffect: t?.podiumEffect,
    showRail: t?.showRail,
    barsX: t?.barsX,
    barsY: t?.barsY,
    rowOrder: t?.rowOrder,
    rowGapH: t?.rowGapH,
    rowGap: t?.rowGap,
    barWidth: t?.barWidth,
    titleX: t?.titleX,
    titleY: t?.titleY,
    subtitle: t?.subtitle,
    subtitleText: t?.subtitleText,
    subtitleX: t?.subtitleX,
    subtitleY: t?.subtitleY,
    dateX: t?.dateX,
    dateY: t?.dateY,
    avatarSize: t?.avatarSize,
    avatarShape: t?.avatarShape,
    avatarRadius: t?.avatarRadius,
    avatarCrops: t?.avatarCrops,
    barColors: t?.barColors,
    barRadius: t?.barRadius,
    barPalette: t?.barPalette,
    barThickness: t?.barThickness,
    valueFormat: t?.valueFormat,
    currencySymbol: t?.currencySymbol,
    backgroundType: t?.backgroundType,
    background: t?.background,
    backgroundSecondary: t?.backgroundSecondary,
    backgroundImage: t?.backgroundImage,
    backgroundPattern: t?.backgroundPattern,
    backgroundAngle: t?.backgroundAngle,
    backgroundOpacity: t?.backgroundOpacity,
    backgroundBlur: t?.backgroundBlur,
    backgroundFit: t?.backgroundFit,
    showYAxis: t?.showYAxis,
    yAxisColor: t?.yAxisColor,
    yAxisWidth: t?.yAxisWidth,
    titleText: t?.titleText,
    dateText: t?.dateText,
  });

  const rows = data ?? [];
  if (rows.length === 0) {
    return {title: (tc?.title || config.title) ?? '', items: [], accentColor: config.colors?.[0] ?? '#FFD700', dateMode: false, ...presentationOf(tc)};
  }

  // Explicit per-template column mapping wins; otherwise fall back to the
  // inherited static xField plus heuristic detection (never an image-URL column).
  const labelField = resolveLabelField(rows, config, tc);
  const valueField = tc?.valueField ?? config.yField;
  const imageField = tc?.imageField;
  const startField =
    tc?.dateField ??
    Object.keys(rows[0]).find((k) =>
      k.toLowerCase().includes('date') || k.toLowerCase().includes('fecha') ||
      k.toLowerCase().includes('inicio') || k.toLowerCase().includes('start'));

  const items = rows
    .map((row) => ({
      label: String(row[labelField] ?? ''),
      image: imageField ? avatarUrlOf(row[imageField]) : null,
      date: startField ? parseDateValue(row[startField]) : null,
      value: Number(row[valueField ?? Object.keys(row)[1] ?? ''] ?? 0),
    }))
    .filter((it) => !isNaN(it.value));

  // dateMode only when we actually parsed dates for at least two rows.
  const dates = items.map((i) => i.date).filter((d): d is number => d != null);
  const dateMode = dates.length >= 2;

  if (!dateMode) {
    // Compat: simple parallel bar ordered by value (no sweeping guide).
    const sorted = [...items].sort((a, b) => b.value - a.value);
    return {
      title: (tc?.title || config.title) ?? '',
      items: sorted,
      accentColor: config.colors?.[0] ?? '#FFD700',
      dateMode: false,
      ...presentationOf(tc),
    };
  }

  const min = Math.min(...dates);
  const max = Math.max(...dates);

  // ---- Accumulate per entity ----
  // Group each entity's events by time period (day/month/year per
  // dateFormat), then compute a running cumulative value so that when the
  // sweeping guide crosses an entity's date, its bar jumps to the total
  // up to that moment. Items are emitted as steps (label repeats); the
  // template renders one row per distinct label.
  const fmt = tc?.dateFormat ?? 'day';
  const periodStart = (t: number, f: typeof fmt): number => {
    const d = new Date(t);
    if (f === 'year') return new Date(d.getFullYear(), 0, 1).getTime();
    if (f === 'month') return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  const byLabel = new Map<string, {image: string | null; steps: {period: number; value: number}[]}>();
  for (const it of items) {
    if (it.date == null || it.label === '') continue;
    let entry = byLabel.get(it.label);
    if (!entry) {
      entry = {image: it.image, steps: []};
      byLabel.set(it.label, entry);
    }
    entry.steps.push({period: periodStart(it.date, fmt), value: it.value});
  }

  const steps: {label: string; image: string | null; date: number; value: number}[] = [];
  for (const [label, entry] of byLabel) {
    // Sum values within each period.
    const summed = new Map<number, number>();
    for (const s of entry.steps) {
      summed.set(s.period, (summed.get(s.period) ?? 0) + s.value);
    }
    const ordered = Array.from(summed.entries()).sort((a, b) => a[0] - b[0]);
    let running = 0;
    for (const [period, v] of ordered) {
      running += v;
      steps.push({label, image: entry.image, date: period, value: running});
    }
  }

  if (steps.length === 0) {
    return {
      title: (tc?.title || config.title) ?? '',
      items: [],
      accentColor: config.colors?.[0] ?? '#FFD700',
      dateMode: true,
      domain: [min, max] as [number, number],
      ...presentationOf(tc),
    };
  }

  const stepDates = steps.map((s) => s.date);
  const sMin = Math.min(...stepDates);
  const sMax = Math.max(...stepDates);

  // Stable sort by value (per-frame ranking happens in the template); here we
  // keep steps grouped by label but ordered by date for a defined output.
  steps.sort((a, b) => a.label.localeCompare(b.label) || a.date - b.date);

  return {
    title: (tc?.title || config.title) ?? '',
    items: steps,
    accentColor: config.colors?.[0] ?? '#FFD700',
    dateMode: true,
    dateFormat: fmt,
    domain: [sMin, sMax] as [number, number],
    ...presentationOf(tc),
  };
}

// Resolve the distinct entities (label + avatar image) of a Timeline Race
// so the config panel can offer per-entity avatar crop controls. Uses the
// same column resolution as convertTimelineRace.
export function getTimelineRaceParticipants(
  data: Record<string, unknown>[],
  config: ChartConfig,
  tc?: TimelineRaceConfig,
): {label: string; image?: string | null}[] {
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const labelField = resolveLabelField(rows, config, tc);
  const imageField = tc?.imageField;
  const seen = new Map<string, true>();
  const out: {label: string; image?: string | null}[] = [];
  for (const row of rows) {
    const label = String(row[labelField] ?? '');
    if (!label || seen.has(label)) continue;
    seen.set(label, true);
    out.push({label, image: imageField ? avatarUrlOf(row[imageField]) : null});
  }
  return out;
}

const CONVERTERS: Record<string, (data: Record<string, unknown>[], config: ChartConfig, templateConfig?: unknown) => Record<string, unknown>> = {
  'timeline-race': (data, config, tc) => convertTimelineRace(data, config, tc as TimelineRaceConfig | undefined),
};

export function getCompatibleTemplates(
  config: ChartConfig,
  data: Record<string, unknown>[],
): {templateId: string; label: string; score: number}[] {
  if (data.length === 0) return [];

  const columns = Object.keys(data[0]);
  const matches = matchTemplates(columns, data);

  return matches.map((m) => {
    const entry = TEMPLATES[m.templateId];
    return {
      templateId: m.templateId,
      label: entry?.meta.name ?? m.templateId,
      score: m.score,
    };
  });
}

export function convertToRemotionProps(
  config: ChartConfig,
  data: Record<string, unknown>[],
  templateId: string,
  templateConfig?: AnimationTemplateConfig,
): RemotionInputProps | null {
  const converter = CONVERTERS[templateId];
  if (!converter) return null;

  const tc = templateId === 'timeline-race' ? templateConfig?.['timeline-race'] : undefined;

  return {
    templateId,
    props: converter(data, config, tc),
  };
}

export function suggestBestTemplate(
  config: ChartConfig,
  data: Record<string, unknown>[],
): string | null {
  const templates = getCompatibleTemplates(config, data);
  return templates[0]?.templateId ?? null;
}
