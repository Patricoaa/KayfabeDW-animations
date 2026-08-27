'use client';

import {useActionState} from 'react';
import {login} from '@/app/actions/auth';

export function LoginForm({next}: {next?: string}) {
  const [state, formAction, pending] = useActionState(login, undefined);
  const hasError = Boolean(state?.error);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border-default bg-card p-8">
        <div className="pointer-events-none absolute inset-0 p-3" aria-hidden>
          <span className="absolute left-3 top-3 h-4 w-4 border-l-2 border-t-2 border-amber-400/70" />
          <span className="absolute right-3 top-3 h-4 w-4 border-r-2 border-t-2 border-amber-400/70" />
          <span className="absolute bottom-3 left-3 h-4 w-4 border-b-2 border-l-2 border-amber-400/70" />
          <span className="absolute bottom-3 right-3 h-4 w-4 border-b-2 border-r-2 border-amber-400/70" />
        </div>
        <div className="relative">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Kayfabe<span className="text-amber-500">DW</span>{' '}
            <span className="font-mono text-sm text-muted">Animations</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Acceso restringido al generador de videos.
          </p>
          <form action={formAction} className="mt-6 flex flex-col gap-4" aria-busy={pending}>
            <input type="hidden" name="next" value={next ?? ''} />
            <label className="flex flex-col gap-1 text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                aria-invalid={hasError}
                className={`min-h-[36px] mt-1 rounded-lg border bg-input px-3 py-2 text-sm outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 ${
                  hasError
                    ? 'border-red-500'
                    : 'border-border-default'
                }`}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Contraseña
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                aria-invalid={hasError}
                className={`min-h-[36px] mt-1 rounded-lg border bg-input px-3 py-2 text-sm outline-none transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 ${
                  hasError
                    ? 'border-red-500'
                    : 'border-border-default'
                }`}
              />
            </label>
            {state?.error && (
              <p
                role="alert"
                className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500"
              >
                {state.error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {pending ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}