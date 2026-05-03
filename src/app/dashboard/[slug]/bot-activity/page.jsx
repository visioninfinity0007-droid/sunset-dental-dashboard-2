"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function BotActivityPage({ params }) {
  const { slug } = params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientMeta, setClientMeta] = useState({});

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    try {
      const [metaRes, activityRes] = await Promise.all([
        fetch(`/api/client/${slug}`),
        fetch(`/api/client/${slug}/bot-activity`)
      ]);

      if (metaRes.ok) setClientMeta(await metaRes.json());
      
      if (activityRes.ok) {
        setData(await activityRes.json());
      } else {
        setError("Failed to load bot activity.");
      }
    } catch (err) {
      setError("Error loading dashboard.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell
      slug={slug}
      activeTab="bot-activity"
      userEmail=""
      clientMeta={clientMeta}
    >
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Bot Activity</h1>
          <p className="page-subtitle">Monitor how your AI assistant is performing.</p>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-6">
        {error && <div className="text-red-500">{error}</div>}
        
        {loading ? (
          <div className="text-gray-400">Loading activity...</div>
        ) : data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
                <div className="text-gray-500 text-sm mb-1">Total Messages (30d)</div>
                <div className="text-3xl font-bold text-white">{data.stats.totalMessages}</div>
              </div>
              <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
                <div className="text-gray-500 text-sm mb-1">Avg Response Time</div>
                <div className="text-3xl font-bold text-white">{data.stats.avgLatency}ms</div>
              </div>
              <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
                <div className="text-gray-500 text-sm mb-1">Fallback Rate</div>
                <div className="text-3xl font-bold text-yellow-400">{data.stats.fallbackRate}%</div>
                <div className="text-xs text-gray-500 mt-1">Escalated to human</div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Message Volume</h3>
                <div className="h-64">
                  {data.usage.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.usage}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                          itemStyle={{ color: '#60a5fa' }}
                        />
                        <Bar dataKey="message_count" fill="#1E5FFF" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                      No usage data available yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Token Usage</h3>
                <div className="h-64">
                  {data.usage.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.usage}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="input_tokens" stroke="#10b981" strokeWidth={2} dot={false} name="Input" />
                        <Line type="monotone" dataKey="output_tokens" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Output" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                      No usage data available yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Fallbacks */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">Recent Fallbacks</h3>
              <p className="text-sm text-gray-400 mb-4">
                These are recent errors where the bot failed to answer. Add FAQs to cover missing knowledge.
              </p>
              
              {data.topFallbacks.length === 0 ? (
                <div className="text-gray-500 text-sm">No recent fallbacks!</div>
              ) : (
                <div className="space-y-3">
                  {data.topFallbacks.map((fb, idx) => (
                    <div key={idx} className="bg-[#161b22] border border-gray-700 p-3 rounded text-sm flex justify-between items-center">
                      <span className="text-yellow-400 font-mono">{fb.reason}</span>
                      <span className="text-gray-500 text-xs">{new Date(fb.time).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
