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

const VI_BLUE = "#38bdf8";
const VI_PURPLE = "#9b72fa";
const VI_CYAN = "#22d3ee";
const VI_GRID = "#162a4a";
const VI_TICK = "#4d6f96";

function fmt(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtShortDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function intentBadge(intent) {
  const map = {
    hot: "badge-hot",
    warm: "badge-warm",
    cold: "badge-cold",
    emergency: "badge-emergency",
  };

  return `badge ${map[String(intent || "").toLowerCase()] || "badge-cold"}`;
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
  const params = new URLSearchParams();
  if (filters.start) params.set("start", filters.start);
  if (filters.end) params.set("end", filters.end);
  if (filters.minScore > 0) params.set("minScore", String(filters.minScore));
  if (filters.intent !== "all") params.set("intent", filters.intent);
  return params.toString();
}

const DEFAULT_FILTERS = {
  start: "",
  end: "",
  minScore: 0,
  intent: "all",
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

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
      {payload.map((item) => (
        <div key={item.name} style={{ color: item.color }}>
          {item.name}: <strong style={{ color: "#e8f3ff" }}>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

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

function MobileTabBar({ activeTab, setActiveTab, hotCount }) {
  const tabs = [
    { id: "overview", icon: "O", label: "Overview" },
    { id: "leads", icon: "L", label: "Leads", badge: hotCount > 0 ? hotCount : null },
    { id: "appointments", icon: "A", label: "Appts" },
  ];

  return (
    <div className="mobile-tab-bar">
      <div className="mobile-tab-bar-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`mobile-tab-btn${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.icon} {tab.label}
            {tab.badge ? <span className="mobile-tab-badge">{tab.badge}</span> : null}
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
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setClientMeta(data))
      .catch(() => {});
  }, [slug]);

  const fetchData = useCallback(
    async (currentFilters) => {
      const query = buildQS(currentFilters);

      try {
        const [statsResponse, leadsResponse] = await Promise.all([
          fetch(`/api/dashboard/${slug}/stats?${query}`),
          fetch(`/api/dashboard/${slug}/leads?${query}`),
        ]);

        if (!statsResponse.ok || !leadsResponse.ok) {
          throw new Error("Failed to load data");
        }

        const [statsJson, leadsJson] = await Promise.all([
          statsResponse.json(),
          leadsResponse.json(),
        ]);

        setStats(statsJson);
        setLeads(leadsJson);
        setLastRefresh(new Date());
        setError(null);
      } catch (fetchError) {
        setError(fetchError.message);
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

  const visibleLeads = (leads?.items || []).filter((lead) => {
    if (!searchQ.trim()) return true;

    const query = searchQ.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(query) ||
      lead.phone?.includes(query) ||
      lead.treatmentType?.toLowerCase().includes(query) ||
      lead.status?.toLowerCase().includes(query)
    );
  });

  const sourceData = stats?.sourceBreakdown
    ? Object.entries(stats.sourceBreakdown).map(([name, count]) => ({ name, count }))
    : [];
  const totalLeads = stats?.totals?.leads || 1;
  const stageFunnel = stats?.stageFunnel
    ? Object.entries(stats.stageFunnel)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
    : [];
  const hotCount = stats?.summary?.hotLeads || 0;

  const clientName = clientMeta?.name || slug;
  const clientLogo = clientMeta?.logo || "D";
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
            { id: "overview", icon: "O", label: "Overview" },
            { id: "leads", icon: "L", label: "Leads", badge: hotCount > 0 ? hotCount : null },
            { id: "appointments", icon: "A", label: "Appointments" },
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
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{userEmail ? userEmail[0].toUpperCase() : "U"}</div>
            <div className="user-info">
              <strong>{userEmail || "Client"}</strong>
              <span>{clientName}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Sign out" type="button">
              Out
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
                {fmtShortDate(stats.range.start)} to {fmtShortDate(stats.range.end)}
                {" · "}
                {stats.totals?.leads || 0} leads
                {" · "}
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
              Refresh
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
              onChange={(event) =>
                setPendingFilters((current) => ({ ...current, start: event.target.value }))
              }
            />
          </div>

          <div className="filter-group">
            <span className="filter-label">To</span>
            <input
              type="date"
              className="filter-input"
              value={pendingFilters.end}
              onChange={(event) =>
                setPendingFilters((current) => ({ ...current, end: event.target.value }))
              }
            />
          </div>

          <div className="filter-divider" />

          <div className="filter-group">
            <span className="filter-label">Intent</span>
            <select
              className="filter-select"
              value={pendingFilters.intent}
              onChange={(event) =>
                setPendingFilters((current) => ({ ...current, intent: event.target.value }))
              }
            >
              <option value="all">All intent</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Min score</span>
            <select
              className="filter-select"
              value={pendingFilters.minScore}
              onChange={(event) =>
                setPendingFilters((current) => ({
                  ...current,
                  minScore: Number(event.target.value),
                }))
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
            <div className="form-error">Error: {error}</div>
          </div>
        ) : null}

        {activeTab === "overview" && (
          <>
            <div className="kpi-grid">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="skeleton skeleton-kpi" />
                ))
              ) : (
                <>
                  <KpiCard
                    icon="M"
                    value={fmt(stats?.summary?.messagesPerDay, 1)}
                    label="Messages / Day"
                    sub="avg over range"
                    accent={VI_BLUE}
                    bg="rgba(56,189,248,0.08)"
                    delay={0.05}
                  />
                  <KpiCard
                    icon="N"
                    value={fmt(stats?.summary?.newLeadsToday)}
                    label="New Leads Today"
                    sub={`total ${stats?.totals?.leads || 0} in range`}
                    accent={VI_PURPLE}
                    bg="rgba(155,114,250,0.08)"
                    delay={0.1}
                  />
                  <KpiCard
                    icon="B"
                    value={fmt(stats?.summary?.appointmentsBooked)}
                    label="Booked"
                    accent={VI_CYAN}
                    bg="rgba(34,211,238,0.08)"
                    delay={0.15}
                  />
                  <KpiCard
                    icon="H"
                    value={fmt(stats?.summary?.hotLeads)}
                    label="Hot Leads"
                    sub="score 60+ or hot intent"
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
                    icon="C"
                    value={`${fmt(stats?.summary?.conversionRate, 1)}%`}
                    label="Conversion"
                    sub="leads to booked"
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
                    ].map((item) => (
                      <div key={item.label} className="legend-item">
                        <div className="legend-dot" style={{ background: item.color }} />
                        {item.label}
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
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return Number.isNaN(date.getTime())
                            ? value
                            : date.toLocaleDateString("en-US", {
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
                      {sourceData.map((source) => (
                        <span key={source.name} className="source-tag">
                          {source.name} - {source.count}
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
                <span className="search-icon">S</span>
                <input
                  className="search-input"
                  placeholder="Search name, phone..."
                  value={searchQ}
                  onChange={(event) => setSearchQ(event.target.value)}
                />
              </div>
            </div>

            <div className="table-wrap">
              <div className="table-scroll">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="skeleton skeleton-row" />
                  ))
                ) : visibleLeads.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">S</div>
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
                      {visibleLeads.map((lead, index) => (
                        <tr key={`${lead.phone}-${index}`}>
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
                            {lead.treatmentType || <span style={{ color: "var(--stone-400)" }}>--</span>}
                          </td>
                          <td>
                            <div className="summary-cell" title={lead.conversationSummary}>
                              {lead.conversationSummary || "--"}
                            </div>
                          </td>
                          <td>
                            <div className="last-message-cell" title={lead.lastMessage}>
                              {lead.lastMessage ? `"${lead.lastMessage}"` : "--"}
                            </div>
                          </td>
                          <td className="date-cell">{fmtDate(lead.lastUpdated)}</td>
                          <td>
                            <span
                              className={`handler-badge${lead.currentHandler === "human" ? " human" : ""}`}
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
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton skeleton-row" />
                ))}
              </div>
            ) : (
              <div className="table-wrap">
                {visibleLeads.filter((lead) => lead.status === "booked" || lead.appointmentTime)
                  .length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">A</div>
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
                        .filter((lead) => lead.status === "booked" || lead.appointmentTime)
                        .map((lead, index) => (
                          <tr key={`appt-${index}`}>
                            <td>
                              <div className="lead-name">{lead.name}</div>
                            </td>
                            <td className="lead-phone">{lead.phone}</td>
                            <td style={{ fontSize: 13, color: "var(--stone-700)" }}>
                              {lead.treatmentType || "--"}
                            </td>
                            <td className="date-cell">{lead.appointmentTime || "--"}</td>
                            <td>
                              <span className={statusBadge(lead.status)}>
                                {lead.status?.replace(/_/g, " ") || "--"}
                              </span>
                            </td>
                            <td>
                              <div className="score-pill" style={{ color: "var(--stone-800)" }}>
                                {lead.score}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`handler-badge${lead.currentHandler === "human" ? " human" : ""}`}
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
