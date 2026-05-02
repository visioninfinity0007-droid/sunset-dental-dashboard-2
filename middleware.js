import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Skip all middleware logic for /admin routes - let the layout handle auth
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  // Protect /dashboard routes and /onboarding routes
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  if (pathname.startsWith("/dashboard")) {
    const parts = pathname.split("/").filter(Boolean); // ["dashboard", "slug", ...]
    const requestedSlug = parts[1]; // could be undefined for /dashboard itself
    // Fetch user's active tenants
    const { data: memberships } = await supabase
      .from("tenant_members")
      .select("tenant_id, tenants(slug)")
      .eq("user_id", user.id)
      .eq("status", "active");
    const activeSlugs = memberships?.map(m => m.tenants?.slug).filter(Boolean) || [];
    if (activeSlugs.length === 0) {
      // User has no active tenants
      const signupUrl = new URL("/signup", request.url);
      return NextResponse.redirect(signupUrl);
    }
    // /dashboard with no slug → redirect to their first dashboard
    if (!requestedSlug) {
      return NextResponse.redirect(new URL(`/dashboard/${activeSlugs[0]}`, request.url));
    }
    // Client trying to access a different client's dashboard → redirect to their own
    if (!activeSlugs.includes(requestedSlug)) {
      return NextResponse.redirect(new URL(`/dashboard/${activeSlugs[0]}`, request.url));
    }
  }
  return supabaseResponse;
}
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/health|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
