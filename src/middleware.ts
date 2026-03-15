import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // Aggiorna la sessione Supabase
  const response = await updateSession(request);

  // Percorsi pubblici che non richiedono autenticazione
  const publicPaths = ['/login', '/registrati', '/forgot-password'];
  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname.startsWith(path),
  );

  // Se è un percorso pubblico, consenti l'accesso
  if (isPublicPath) {
    return response;
  }

  // Per altri percorsi, potremmo aggiungere logica di autenticazione
  // Ma per ora lasciamo il middleware semplice e gestiamo l'auth lato client
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)',
  ],
};
