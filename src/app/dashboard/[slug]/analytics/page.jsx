"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";

const COLORS = {
  hot: '#ef4444',     // red-500
  warm: '#f97316',    // orange-500
  cold: '#3b82f6',    // blue-500
  emergency: '#a855f7'// purple-500
};

export default function AnalyticsPage({ params }) {
  const { slug } = params;
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analytics/${slug}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  return (
    <DashboardShell slug={slug} activeTab="analytics" userEmail="" clientMeta={{}}>
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Track your lead volume, intent distribution, and channel performance.</p>
        </div>
      </div>

      <div className="px-8 pb-10 space-y-6">
        {loading ? (
          <div className="text-gray-400">Loading analytics...</div>
        ) : !data ? (
          <div className="text-gray-400">Failed to load data.</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Total Leads</h3>
                <div className="text-3xl font-bold text-white">{data.kpis.totalLeads}</div>
              </div>
              <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Booked Leads</h3>
                <div className="text-3xl font-bold text-white">{data.kpis.bookedLeads}</div>
              </div>
              <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
                <h3 className="text-sm font-medium text-gray-400 mb-1">Conversion Rate</h3>
                <div className="text-3xl font-bold text-white">{data.kpis.conversionRate}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Volume Trend (8 Weeks) */}
              <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 lg:col-span-2">
                <h3 className="text-lg font-bold text-white mb-6">Lead Volume (8 Weeks)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.volumeTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1E5FFF" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#1E5FFF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                        itemStyle={{ color: '#60a5fa' }}
                      />
                      <Area type="monotone" dataKey="leads" stroke="#1E5FFF" fillOpacity={1} fill="url(#colorLeads)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Intent Distribution */}
              <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-6">Intent Breakdown</h3>
                <div className="flex-1 min-h-[250px]">
                  {data.intents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.intents}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.intents.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase()] || COLORS.cold} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(value) => <span className="capitalize text-gray-300">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Channels Performance */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Channel Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="text-xs uppercase text-gray-500 border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Channel Label</th>
                      <th className="py-3 px-4">Phone Number</th>
                      <th className="py-3 px-4 text-right">Total Leads Handled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {data.channels.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-4 px-4 text-center text-gray-500">No channels configured.</td>
                      </tr>
                    ) : (
                      data.channels.map(channel => (
                        <tr key={channel.id} className="hover:bg-[#161a29]">
                          <td className="py-3 px-4 text-white">{channel.label}</td>
                          <td className="py-3 px-4">{channel.whatsapp_phone || '—'}</td>
                          <td className="py-3 px-4 text-right font-medium">{channel.leads_count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
