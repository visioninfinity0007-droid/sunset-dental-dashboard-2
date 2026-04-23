"use client";

import { usePathname, useRouter } from "next/navigation";

const LOGO_URL = "https://visioninfinity.co/wp-content/uploads/2026/04/Untitled-design-8-1.png";

export default function Header({ clientName }) {
  const pathname    = usePathname();
  const router      = useRouter();
  const isDashboard = pathname?.startsWith("/dashboard");

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
  }

  return (
    <header className="vi-header">
      <div className="vi-header-inner">

        <a href="https://visioninfinity.co" target="_blank" rel="noopener noreferrer" className="vi-header-logo">
          <img src={LOGO_URL} alt="Vision Infinity" className="vi-logo-img" />
        </a>

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
