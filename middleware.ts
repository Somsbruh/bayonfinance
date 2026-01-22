import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check for Supabase Auth cookie
    // Next.js with Supabase Auth usually sets a cookie like sb-<project>-auth-token
    const cookies = request.cookies.getAll();
    const authSession = cookies.some(c =>
        (c.name.startsWith('sb-') && c.name.endsWith('-auth-token')) ||
        c.name === 'supabase-auth-token'
    );

    const { pathname } = request.nextUrl;

    // Allow access to login page, public assets, and root redirections if needed
    if (
        pathname === '/login' ||
        pathname.startsWith('/_next') ||
        pathname.includes('.') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next();
    }

    // Redirect to login if no auth session cookie found
    if (!authSession) {
        const loginUrl = new URL('/login', request.url);
        // Important: preserve the attempted URL for later redirect
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
