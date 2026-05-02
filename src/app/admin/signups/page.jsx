"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SignupsPage() {
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', '7days', '30days'
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSignups();
  }, []);

  const fetchSignups = async () => {
    try {
      const res = await fetch("/api/admin/tenants");
      const data = await res.json();
      if (res.ok) {
        setSignups(data.tenants || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSignups = signups.filter((t) => {
    // 1. Search
    const q = search.toLowerCase();
    const matchesSearch = 
      t.business_name?.toLowerCase().includes(q) || 
      t.slug?.toLowerCase().includes(q) ||
      t.billing_email?.toLowerCase().includes(q); // If we had owner email in tenants

    // 2. Date Filter
    if (!matchesSearch) return false;
    if (filter === "all") return true;

    const created = new Date(t.created_at);
    const now = new Date();
    const diffDays = (now - created) / (1000 * 60 * 60 * 24);

    if (filter === "7days") return diffDays <= 7;
    if (filter === "30days") return diffDays <= 30;

    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Signups</h1>
          <p className="page-subtitle">Recent signups over the last 30 days.</p>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === "all" ? "bg-[#1E5FFF] text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("7days")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === "7days" ? "bg-[#1E5FFF] text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Last 7 days
            </button>
            <button
              onClick={() => setFilter("30days")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === "30days" ? "bg-[#1E5FFF] text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              Last 30 days
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Search by business or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0f111a] border border-gray-800 text-sm text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#1E5FFF] w-full sm:w-64"
          />
        </div>

        <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#161b22] border-b border-gray-800 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4">Business Name</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">Loading signups...</td>
                </tr>
              ) : filteredSignups.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">No signups found matching criteria.</td>
                </tr>
              ) : (
                filteredSignups.map(t => (
                  <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{t.business_name}</div>
                      <div className="text-xs">{t.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-gray-300">{t.plan || "None"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        t.plan_status === 'active' ? 'bg-green-900/50 text-green-300' :
                        t.plan_status === 'pending_payment' ? 'bg-blue-900/50 text-blue-300 animate-pulse' :
                        t.plan_status === 'unconfigured' ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {t.plan_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/tenants?slug=${t.slug}`}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors inline-block"
                      >
                        View tenant
                      </Link>
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
