"use client";

import { useState, useEffect } from "react";

export default function HealthPage() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/admin/health");
      const data = await res.json();
      if (res.ok) {
        setHealth(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCapacityHint = (thisMonth) => {
    if (thisMonth < 10000) return { emoji: "🟢", title: "Light load", desc: "No action needed." };
    if (thisMonth < 50000) return { emoji: "🟡", title: "Moderate load", desc: "Monitor monthly." };
    return { emoji: "🔴", title: "Heavy load", desc: "Consider VPS upgrade." };
  };

  const coolifyUrl = process.env.NEXT_PUBLIC_COOLIFY_URL || "https://coolify.visioninfinity.co/";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">System Health</h1>
          <p className="page-subtitle">Infrastructure and capacity metrics.</p>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-6">
        {loading ? (
          <div className="text-gray-400">Loading metrics...</div>
        ) : health ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Card 1: Container Metrics */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 flex flex-col h-full">
              <h2 className="text-lg font-bold text-white mb-2">Container Metrics</h2>
              <p className="text-sm text-gray-400 mb-6 flex-1">
                Open Coolify dashboard for per-container CPU, RAM, and logs.
              </p>
              <a 
                href={coolifyUrl} 
                target="_blank" 
                rel="noreferrer"
                className="bg-[#1E5FFF] hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-center block w-full"
              >
                Open Coolify
              </a>
            </div>

            {/* Card 2: Server Totals */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Server Totals</h2>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between pb-2 border-b border-gray-800">
                  <span className="text-gray-400">Evolution Instances</span>
                  <span className="text-white font-mono">{health.activeInstances} active / {health.totalInstances} total</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-gray-800">
                  <span className="text-gray-400">Total Messages Stored</span>
                  <span className="text-white font-mono">{health.totalMessages.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-gray-800">
                  <span className="text-gray-400">Knowledge Storage</span>
                  <span className="text-white font-mono">{health.knowledgeSizeMB} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">DB Growth (Messages)</span>
                  <span className={`font-mono ${health.messageGrowth > 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                    {health.messageGrowth > 0 ? '+' : ''}{health.messageGrowth.toLocaleString()} this month vs last
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Capacity Hint */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Capacity Hint</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">{getCapacityHint(health.messagesThisMonth).emoji}</div>
                <div>
                  <div className="font-bold text-white text-lg">
                    {getCapacityHint(health.messagesThisMonth).title}
                  </div>
                  <div className="text-sm text-gray-400">
                    {health.messagesThisMonth.toLocaleString()} messages this month
                  </div>
                </div>
              </div>
              <div className="bg-[#161b22] p-4 rounded border border-gray-800 text-sm text-gray-300">
                {getCapacityHint(health.messagesThisMonth).desc}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-red-400">Failed to load system health.</div>
        )}
      </div>
    </div>
  );
}
