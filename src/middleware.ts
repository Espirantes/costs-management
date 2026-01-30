import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isLoggedIn = !!token;
  const isAdmin = token?.role === "ADMIN";
  const hasOrganization = !!token?.currentOrganizationId;

  const isLoginPage = pathname === "/login";
  const isSetupPage = pathname.startsWith("/setup");
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedRoute =
    pathname.startsWith("/costs") || pathname.startsWith("/admin");

  // Redirect logged-in users away from login page
  if (isLoginPage && isLoggedIn) {
    // If no organization, redirect to setup
    if (!hasOrganization) {
      return NextResponse.redirect(new URL("/setup/organization", request.url));
    }
    return NextResponse.redirect(new URL("/costs", request.url));
  }

  // Redirect unauthenticated users to login
  if ((isProtectedRoute || isSetupPage) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect users without organization to setup (except setup pages)
  if (isLoggedIn && !hasOrganization && !isSetupPage) {
    return NextResponse.redirect(new URL("/setup/organization", request.url));
  }

  // Restrict admin routes to admin users only
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/costs", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
