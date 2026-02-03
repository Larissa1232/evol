import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/_next', '/api', '/login', '/favicon.ico', '/_static', '/styles'];

// Simple in-memory rate limiter (per-process). For production, use Redis or external store.
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 60);
const ipRequests = new Map();

function isPublicPath(pathname) {
  for (const p of PUBLIC_PATHS) if (pathname.startsWith(p)) return true;
  return false;
}

function verifySignedCookie(cookieValue) {
  if (!cookieValue) return false;
  // expect format: <payload>.<hexsig>
  const parts = String(cookieValue).split('.');
  if (parts.length < 2) return false;
  const sig = parts.pop();
  const payload = parts.join('.');
  const secret = String(process.env.COOKIE_SIGNING_SECRET || '').trim();
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(sig), 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b) ? payload : false;
  } catch (e) {
    return false;
  }
}

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  // Basic rate limiting per client IP
  const ip = req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const entry = ipRequests.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count += 1;
  }
  ipRequests.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  // If auth cookie missing or invalid, redirect to /login and clear cookie
  const authCookie = req.cookies.get('auth');
  const auth = authCookie && authCookie.value ? authCookie.value : authCookie || null;
  if (!auth) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const verified = verifySignedCookie(auth);
  if (!verified) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    const res = NextResponse.redirect(url);
    try { res.cookies.set('auth', '', { path: '/', maxAge: 0 }); } catch (e) { }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/minha-conta',
    '/game',
    '/game/:path*',
    '/products',
    '/transactions',
    '/doacoes',
    '/:path*' // you can narrow this as needed
  ]
};
