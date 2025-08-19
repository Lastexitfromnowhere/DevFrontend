import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // TEMPORAIREMENT DÉSACTIVÉ - Le middleware interfère avec Google OAuth
  // TODO: Implémenter une vérification d'auth côté client uniquement
  return NextResponse.next();
  
  /* 
  const { pathname } = request.nextUrl;
  
  // Pages qui ne nécessitent pas d'authentification
  const publicPaths = ['/login', '/about', '/contact', '/terms', '/privacy-policy'];
  
  // Vérifier si la page courante est publique
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // Si c'est une page publique, laisser passer
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Vérifier l'authentification via les cookies ou headers
  const jwtToken = request.cookies.get('jwt_token')?.value || 
                   request.headers.get('authorization')?.replace('Bearer ', '');
  
  // Vérifier aussi dans les headers personnalisés (pour le localStorage côté client)
  const isGoogleWallet = request.headers.get('x-google-wallet') === 'true';
  const hasStoredToken = request.headers.get('x-has-token') === 'true';
  
  // Si aucun token n'est trouvé, rediriger vers login
  if (!jwtToken && !isGoogleWallet && !hasStoredToken) {
    const loginUrl = new URL('/login', request.url);
    
    // Ajouter l'URL de retour comme paramètre de requête
    if (pathname !== '/') {
      loginUrl.searchParams.set('returnUrl', pathname);
    }
    
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
  */
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
};
