import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = [
  '/dashboard',
  '/attendance',
  '/concepts',
  '/emergency-contacts',
  '/finances',
  '/health',
  '/medications',
  '/members',
  '/membership-plans',
  '/memberships',
  '/payment-records',
  '/products',
  '/progress',
  '/routines',
  '/schedules',
  '/services',
  '/trainers',
  '/training-goals',
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function readToken(token: string) {
  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return null;
    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number; role?: string };
    if (payload.exp && payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('fg_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const payload = accessToken ? readToken(decodeURIComponent(accessToken)) : null;
  const hasSession = Boolean(payload || refreshToken);

  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('fg_token');
    return response;
  }

  if (pathname === '/login' && hasSession) {
    const destination = payload?.role?.toUpperCase() === 'TRAINER' ? '/routines' : '/dashboard';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/attendance/:path*',
    '/concepts/:path*',
    '/emergency-contacts/:path*',
    '/finances/:path*',
    '/health/:path*',
    '/medications/:path*',
    '/members/:path*',
    '/membership-plans/:path*',
    '/memberships/:path*',
    '/payment-records/:path*',
    '/products/:path*',
    '/progress/:path*',
    '/routines/:path*',
    '/schedules/:path*',
    '/services/:path*',
    '/trainers/:path*',
    '/training-goals/:path*',
  ],
};