"use client";

import { useState, useEffect } from "react";

export default function SystemHealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error("Health check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const StatusIcon = ({ status }) => {
    if (status === "healthy") return <span className="text-green-400">●</span>;
    if (status === "error") return <span className="text-red-400">●</span>;
    if (status === "not_configured") return <span className="text-yellow-400">●</span>;
    return <span className="text-gray-400">●</span>;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-header flex justify-between items-end">
        <div className="page-title-block">
          <h1 className="page-title">System Health</h1>
          <p className="page-subtitle">Real-time infrastructure status and response times.</p>
        </div>
        <button 
          onClick={fetchHealth} 
          disabled={loading}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Supabase */}
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            {loading && <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center backdrop-blur-sm z-10" />}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <StatusIcon status={health?.supabase?.status} /> Supabase DB
                </h3>
                <p className="text-sm text-gray-500">PostgreSQL Data Store</p>
              </div>
              <div className="text-2xl opacity-20">🗄️</div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <span className="text-sm text-gray-400">Status</span>
                <span className={`text-sm font-medium uppercase ${health?.supabase?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                  {health?.supabase?.status || "Loading"}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <span className="text-sm text-gray-400">Latency</span>
                <span className="text-sm text-white font-mono">{health?.supabase?.latencyMs ? `${health.supabase.latencyMs}ms` : "—"}</span>
              </div>
              <div className="flex flex-col border-b border-gray-800/50 pb-2">
                <span className="text-sm text-gray-400 mb-1">Details</span>
                <span className="text-xs text-gray-300 font-mono break-words">
                  {health?.supabase?.details ? JSON.stringify(health.supabase.details) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Evolution API */}
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            {loading && <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center backdrop-blur-sm z-10" />}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <StatusIcon status={health?.evolution?.status} /> Evolution API
                </h3>
                <p className="text-sm text-gray-500">WhatsApp Engine</p>
              </div>
              <div className="text-2xl opacity-20">💬</div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <span className="text-sm text-gray-400">Status</span>
                <span className={`text-sm font-medium uppercase ${health?.evolution?.status === 'healthy' ? 'text-green-400' : health?.evolution?.status === 'not_configured' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {health?.evolution?.status || "Loading"}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <span className="text-sm text-gray-400">Latency</span>
                <span className="text-sm text-white font-mono">{health?.evolution?.latencyMs ? `${health.evolution.latencyMs}ms` : "—"}</span>
              </div>
              <div className="flex flex-col border-b border-gray-800/50 pb-2">
                <span className="text-sm text-gray-400 mb-1">Details</span>
                <span className="text-xs text-gray-300 font-mono break-words">
                  {health?.evolution?.details ? JSON.stringify(health.evolution.details) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* n8n */}
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
            {loading && <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center backdrop-blur-sm z-10" />}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <StatusIcon status={health?.n8n?.status} /> n8n Server
                </h3>
                <p className="text-sm text-gray-500">Automation Webhooks</p>
              </div>
              <div className="text-2xl opacity-20">⚙️</div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <span className="text-sm text-gray-400">Status</span>
                <span className={`text-sm font-medium uppercase ${health?.n8n?.status === 'healthy' ? 'text-green-400' : health?.n8n?.status === 'not_configured' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {health?.n8n?.status || "Loading"}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                <span className="text-sm text-gray-400">Latency</span>
                <span className="text-sm text-white font-mono">{health?.n8n?.latencyMs ? `${health.n8n.latencyMs}ms` : "—"}</span>
              </div>
              <div className="flex flex-col border-b border-gray-800/50 pb-2">
                <span className="text-sm text-gray-400 mb-1">Details</span>
                <span className="text-xs text-gray-300 font-mono break-words">
                  {health?.n8n?.details ? JSON.stringify(health.n8n.details) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-sm text-gray-400">
          <p><strong>Note:</strong> Active Docker container counts and precise VPS metrics (like CPU/Memory) require SSH access or a dedicated agent on the Contabo server, which is currently unavailable to the web API.</p>
        </div>
      </div>
    </div>
  );
}
