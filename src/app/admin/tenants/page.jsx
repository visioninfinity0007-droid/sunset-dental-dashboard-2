"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activatingId, setActivatingId] = useState(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/admin/tenants");
      const data = await res.json();
      if (res.ok) {
        setTenants(data.tenants);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id) => {
    if (!confirm("Are you sure you want to activate this tenant and provision Evolution API?")) return;
    
    setActivatingId(id);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/activate`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        alert("Tenant activated successfully.");
        fetchTenants();
      } else {
        alert(data.error || "Failed to activate");
      }
    } catch (err) {
      alert("Error activating tenant.");
    } finally {
      setActivatingId(null);
    }
  };

  const handleImpersonate = async (id, slug) => {
    try {
      const res = await fetch(`/api/admin/tenants/${id}/impersonate`, { method: "POST" });
      if (res.ok) {
        window.location.href = `/dashboard/${slug}`;
      } else {
        alert("Failed to impersonate");
      }
    } catch (err) {
      alert("Error impersonating");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">Manage all client accounts.</p>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#161b22] border-b border-gray-800 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4">Business</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">Loading tenants...</td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">No tenants found.</td>
                </tr>
              ) : (
                tenants.map(t => (
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
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {t.plan_status === "pending_payment" && (
                          <button 
                            onClick={() => handleActivate(t.id)}
                            disabled={activatingId === t.id}
                            className="bg-[#1E5FFF] hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {activatingId === t.id ? (
                              <>
                                <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Activating...
                              </>
                            ) : "Activate"}
                          </button>
                        )}
                        <button 
                          onClick={() => handleImpersonate(t.id, t.slug)}
                          className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          Impersonate
                        </button>
                        <Link 
                          href={`/admin/tenants/${t.id}`}
                          className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                        >
                          View
                        </Link>
                      </div>
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
