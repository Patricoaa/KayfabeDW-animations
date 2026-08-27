import type {SupabaseClient} from '@supabase/supabase-js';

export type GenericLineProps = {
  title: string;
  series: {label: string; value: number; color?: string}[];
  numberFormat?: string;
};

export async function queryData(
  _supabase: SupabaseClient,
  _options: Record<string, unknown>,
): Promise<GenericLineProps> {
  return {title: '', series: []};
}
