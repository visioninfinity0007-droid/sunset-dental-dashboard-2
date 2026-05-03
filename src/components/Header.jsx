"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";

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
            <>
              <button
                className="lg:hidden flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors mr-1"
                onClick={() => window.dispatchEvent(new CustomEvent("vi:open-mobile-nav"))}
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button className="vi-header-logout" onClick={handleLogout}>
                Sign out ↗
              </button>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
