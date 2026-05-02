"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// VI chart palette
const VI_BLUE = "#38bdf8";
const VI_PURPLE = "#9b72fa";
const VI_CYAN = "#22d3ee";
const VI_GRID = "#162a4a";
const VI_TICK = "#4d6f96";

// Helpers
function fmt(val, decimals = 0) {
  if (val === null || val === undefined || isNaN(Number(val))) return "—";
  return Number(val).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtShortDate(str) {
  if (!str) return "";
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function intentBadge(intent) {
  const map = {
    hot: "badge-hot",
    warm: "badge-warm",
    cold: "badge-cold",
    emergency: "badge-emergency",
  };
  return `badge ${map[intent?.toLowerCase()] || "badge-cold"}`;
}

function statusBadge(status) {
  return `badge badge-${String(status || "")
    .toLowerCase()
    .replace(/[^a-z_]/g, "_")}`;
}

function scoreColor(score) {
  if (score >= 70) return VI_CYAN;
  if (score >= 40) return "#f59e0b";
  return VI_TICK;
}

function buildQS(filters) {
  const p = new URLSearchParams();
  if (filters.start) p.set("start", filters.start);
  if (filters.end) p.set("end", filters.end);
  if (filters.minScore > 0) p.set("minScore", filters.minScore);
  if (filters.intent !== "all") p.set("intent", filters.intent);
  return p.toString();
}

const DEFAULT_FILTERS = { start: "", end: "", minScore: 0, intent: "all" };

// Chart tooltip
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#060d1e",
        color: "#e8f3ff",
        border: "1px solid #162a4a",
        padding: "10px 14px",
        borderRadius: "var(--radius)",
        fontSize: 12,
        boxShadow: "0 10px 24px rgba(0,0,0,0.5)",
        lineHeight: 1.8,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, color: "#b0cde8" }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <strong style={{ color: "#e8f3ff" }}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// KPI Card
function KpiCard({ icon, value, label, sub, accent, bg, trend, tooltip, delay = 0 }) {
  return (
    <div
      className="kpi-card"
      style={{
        "--kpi-accent": accent,
        "--kpi-bg": bg,
        animationDelay: `${delay}s`,
      }}
    >
      {trend ? <span className={`kpi-trend ${trend.type}`}>{trend.label}</span> : null}
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label flex items-center gap-1 relative group cursor-help w-max">
        {label}
        {tooltip && (
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        )}
        {tooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none text-center">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}

// Mobile Tab Bar
function MobileTabBar({ activeTab, setActiveTab, hotCount }) {
  const tabs = [
    { id: "overview", icon: "📊", label: "Overview" },
    { id: "leads", icon: "👥", label: "Leads", badge: hotCount > 0 ? hotCount : null },
    { id: "appointments", icon: "📅", label: "Appointments" },
  ];

  return (
    <div className="mobile-tab-bar">
      <div className="mobile-tab-bar-inner">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`mobile-tab-btn${activeTab === t.id ? " active" : ""}`}
            onClick={() => setActiveTab(t.id)}
            type="button"
          >
            {t.icon} {t.label}
            {t.badge ? <span className="mobile-tab-badge">{t.badge}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage({ params }) {
  const { slug } = params;
  const router = useRouter();

  const [clientMeta, setClientMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pendingFilters, setPendingFilters] = useState(DEFAULT_FILTERS);
  const [searchQ, setSearchQ] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState("");
  const refreshTimer = useRef(null);

  const userEmail = "";

  useEffect(() => {
    fetch(`/api/client/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClientMeta(d))
      .catch(() => {});
      
    fetch(`/api/channels`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.instances) setInstances(d.instances);
      })
      .catch(() => {});
  }, [slug]);

  const fetchData = useCallback(
    async (f, instId) => {
      const qs = buildQS(f);
      const instParam = instId ? `&instance=${instId}` : "";

      try {
        const [statsRes, leadsRes] = await Promise.all([
          fetch(`/api/dashboard/${slug}/stats?${qs}${instParam}`),
          fetch(`/api/dashboard/${slug}/leads?${qs}${instParam}`),
        ]);

        if (!statsRes.ok || !leadsRes.ok) {
          throw new Error("Failed to load data");
        }

        const [s, l] = await Promise.all([statsRes.json(), leadsRes.json()]);
        setStats(s);
        setLeads(l);
        setLastRefresh(new Date());
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    fetchData(filters, selectedInstance);
    refreshTimer.current = setInterval(() => fetchData(filters, selectedInstance), 2 * 60 * 1000);
    return () => clearInterval(refreshTimer.current);
  }, [filters, selectedInstance, fetchData]);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.replace("/login");
  }

  function applyFilters() {
    setLoading(true);
    setFilters(pendingFilters);
  }

  function resetFilters() {
    setPendingFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setLoading(true);
  }

  const visibleLeads = (leads?.items || []).filter((l) => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    return (
      l.name?.toLowerCase().includes(q) ||
      l.phone?.includes(q) ||
      l.treatmentType?.toLowerCase().includes(q) ||
      l.status?.toLowerCase().includes(q)
    );
  });

  const sourceData = stats?.sourceBreakdown
    ? Object.entries(stats.sourceBreakdown).map(([k, v]) => ({ name: k, count: v }))
    : [];

  const totalLeads = stats?.totals?.leads || 1;
  const stageFunnel = stats?.stageFunnel
    ? Object.entries(stats.stageFunnel)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
    : [];
  const hotCount = stats?.summary?.hotLeads || 0;

  const clientName = clientMeta?.name || slug;
  const clientLogo = clientMeta?.logo || "📊";
  const clientTagline = clientMeta?.tagline || "Dashboard";
  const planStatus = clientMeta?.plan_status || "active";
  
  const isImpersonating = clientMeta?.isImpersonating || false;

  const handleExitImpersonation = async () => {
    try {
      await fetch("/api/admin/exit-impersonation", { method: "POST" });
      window.location.href = "/admin/tenants";
    } catch (err) {
      console.error(err);
    }
  };

  const getBanner = () => {
    switch (planStatus) {
      case "unconfigured":
        return (
          <div className="bg-yellow-900/50 border-b border-yellow-700 text-yellow-200 px-4 py-3 text-sm text-center">
            Choose your plan to activate your dashboard.{" "}
            <a href={`/onboarding/choose-plan?slug=${slug}`} className="font-bold underline ml-2">Choose plan &rarr;</a>
          </div>
        );
      case "pending_payment":
        return (
          <div className="bg-blue-900/50 border-b border-blue-700 text-blue-200 px-4 py-3 text-sm text-center">
            Awaiting payment confirmation.{" "}
            <a href={`/dashboard/${slug}/invoices`} className="underline mr-2">View invoice</a> |{" "}
            <a href={`https://wa.me/923128779368?text=Hi%20Vision%20Infinity!%20I've%20paid%20for%20the%20${clientMeta?.plan || "selected"}%20plan.%20My%20business%20is%20${encodeURIComponent(clientName)}.`} target="_blank" rel="noopener noreferrer" className="font-bold underline ml-2">Have you paid? Send confirmation to WhatsApp</a>
          </div>
        );
      case "suspended":
        return (
          <div className="bg-red-900/50 border-b border-red-700 text-red-200 px-4 py-3 text-sm text-center">
            Account suspended. Please contact support.
          </div>
        );
      case "cancelled":
        return (
          <div className="bg-gray-800 border-b border-gray-600 text-gray-200 px-4 py-3 text-sm text-center">
            Account cancelled. <a href={`/onboarding/choose-plan?slug=${slug}`} className="underline font-bold ml-2">Reactivate</a>
          </div>
        );
      default:
        return null;
    }
  };

  const handleDownloadCSV = (dataToExport, filename) => {
    if (!dataToExport || dataToExport.length === 0) return;
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {isImpersonating && (
        <div className="bg-purple-900/80 border-b border-purple-700 text-purple-200 px-4 py-3 text-sm text-center flex items-center justify-center gap-4">
          <strong>Impersonation Mode Active</strong>
          <span>(Read-only access to mutations)</span>
          <button 
            onClick={handleExitImpersonation}
            className="bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
          >
            Exit Impersonation
          </button>
        </div>
      )}
      {getBanner()}
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
          {[
            { id: "overview", icon: "📊", label: "Overview" },
            { id: "leads", icon: "👥", label: "Leads", badge: hotCount > 0 ? hotCount : null },
            { id: "appointments", icon: "📅", label: "Appointments" },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-link${activeTab === item.id ? " active" : ""}`}
              onClick={() => setActiveTab(item.id)}
              aria-current={activeTab === item.id ? "page" : undefined}
              type="button"
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </button>
          ))}

          <span className="nav-section-label" style={{ marginTop: 8 }}>
            Reports
          </span>

          <button className="nav-link" onClick={() => setActiveTab("overview")} type="button">
            <span className="nav-icon">📈</span>
            Trend Analysis
          </button>

          <button className="nav-link" onClick={() => setActiveTab("leads")} type="button">
            <span className="nav-icon">🔥</span>
            Hot Leads
          </button>
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
        <MobileTabBar activeTab={activeTab} setActiveTab={setActiveTab} hotCount={hotCount} />

        <div className="page-header">
          <div className="page-title-block">
            <div className="page-eyebrow">Live dashboard</div>
            <h1 className="page-title">
              {activeTab === "overview" && "Overview"}
              {activeTab === "leads" && "All Leads"}
              {activeTab === "appointments" && "Appointments"}
            </h1>

            {stats?.range ? (
              <p className="page-subtitle">
                {fmtShortDate(stats.range.start)} → {fmtShortDate(stats.range.end)}
                &nbsp;·&nbsp; {stats.totals?.leads || 0} leads &nbsp;·&nbsp;{" "}
                {stats.totals?.messages || 0} messages
              </p>
            ) : null}
          </div>

          <div className="header-actions">
            {lastRefresh ? (
              <span className="data-freshness">
                <span className="freshness-dot" />
                Updated {fmtDate(lastRefresh)}
              </span>
            ) : null}

            <button
              className="refresh-btn"
              onClick={() => {
                setLoading(true);
                fetchData(filters, selectedInstance);
              }}
              type="button"
            >
              ↺ Refresh
            </button>
          </div>
        </div>

        {instances.length > 0 && (
          <div className="flex gap-2 px-8 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedInstance("")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedInstance === "" 
                  ? "bg-[#1E5FFF] text-white" 
                  : "bg-[#0f111a] text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              All channels
            </button>
            {instances.map(inst => (
              <button
                key={inst.id}
                onClick={() => setSelectedInstance(inst.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedInstance === inst.id 
                    ? "bg-[#1E5FFF] text-white" 
                    : "bg-[#0f111a] text-gray-400 hover:text-white border border-gray-800"
                }`}
              >
                {inst.label}
              </button>
            ))}
          </div>
        )}

        <div className="filters-bar">
          <div className="filter-group">
            <span className="filter-label">From</span>
            <input
              type="date"
              className="filter-input"
              value={pendingFilters.start}
              onChange={(e) => setPendingFilters((f) => ({ ...f, start: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <span className="filter-label">To</span>
            <input
              type="date"
              className="filter-input"
              value={pendingFilters.end}
              onChange={(e) => setPendingFilters((f) => ({ ...f, end: e.target.value }))}
            />
          </div>

          <div className="filter-divider" />

          <div className="filter-group">
            <span className="filter-label">Intent</span>
            <select
              className="filter-select"
              value={pendingFilters.intent}
              onChange={(e) => setPendingFilters((f) => ({ ...f, intent: e.target.value }))}
            >
              <option value="all">All intent</option>
              <option value="hot">🔥 Hot</option>
              <option value="warm">☀️ Warm</option>
              <option value="cold">❄️ Cold</option>
              <option value="emergency">🚨 Emergency</option>
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Min score</span>
            <select
              className="filter-select"
              value={pendingFilters.minScore}
              onChange={(e) =>
                setPendingFilters((f) => ({ ...f, minScore: Number(e.target.value) }))
              }
            >
              <option value={0}>Any score</option>
              <option value={30}>30+</option>
              <option value={50}>50+</option>
              <option value={70}>70+</option>
              <option value={90}>90+</option>
            </select>
          </div>

          <div className="filter-divider" />

          <button className="apply-btn" onClick={applyFilters} type="button">
            Apply
          </button>
          <button className="reset-btn" onClick={resetFilters} type="button">
            Reset
          </button>
        </div>

        {error ? (
          <div style={{ padding: "16px 32px" }}>
            <div className="form-error">⚠️ {error}</div>
          </div>
        ) : null}

        {activeTab === "overview" && (
          <>
            <div className="kpi-grid">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton skeleton-kpi" />
                ))
              ) : (
                <>
                  <KpiCard
                    icon="💬"
                    value={fmt(stats?.summary?.messagesPerDay, 1)}
                    label="Messages / Day"
                    sub="avg over range"
                    accent={VI_BLUE}
                    bg="rgba(56,189,248,0.08)"
                    delay={0.05}
                  />
                  <KpiCard
                    icon="✨"
                    value={fmt(stats?.summary?.newLeadsToday)}
                    label="New Leads Today"
                    sub={`total ${stats?.totals?.leads || 0} in range`}
                    accent={VI_PURPLE}
                    bg="rgba(155,114,250,0.08)"
                    delay={0.1}
                  />
                  <KpiCard
                    icon="📅"
                    value={fmt(stats?.summary?.appointmentsBooked)}
                    label="Booked"
                    accent={VI_CYAN}
                    bg="rgba(34,211,238,0.08)"
                    delay={0.15}
                  />
                  <KpiCard
                    icon="🔥"
                    value={fmt(stats?.summary?.hotLeads)}
                    label="Hot Leads"
                    sub="score ≥60 or hot intent"
                    accent="#f84d63"
                    bg="rgba(248,77,99,0.08)"
                    trend={
                      stats?.summary?.hotLeads > 0
                        ? { type: "hot", label: "Action needed" }
                        : null
                    }
                    delay={0.2}
                  />
                  <KpiCard
                    icon="📈"
                    value={`${fmt(stats?.summary?.conversionRate, 1)}%`}
                    label="Conversion"
                    sub="leads → booked"
                    accent={VI_PURPLE}
                    bg="rgba(155,114,250,0.08)"
                    delay={0.25}
                  />
                </>
              )}
            </div>

            <div className="chart-section section-gap">
              <div className="chart-card">
                <div className="chart-header">
                  <h2 className="chart-title">Activity trend</h2>
                  <div className="chart-legend">
                    {[
                      { label: "Messages", color: VI_BLUE },
                      { label: "New leads", color: VI_PURPLE },
                      { label: "Booked", color: VI_CYAN },
                    ].map((l) => (
                      <div key={l.label} className="legend-item">
                        <div className="legend-dot" style={{ background: l.color }} />
                        {l.label}
                      </div>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="skeleton skeleton-chart" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart
                      data={stats?.trend || []}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gradMsg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={VI_BLUE} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={VI_BLUE} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={VI_PURPLE} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={VI_PURPLE} stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke={VI_GRID} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: VI_TICK }}
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          return isNaN(d)
                            ? v
                            : d.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              });
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: VI_TICK }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="messages"
                        name="Messages"
                        stroke={VI_BLUE}
                        strokeWidth={2}
                        fill="url(#gradMsg)"
                      />
                      <Area
                        type="monotone"
                        dataKey="newLeads"
                        name="New leads"
                        stroke={VI_PURPLE}
                        strokeWidth={2}
                        fill="url(#gradLeads)"
                      />
                      <Area
                        type="monotone"
                        dataKey="booked"
                        name="Booked"
                        stroke={VI_CYAN}
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray="4 2"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="side-panel">
                <div className="mini-card">
                  <div className="mini-card-title">Lead stages</div>
                  {loading ? (
                    <div className="skeleton" style={{ height: 120, marginTop: 8 }} />
                  ) : stageFunnel.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--stone-400)" }}>No stage data</p>
                  ) : (
                    stageFunnel.map(([stage, count]) => (
                      <div key={stage} style={{ marginBottom: 10 }}>
                        <div className="funnel-row">
                          <span className="funnel-label">{stage.replace(/_/g, " ")}</span>
                          <span className="funnel-count">{count}</span>
                        </div>
                        <div className="funnel-bar">
                          <div
                            className="funnel-fill"
                            style={{ width: `${Math.round((count / totalLeads) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mini-card">
                  <div className="mini-card-title">Traffic sources</div>
                  {loading ? (
                    <div className="skeleton" style={{ height: 160, marginTop: 8 }} />
                  ) : sourceData.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--stone-400)" }}>No source data</p>
                  ) : (
                    <div style={{ height: 160, marginTop: 16 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: "var(--stone-400)" }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                          <Bar dataKey="count" fill="var(--vi-blue-500)" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="leads-section section-gap">
              <div className="leads-header">
                <h2 className="leads-title">Top hot leads</h2>
              </div>
              <div className="table-wrap">
                <div className="table-scroll">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="skeleton skeleton-row" />
                    ))
                  ) : visibleLeads.filter(l => l.score >= 60 || l.intent === 'hot').length === 0 ? (
                    <div className="empty-state" style={{ padding: "32px 0" }}>
                      <div className="empty-icon">🔥</div>
                      <div className="empty-title">No hot leads right now</div>
                    </div>
                  ) : (
                    <table className="leads-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Intent</th>
                          <th>Score</th>
                          <th>Last message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleLeads.filter(l => l.score >= 60 || l.intent === 'hot').slice(0, 5).map((lead, i) => (
                          <tr key={`hot-${i}`}>
                            <td><div className="lead-name">{lead.name}</div></td>
                            <td className="lead-phone">{lead.phone}</td>
                            <td><span className={statusBadge(lead.status)}>{lead.status?.replace(/_/g, " ") || "unknown"}</span></td>
                            <td><span className={intentBadge(lead.intent)}>{lead.intent || "cold"}</span></td>
                            <td>
                              <div className="score-pill">{lead.score}</div>
                              <div className="score-bar-wrap">
                                <div className="score-bar" style={{ width: `${lead.score}%`, background: scoreColor(lead.score) }} />
                              </div>
                            </td>
                            <td><div className="last-message-cell" title={lead.lastMessage}>{lead.lastMessage ? `"${lead.lastMessage}"` : "—"}</div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "leads" && (
          <div className="leads-section section-gap">
            <div className="leads-header flex-col sm:flex-row items-start sm:items-center gap-4">
              <h2 className="leads-title">
                All leads
                <span className="leads-count">
                  {visibleLeads.length} {searchQ ? "matching" : "total"}
                </span>
              </h2>

              <div className="flex flex-wrap items-center gap-3">
                <div className="search-input-wrap m-0">
                  <span className="search-icon">🔍</span>
                  <input
                    className="search-input"
                    placeholder="Search name, phone…"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => handleDownloadCSV(visibleLeads, `leads-${slug}`)}
                  className="bg-[#0f111a] border border-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 h-10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download CSV
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <div className="table-scroll">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton skeleton-row" />
                  ))
                ) : visibleLeads.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <div className="empty-title">No leads found</div>
                    <div className="empty-sub">Try adjusting filters or your search query.</div>
                  </div>
                ) : (
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Intent</th>
                        <th>Score</th>
                        <th>Channel</th>
                        <th>Treatment</th>
                        <th>Summary</th>
                        <th>Last message</th>
                        <th>Last updated</th>
                        <th>Handler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLeads.map((lead, i) => (
                        <tr key={`${lead.phone}-${i}`}>
                          <td>
                            <div className="lead-name">{lead.name}</div>
                          </td>
                          <td className="lead-phone">{lead.phone}</td>
                          <td>
                            <span className={statusBadge(lead.status)}>
                              {lead.status?.replace(/_/g, " ") || "unknown"}
                            </span>
                          </td>
                          <td>
                            <span className={intentBadge(lead.intent)}>
                              {lead.intent || "cold"}
                            </span>
                          </td>
                          <td>
                            <div className="score-pill">{lead.score}</div>
                            <div className="score-bar-wrap">
                              <div
                                className="score-bar"
                                style={{
                                  width: `${lead.score}%`,
                                  background: scoreColor(lead.score),
                                }}
                              />
                            </div>
                          </td>
                          <td>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-300">
                              {lead.instanceLabel || "WhatsApp"}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: "var(--stone-700)" }}>
                            {lead.treatmentType || (
                              <span style={{ color: "var(--stone-400)" }}>—</span>
                            )}
                          </td>
                          <td>
                            <div className="summary-cell" title={lead.conversationSummary}>
                              {lead.conversationSummary || "—"}
                            </div>
                          </td>
                          <td>
                            <div className="last-message-cell" title={lead.lastMessage}>
                              {lead.lastMessage ? `"${lead.lastMessage}"` : "—"}
                            </div>
                          </td>
                          <td className="date-cell">{fmtDate(lead.lastUpdated)}</td>
                          <td>
                            <span
                              className={`handler-badge${
                                lead.currentHandler === "human" ? " human" : ""
                              }`}
                            >
                              {lead.currentHandler || "bot"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="leads-section section-gap">
            <div className="leads-header flex-col sm:flex-row items-start sm:items-center gap-4">
              <h2 className="leads-title">Appointments</h2>
              <button
                onClick={() => handleDownloadCSV(visibleLeads.filter(l => l.status === "booked" || l.appointmentTime), `appointments-${slug}`)}
                className="bg-[#0f111a] border border-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2 h-10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download CSV
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius)' }} />
                ))}
              </div>
            ) : (
              <div>
                {visibleLeads.filter((l) => l.status === "booked" || l.appointmentTime).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <div className="empty-title">No appointments in this range</div>
                    <div className="empty-sub">
                      Adjust the date filter to see past or upcoming appointments.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-2">
                    {visibleLeads
                      .filter((l) => l.status === "booked" || l.appointmentTime)
                      .map((lead, i) => (
                        <div key={`appt-${i}`} className="bg-[#0f111a] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-white font-semibold">{lead.name}</h3>
                              <p className="text-sm text-gray-400">{lead.phone}</p>
                            </div>
                            <span className={statusBadge(lead.status)}>
                              {lead.status?.replace(/_/g, " ") || "—"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-300 mt-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            {lead.appointmentTime || "—"}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            {lead.treatmentType || "Treatment pending"}
                          </div>

                          <div className="mt-auto pt-3 border-t border-gray-800 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-500">Score</span>
                              <div className="score-pill" style={{ color: "var(--stone-800)", transform: "scale(0.85)", transformOrigin: "left center", margin: 0 }}>
                                {lead.score}
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${lead.currentHandler === "human" ? "bg-purple-900/30 text-purple-400" : "bg-blue-900/30 text-blue-400"}`}>
                              {lead.currentHandler === "human" ? "👤 Human" : "🤖 Bot"}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
    </>
  );
}
