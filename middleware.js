import { NextResponse } from "next/server";

const SESSION_COOKIE = "vi_session";

function parseSession(cookieValue) {
  if (!cookieValue) return null;
  try {
    const payload = JSON.parse(Buffer.from(cookieValue, "base64url").toString("utf-8"));
    // Check expiry
    if (!payload.s || !payload.x || payload.x < Math.floor(Date.now() / 1000)) return null;
    return payload; // { s: slug, e: email, x: expires }
  } catch {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only protect /dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const sessionValue = request.cookies.get(SESSION_COOKIE)?.value;
  const session = parseSession(sessionValue);

  // No valid session → redirect to login
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Extract the requested slug from the URL: /dashboard/[slug]/...
  const parts = pathname.split("/").filter(Boolean); // ["dashboard", "slug", ...]
  const requestedSlug = parts[1]; // could be undefined for /dashboard itself

  // /dashboard with no slug → redirect to their dashboard
  if (!requestedSlug) {
    return NextResponse.redirect(new URL(`/dashboard/${session.s}`, request.url));
  }

  // Client trying to access a different client's dashboard → redirect to their own
  if (requestedSlug !== session.s) {
    return NextResponse.redirect(new URL(`/dashboard/${session.s}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
