'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';

import {createClient} from '@/lib/supabase/server';

const LOGIN_ERRORS: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  'Invalid login credentials': 'Email o contraseña incorrectos.',
  email_not_confirmed: 'Confirmá tu email antes de entrar.',
  'Email not confirmed': 'Confirmá tu email antes de entrar.',
  over_email_send_rate_limit:
    'Demasiados intentos. Esperá un momento y probá de nuevo.',
  over_request_rate_limit:
    'Demasiados intentos. Esperá un momento y probá de nuevo.',
};

export async function login(
  prevState: {error: string} | undefined,
  formData: FormData,
) {
  const supabase = await createClient();

  const data = {
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  };

  const {error} = await supabase.auth.signInWithPassword(data);

  if (error) {
    const key = error.code ?? error.message;
    const message =
      LOGIN_ERRORS[key] ??
      LOGIN_ERRORS[error.message] ??
      'No se pudo iniciar sesión. Intentalo de nuevo.';
    console.error(`[auth] login fallido (${error.code}): ${error.message}`);
    return {error: message};
  }

  const next = String(formData.get('next') ?? '');
  const target = next.startsWith('/') && !next.startsWith('//') ? next : '/builder';

  revalidatePath('/', 'layout');
  redirect(target);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}