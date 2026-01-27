import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === "ADMIN";

  const isLoginPage = nextUrl.pathname === "/login";
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isProtectedRoute =
    nextUrl.pathname.startsWith("/costs") ||
    nextUrl.pathname.startsWith("/admin");

  // Redirect logged-in users away from login page
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/costs", nextUrl));
  }

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Restrict admin routes to admin users only
  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/costs", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
