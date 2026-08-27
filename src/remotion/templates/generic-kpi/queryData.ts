import type {SupabaseClient} from '@supabase/supabase-js';

export type GenericKpiProps = {
  title: string;
  value: number;
  suffix?: string;
  color?: string;
};

export async function queryData(
  _supabase: SupabaseClient,
  _options: Record<string, unknown>,
): Promise<GenericKpiProps> {
  return {title: '', value: 0};
}
