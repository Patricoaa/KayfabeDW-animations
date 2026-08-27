import {redirect} from 'next/navigation';

import {createClient} from '@/lib/supabase/server';

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: {user},
    error,
  } = await supabase.auth.getUser();
  if (!user) {
    console.error('[requireUser] no user, error:', JSON.stringify(error));
    redirect('/login');
  }
  return supabase;
}