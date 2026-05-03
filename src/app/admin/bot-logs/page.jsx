"use client";

import { useState, useEffect } from "react";

export default function BotLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStep, setFilterStep] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchLogs();
  }, [filterStep, filterStatus]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/bot-logs", window.location.origin);
      if (filterStep !== "all") url.searchParams.set("step", filterStep);
      if (filterStatus !== "all") url.searchParams.set("status", filterStatus);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Bot Execution Logs</h1>
          <p className="page-subtitle">Detailed 3-point debugging view across all tenants.</p>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="mb-6 flex gap-4">
          <select 
            value={filterStep}
            onChange={(e) => setFilterStep(e.target.value)}
            className="bg-[#1a1d2d] border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
          >
            <option value="all">All Steps</option>
            <option value="webhook_received">Webhook Received</option>
            <option value="llm_call">LLM Call</option>
            <option value="response_sent">Response Sent</option>
            <option value="human_gate_blocked">Human Gate Blocked</option>
            <option value="fallback_triggered">Fallback Triggered</option>
          </select>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1a1d2d] border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="skipped">Skipped</option>
          </select>
        </div>

        <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#161b22] border-b border-gray-800 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Tenant</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Step</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Latency</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">No logs found matching filters.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {log.tenants?.slug || log.tenant_id}
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {log.phone ? `...${log.phone.slice(-4)}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs">
                        {log.step}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.status === 'success' ? 'bg-green-900/50 text-green-300' :
                        log.status === 'failure' ? 'bg-red-900/50 text-red-300' :
                        'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.latency_ms ? `${log.latency_ms}ms` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <details className="cursor-pointer">
                        <summary className="text-blue-400 text-xs select-none">View JSON</summary>
                        <pre className="mt-2 text-[10px] text-gray-300 bg-black/50 p-2 rounded overflow-x-auto max-w-xs">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
