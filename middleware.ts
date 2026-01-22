import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const authCookie = request.cookies.get('bayon_auth');
    const { pathname } = request.nextUrl;

    // Allow access to login page and public assets
    if (
        pathname.startsWith('/login') ||
        pathname.includes('.') // for static assets like images, icons, etc.
    ) {
        return NextResponse.next();
    }

    // Redirect to login if not authenticated
    if (!authCookie) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
