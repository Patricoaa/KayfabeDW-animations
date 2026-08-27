import {createServerClient} from '@supabase/ssr';
import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {SUPABASE_ANON_KEY, SUPABASE_URL} from '@/lib/config';

/**
 * Session guard. Protects every page + API route except /login and static
 * assets. API routes get a JSON 401; pages get a redirect to /login.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({request});

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Missing env: fail closed (redirect to login acts as a soft block).
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({error: 'Servidor mal configurado'}, {status: 500});
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({name, value}) => request.cookies.set(name, value));
        response = NextResponse.next({request});
        cookiesToSet.forEach(({name, value, options}) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: {user},
  } = await supabase.auth.getUser();

  const {pathname} = request.nextUrl;

  if (user) {
    return response;
  }

  // Allow /login and the login server action through while signed out.
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return response;
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({error: 'No autorizado'}, {status: 401});
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') {
    loginUrl.searchParams.set('next', pathname ?? '/');
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|woff2?|ttf)$).*)',
  ],
};