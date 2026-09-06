import type {SupabaseClient} from '@supabase/supabase-js';
import type {RankingItem, RankingProps} from './index';

// Ranking currently renders from the builder's generic data pipeline (the
// converter already maps label/value/image columns). This stub exists so the
// Remotion studio has a registered queryData entry; the standalone path throws
// a clear error instead of guessing a view.
export async function queryData(
  _supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<RankingProps> {
  const raw = options.rows as Record<string, unknown>[] | undefined;
  if (Array.isArray(raw) && raw.length > 0) {
    const labelField = String(options.labelField ?? 'label');
    const valueField = String(options.valueField ?? 'value');
    const imageField = options.imageField ? String(options.imageField) : undefined;
    const items: RankingItem[] = raw
      .map((row) => ({
        label: String(row[labelField] ?? ''),
        image: imageField ? (row[imageField] ? String(row[imageField]) : null) : null,
        value: Number(row[valueField] ?? 0),
      }))
      .filter((it) => !isNaN(it.value) && it.label !== '');
    if (items.length > 0) {
      return {
        title: (options.title as string | undefined) ?? 'Ranking',
        items,
        accentColor: '#FFD700',
      };
    }
  }
  throw new Error('Ranking data comes from the builder (no standalone view wired yet)');
}