"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getDemoEmail } from "@/lib/demo-auth";

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
function KpiCard({ icon, value, label, sub, accent, bg, trend, delay = 0 }) {
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
      <div className="kpi-label">{label}</div>
      {sub ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  );
}

// Mobile Tab Bar
function MobileTabBar({ activeTab, setActiveTab, hotCount }) {
  const tabs = [
    { id: "overview", icon: "📊", label: "Overview" },
    { id: "leads", icon: "👥", label: "Leads", badge: hotCount > 0 ? hotCount : null },
    { id: "appointments", icon: "📅", label: "Appts" },
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
  const refreshTimer = useRef(null);

  const userEmail = typeof window !== "undefined" ? getDemoEmail() : "";

  useEffect(() => {
    fetch(`/api/client/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setClientMeta(d))
      .catch(() => {});
  }, [slug]);

  const fetchData = useCallback(
    async (f) => {
      const qs = buildQS(f);

      try {
        const [statsRes, leadsRes] = await Promise.all([
          fetch(`/api/dashboard/${slug}/stats?${qs}`),
          fetch(`/api/dashboard/${slug}/leads?${qs}`),
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
    fetchData(filters);
    refreshTimer.current = setInterval(() => fetchData(filters), 2 * 60 * 1000);
    return () => clearInterval(refreshTimer.current);
  }, [filters, fetchData]);

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
                fetchData(filters);
              }}
              type="button"
            >
              ↺ Refresh
            </button>
          </div>
        </div>

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
                    <div className="skeleton" style={{ height: 80, marginTop: 8 }} />
                  ) : sourceData.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--stone-400)" }}>No source data</p>
                  ) : (
                    <div>
                      {sourceData.map((s) => (
                        <span key={s.name} className="source-tag">
                          {s.name} · {s.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {(activeTab === "leads" || activeTab === "overview") && (
          <div className="leads-section section-gap">
            <div className="leads-header">
              <h2 className="leads-title">
                {activeTab === "leads" ? "All leads" : "Recent leads"}
                <span className="leads-count">
                  {visibleLeads.length} {searchQ ? "matching" : "total"}
                </span>
              </h2>

              <div className="search-input-wrap">
                <span className="search-icon">🔍</span>
                <input
                  className="search-input"
                  placeholder="Search name, phone…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
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
            <div className="leads-header">
              <h2 className="leads-title">Appointments</h2>
            </div>

            {loading ? (
              <div className="table-wrap">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton skeleton-row" />
                ))}
              </div>
            ) : (
              <div className="table-wrap">
                {visibleLeads.filter((l) => l.status === "booked" || l.appointmentTime).length ===
                0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <div className="empty-title">No appointments in this range</div>
                    <div className="empty-sub">
                      Adjust the date filter to see past or upcoming appointments.
                    </div>
                  </div>
                ) : (
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Phone</th>
                        <th>Treatment</th>
                        <th>Appointment time</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Handler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLeads
                        .filter((l) => l.status === "booked" || l.appointmentTime)
                        .map((lead, i) => (
                          <tr key={`appt-${i}`}>
                            <td>
                              <div className="lead-name">{lead.name}</div>
                            </td>
                            <td className="lead-phone">{lead.phone}</td>
                            <td style={{ fontSize: 13, color: "var(--stone-700)" }}>
                              {lead.treatmentType || "—"}
                            </td>
                            <td className="date-cell">{lead.appointmentTime || "—"}</td>
                            <td>
                              <span className={statusBadge(lead.status)}>
                                {lead.status?.replace(/_/g, " ") || "—"}
                              </span>
                            </td>
                            <td>
                              <div className="score-pill" style={{ color: "var(--stone-800)" }}>
                                {lead.score}
                              </div>
                            </td>
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
            )}
          </div>
        )}
      </main>
    </div>
  );
}
