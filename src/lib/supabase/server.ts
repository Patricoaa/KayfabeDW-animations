import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

import {SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv} from '@/lib/config';

export async function createClient() {
  assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({name, value, options}) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component; safe to ignore when
          // proxy is responsible for refreshing sessions.
        }
      },
    },
  });
}