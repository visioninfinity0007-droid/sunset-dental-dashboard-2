"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Listen for hamburger button click fired from the universal Header
  useEffect(() => {
    const handler = () => setIsMobileMenuOpen(true);
    window.addEventListener("vi:open-mobile-nav", handler);
    return () => window.removeEventListener("vi:open-mobile-nav", handler);
  }, []);

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
          setIsMobileMenuOpen(false);
        }}
        type="button"
      >
        {content}
      </button>
    );
  };

  return (
    <div className="dashboard-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar hidden lg:flex">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <div className="logo-icon">{clientLogo}</div>
            <div className="logo-text">
              <strong>{clientName}</strong>
              <span>{clientTagline}</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Desktop Dashboard navigation">
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
          {renderNavItem("bot-activity", "📊", "Bot Activity", null, `/dashboard/${slug}/bot-activity`)}
          
          <span className="nav-section-label" style={{ marginTop: 16 }}>
            Help
          </span>
          {renderNavItem("support", "🎫", "Support", null, `/dashboard/${slug}/support`)}
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

      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 z-40 bg-black/60 lg:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sidebar-logo flex justify-between items-center pr-4">
          <div className="sidebar-logo-mark">
            <div className="logo-icon">{clientLogo}</div>
            <div className="logo-text">
              <strong>{clientName}</strong>
              <span>{clientTagline}</span>
            </div>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-gray-400 hover:text-white p-1 rounded-md bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="sidebar-nav flex-1 overflow-y-auto" aria-label="Mobile Dashboard navigation">
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
          {renderNavItem("bot-activity", "📊", "Bot Activity", null, `/dashboard/${slug}/bot-activity`)}

          <span className="nav-section-label" style={{ marginTop: 16 }}>
            Help
          </span>
          {renderNavItem("support", "🎫", "Support", null, `/dashboard/${slug}/support`)}
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
      </div>

      {/* Mobile Fixed Top Header */}

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
