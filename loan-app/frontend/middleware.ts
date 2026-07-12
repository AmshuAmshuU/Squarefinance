import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;

  const url = request.nextUrl;

  // If already logged in → skip login page
  if (url.pathname === '/admin/login' && token) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Protect admin routes
  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login') && !token) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}
export const config = {
  matcher: ['/admin/:path*'],
};