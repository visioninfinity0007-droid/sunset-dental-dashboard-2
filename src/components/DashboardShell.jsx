"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

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
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0c10] border-r border-gray-800 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4">
        <span className="text-white font-semibold text-sm truncate">{clientName}</span>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <main className="main-content pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
