"use client";

import { usePathname, useRouter } from "next/navigation";

import Logo from "./Logo";
import { createBrowserClient } from "@supabase/ssr";

export default function Header({ clientName }) {
  const pathname    = usePathname();
  const router      = useRouter();
  const isDashboard = pathname?.startsWith("/dashboard");

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="vi-header">
      <div className="vi-header-inner">

        <Logo size={36} withText={false} />

        <div className="vi-header-centre">
          {isDashboard && clientName ? (
            <span className="vi-header-client">
              <span className="vi-header-client-dot" />
              {clientName} — Live Dashboard
            </span>
          ) : (
            <span className="vi-header-tagline">Client Portal</span>
          )}
        </div>

        <div className="vi-header-right">
          {isDashboard && (
            <button className="vi-header-logout" onClick={handleLogout}>
              Sign out ↗
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
