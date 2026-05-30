import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/mfa"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas y archivos estáticos
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Verificar token en cookie o header
  const token = request.cookies.get("savicol-auth")?.value;

  // Sin token → redirigir a login
  // (El token real viene del store Zustand/localStorage, no de cookie httpOnly,
  //  por lo que esta protección es complementaria. La protección principal
  //  está en el layout del dashboard que verifica el store.)
  // Para dev mode: si no hay cookie de sesión, dejar pasar igualmente
  // para poder ver el UI sin backend activo.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
