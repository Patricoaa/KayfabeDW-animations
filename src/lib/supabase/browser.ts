import {createBrowserClient} from '@supabase/ssr';

import {SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv} from '@/lib/config';

export function createClient() {
  assertSupabaseEnv();
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}