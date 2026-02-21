import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  let cookie = request.cookies.get('token')
  const response = NextResponse.next()
  if (!cookie && !request.nextUrl.pathname.startsWith('/Login')) {
    return NextResponse.redirect(new URL('/Login', request.url))
  }
  if (cookie) {
    if (request.nextUrl.pathname.startsWith('/Login')) {
      return NextResponse.redirect(new URL('/Admin', request.url))
    }
    return response;
  }
  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/', '/Login', '/Admin/:path*'],
}