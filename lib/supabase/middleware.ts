import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // Allow auth pages and API routes
  const publicPaths = ['/auth']
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))
  const isApiRoute = pathname.startsWith('/api')

  try {
    // Add timeout to prevent 504 errors
    const userPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 3000) // 3 second timeout
    )

    const { data: { user } } = await Promise.race([userPromise, timeoutPromise]) as any

    // Redirect authenticated users from root to dashboard
    if (user && pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Redirect authenticated users from auth pages to dashboard
    // BUT allow /auth/onboarding for new users
    if (user && pathname.startsWith('/auth') && pathname !== '/auth/onboarding') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Redirect unauthenticated users from protected routes to landing page
    if (!user && !isPublicPath && !isApiRoute && pathname !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

  } catch (error) {
    console.error('Middleware auth check failed:', error)
    // On error, allow the request through for public paths
    // For protected paths, redirect to home
    if (!isPublicPath && !isApiRoute && pathname !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

