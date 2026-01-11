import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // Skip middleware for static files and API routes
    const { pathname } = request.nextUrl

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/verify-email']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    // Skip for API routes
    if (pathname.startsWith('/api')) {
        return NextResponse.next()
    }

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
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

    // Use getSession instead of getUser - it's faster and uses cached data
    const { data: { session } } = await supabase.auth.getSession()

    // Root path - redirect based on auth status
    if (pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = session ? '/dashboard' : '/login'
        return NextResponse.redirect(url)
    }

    // Authenticated user trying to access login page
    if (session && pathname === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // Unauthenticated user trying to access protected route
    if (!session && !isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static, _next/image (Next.js internals)
         * - favicon.ico, public assets
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
}
