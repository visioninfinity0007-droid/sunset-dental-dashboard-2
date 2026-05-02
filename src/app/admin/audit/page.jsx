"use client";

import React, { useState, useEffect } from "react";

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("all"); // 'all', '24h', '7days', '30days'
  const [actionFilter, setActionFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    fetchAudit();
  }, []);

  const fetchAudit = async () => {
    try {
      const res = await fetch("/api/admin/audit");
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.audit || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const actionTypes = Array.from(new Set(auditLogs.map(log => log.action))).filter(Boolean).sort();

  const filteredLogs = auditLogs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;

    if (timeFilter !== "all") {
      const created = new Date(log.created_at);
      const now = new Date();
      const diffHours = (now - created) / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      if (timeFilter === "24h" && diffHours > 24) return false;
      if (timeFilter === "7days" && diffDays > 7) return false;
      if (timeFilter === "30days" && diffDays > 30) return false;
    }

    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Last 500 system and administrative actions.</p>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            {[
              { id: "all", label: "All" },
              { id: "24h", label: "Last 24h" },
              { id: "7days", label: "Last 7 days" },
              { id: "30days", label: "Last 30 days" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  timeFilter === f.id ? "bg-[#1E5FFF] text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-[#0f111a] border border-gray-800 text-sm text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#1E5FFF]"
          >
            <option value="all">All Actions</option>
            {actionTypes.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#161b22] border-b border-gray-800 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Target Type</th>
                <th className="px-6 py-4">Target ID</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">Loading audit logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">No logs found.</td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const metaString = JSON.stringify(log.metadata);
                  const isTruncated = metaString.length > 30;
                  return (
                    <React.Fragment key={log.id}>
                      <tr 
                        className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 text-white truncate max-w-[150px]">{log.actor_email || log.actor_user_id || "System"}</td>
                        <td className="px-6 py-4"><span className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-300">{log.action}</span></td>
                        <td className="px-6 py-4">{log.target_type || "—"}</td>
                        <td className="px-6 py-4 truncate max-w-[100px] text-xs font-mono">{log.target_id || "—"}</td>
                        <td className="px-6 py-4 truncate max-w-[200px] text-xs font-mono">
                          {isTruncated ? `${metaString.substring(0, 30)}...` : metaString}
                        </td>
                      </tr>
                      {expandedRow === log.id && (
                        <tr className="bg-[#11131c]">
                          <td colSpan="6" className="px-6 py-4 border-t border-gray-800/50">
                            <strong className="text-gray-300 block mb-2 text-xs">Full Metadata</strong>
                            <pre className="bg-[#0f111a] p-4 rounded border border-gray-800 text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                            {log.ip_address && (
                              <div className="mt-2 text-xs text-gray-500">IP: {log.ip_address}</div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
