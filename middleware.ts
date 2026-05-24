import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/signup", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Em prod (HTTPS), better-auth adiciona prefixo "__Secure-" aos cookies.
  // Aceitamos as duas variantes.
  const cookie =
    request.cookies.get("labfluxos.session_token") ??
    request.cookies.get("__Secure-labfluxos.session_token");
  if (!cookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
