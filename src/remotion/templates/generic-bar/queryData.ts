import type {SupabaseClient} from '@supabase/supabase-js';

export type GenericBarProps = {
  title: string;
  series: {label: string; value: number; color?: string}[];
  numberFormat?: string;
};

export async function queryData(
  _supabase: SupabaseClient,
  _options: Record<string, unknown>,
): Promise<GenericBarProps> {
  return {title: '', series: []};
}
