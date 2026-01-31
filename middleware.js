import { NextResponse } from 'next/server';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/_next', '/api', '/login', '/favicon.ico', '/_static', '/styles'];

export function middleware(req){
  const { pathname } = req.nextUrl;

  // Allow public paths
  for(const p of PUBLIC_PATHS){
    if(pathname.startsWith(p)) return NextResponse.next();
  }

  // If auth cookie missing, redirect to /login
  const auth = req.cookies.get('auth');
  if(!auth) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
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
