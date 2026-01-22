import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Check for Supabase Auth cookie
    // The name pattern is 'sb-<project-ref>-auth-token'
    const authSession = request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
    const { pathname } = request.nextUrl;

    // Allow access to login page and public assets
    if (
        pathname.startsWith('/login') ||
        pathname.includes('.') // for static assets
    ) {
        return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!authSession) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
