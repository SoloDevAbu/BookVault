import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  const { pathname } = request.nextUrl

  // Protect /admin route - only admins can access
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
    
    if (token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect /dashboard route - only authenticated users can access
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/signin', request.url))
    }
  }

  // Allow all other routes
  return NextResponse.next()
}

// Specify which paths to run the middleware on
export const config = {
  matcher: [
    '/admin/:path*', 
    '/dashboard/:path*',
    '/book/:path*' // Also protect book detail pages if needed
  ],
} 