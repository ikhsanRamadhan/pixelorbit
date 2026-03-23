/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse, NextRequest } from 'next/server';

// List of allowed origins for CORS
const allowedOrigins = [
    'http://localhost:3000',
    'https://pixelorbit.com',
    'https://pixelorbit.vercel.app',
    'https://pixelorbit.xyz',
    'https://www.pixelorbit.xyz',
    'https://www.pixelorbit.com',
    'https://www.pixelorbit.vercel.app',
    // Add your production domains here
];

// Protected routes that require wallet authentication
const protectedRoutes = ['/dashboard'];

function hasWalletCookie(request: NextRequest): boolean {
    try {
        const accountId = request.cookies.get('accountId')?.value;
        return !!accountId && accountId.length > 0;
    } catch (error) {
        console.error('Error checking wallet cookie:', error);
        return false;
    }
};

export async function proxy(request: NextRequest) {
    const response = NextResponse.next();
    const pathname = request.nextUrl.pathname;

    // Check if this is a protected route
    const isProtectedRoute = protectedRoutes.some(route => 
        pathname.startsWith(route)
    );
    
    // Handle authentication for protected routes
    if (isProtectedRoute) {
        // Simple check: only verify if wallet cookie exists
        // The actual database verification will happen in the page component
        if (!hasWalletCookie(request)) {
            // Redirect to login/connect wallet page
            const loginUrl = new URL('/', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }
        
        // Add user accountID to response headers for use in components
        const accountId = request.cookies.get('accountId')?.value;
        if (accountId) {
            response.headers.set('x-user-wallet', accountId);
        }
    }
    
    // CORS headers for API routes
    if (pathname.startsWith('/api/')) {
        // Get the origin from the request
        const origin = request.headers.get('origin') || '';
        
        // Check if the origin is allowed or if it's localhost (development)
        const isAllowedOrigin = allowedOrigins.includes(origin) || 
                                origin.startsWith('http://localhost:') ||
                                origin.startsWith('http://127.0.0.1:');
        
        // Set CORS headers
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set(
            'Access-Control-Allow-Origin',
            isAllowedOrigin ? origin : allowedOrigins[0]
        );
        response.headers.set(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        );
        response.headers.set(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
        );
        
        // Handle OPTIONS request (preflight)
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, {
                status: 200,
                headers: response.headers,
            });
        }
    }

    // Add security headers for all routes
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy - always apply but less restrictive for development
    const isLocalhost = request.nextUrl.hostname === 'localhost' || 
                        request.nextUrl.hostname === '127.0.0.1' ||
                        request.nextUrl.hostname.includes('localhost');
    
    if (!isLocalhost) {
        // Production CSP - more restrictive
        response.headers.set(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: wss:;"
        );
        response.headers.set(
            'Content-Security-Policy',
            "default-src 'self'; frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https: wss:;"
        );
        
    } else {
        // Development CSP - more permissive
        response.headers.set(
            'Content-Security-Policy',
            "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: wss: ws:;"
        );
        response.headers.set(
            'Content-Security-Policy',
            "default-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: wss: ws:;"
        );
    }
    
    return response;
}

// Configure the middleware to run on specific routes
export const config = {
    matcher: [
        // Apply to all API routes
        '/api/:path*',
        // Apply to protected routes
        '/dashboard/:path*',
        // Apply to all HTML pages
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
    ],
};