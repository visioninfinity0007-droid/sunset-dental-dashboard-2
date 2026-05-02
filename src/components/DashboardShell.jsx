"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardShell({ 
  children, 
  slug, 
  clientMeta, 
  userEmail, 
  hotCount = 0,
  activeTab,
  setActiveTab 
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
  };

  const clientName = clientMeta?.name || slug;
  const clientLogo = clientMeta?.logo || "📊";
  const clientTagline = clientMeta?.tagline || "Dashboard";

  // Check if we are on the root dashboard page (which uses tabs)
  const isRootPage = pathname === `/dashboard/${slug}`;

  // Helper to render a navigation item
  const renderNavItem = (id, icon, label, badge = null, href = null, onClick = null) => {
    const isActive = href ? pathname === href : (isRootPage && activeTab === id);
    
    const content = (
      <>
        <span className="nav-icon">{icon}</span>
        {label}
        {badge ? <span className="nav-badge">{badge}</span> : null}
      </>
    );

    if (href) {
      return (
        <Link 
          key={id}
          href={href}
          className={`nav-link${isActive ? " active" : ""}`}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={id}
        className={`nav-link${isActive ? " active" : ""}`}
        onClick={() => {
          if (!isRootPage && onClick === null) {
            router.push(`/dashboard/${slug}`);
          } else if (onClick) {
            onClick();
          } else if (setActiveTab) {
            setActiveTab(id);
          }
        }}
        type="button"
      >
        {content}
      </button>
    );
  };

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <div className="logo-icon">{clientLogo}</div>
            <div className="logo-text">
              <strong>{clientName}</strong>
              <span>{clientTagline}</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          <span className="nav-section-label">Dashboard</span>
          {renderNavItem("overview", "📊", "Overview")}
          {renderNavItem("leads", "👥", "Leads", hotCount > 0 ? hotCount : null)}
          {renderNavItem("appointments", "📅", "Appointments")}

          <span className="nav-section-label" style={{ marginTop: 16 }}>
            Operations
          </span>
          {renderNavItem("chat", "💬", "Live Chat", null, `/dashboard/${slug}/chat`)}
          {renderNavItem("channels", "🔗", "Channels", null, `/dashboard/${slug}/channels`)}
          {renderNavItem("knowledge", "🧠", "Knowledge Base", null, `/dashboard/${slug}/knowledge`)}
          {renderNavItem("bot", "🤖", "Bot Config", null, `/dashboard/${slug}/bot`)}
          {renderNavItem("team", "👥", "Team", null, `/dashboard/${slug}/team`)}

          <span className="nav-section-label" style={{ marginTop: 16 }}>
            Reports
          </span>
          {renderNavItem("analytics", "📈", "Analytics", null, `/dashboard/${slug}/analytics`)}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{userEmail ? userEmail[0].toUpperCase() : "U"}</div>
            <div className="user-info">
              <strong>{userEmail || "Client"}</strong>
              <span>{clientName}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Sign out" type="button">
              ↗
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
