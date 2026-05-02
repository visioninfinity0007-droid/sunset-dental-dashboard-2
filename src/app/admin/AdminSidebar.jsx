"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminSidebar({ userEmail }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
  };

  const navItems = [
    { id: "overview", icon: "📊", label: "Overview", path: "/admin/overview" },
    { id: "tenants", icon: "🏢", label: "Tenants", path: "/admin/tenants" },
    { id: "signups", icon: "📝", label: "Signups", path: "/admin/signups" },
    { id: "invoices", icon: "💰", label: "Invoices", path: "/admin/invoices" },
    { id: "audit", icon: "📋", label: "Audit Log", path: "/admin/audit" },
    { id: "health", icon: "🏥", label: "System Health", path: "/admin/health" },
    { id: "analytics", icon: "📈", label: "Analytics", path: "https://analytics.google.com/", external: true },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <div className="logo-icon">👑</div>
          <div className="logo-text">
            <strong>Admin God-View</strong>
            <span>Vision Infinity</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Operations</span>
        {navItems.map((item) => {
          if (item.external) {
            return (
              <a
                key={item.id}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                <span className="ml-auto opacity-50">↗</span>
              </a>
            );
          }
          const isActive = pathname.startsWith(item.path);
          return (
            <Link
              key={item.id}
              href={item.path}
              className={`nav-link${isActive ? " active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{userEmail ? userEmail[0].toUpperCase() : "A"}</div>
          <div className="user-info">
            <strong>{userEmail || "Admin"}</strong>
            <span>Super Admin</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Sign out" type="button">
            ↗
          </button>
        </div>
      </div>
    </aside>
  );
}
