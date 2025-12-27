import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware:
 * - Ensures ?lang=en exists on home
 * - Does NOT interfere with auth, callbacks, or guest flows
 */

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  if (url.pathname === '/' && !url.searchParams.has('lang')) {
    const clone = url.clone();
    clone.searchParams.set('lang', 'en');
    return NextResponse.redirect(clone);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
