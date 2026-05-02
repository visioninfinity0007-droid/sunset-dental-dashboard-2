"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { createClient } from "@/lib/supabaseClient";

export default function TenantProfilePage({ params }) {
  const { id } = params;
  const router = useRouter();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      const res = await fetch(`/api/admin/tenants/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        alert("Failed to load tenant data.");
        router.push("/admin/tenants");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!confirm(`Are you sure you want to ${action} this tenant?`)) return;
    
    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/${action}`, { method: "POST" });
      if (res.ok) {
        if (action === "impersonate") {
          window.location.href = `/dashboard/${data.tenant.slug}`;
        } else {
          alert(`Tenant ${action}d successfully.`);
          fetchTenantData();
        }
      } else {
        const errData = await res.json();
        alert(errData.error || `Failed to ${action}`);
      }
    } catch (err) {
      alert(`Error performing ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadFile = async (filePath, fileName) => {
    const { data: fileData, error } = await supabase.storage.from('knowledge').download(filePath);
    if (error) {
      alert("Error downloading file: " + error.message);
      return;
    }
    const url = window.URL.createObjectURL(fileData);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkExport = async () => {
    if (!data?.documents?.length) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      for (const doc of data.documents) {
        if (doc.type === "file" && doc.file_path) {
          const { data: fileData, error } = await supabase.storage.from('knowledge').download(doc.file_path);
          if (!error && fileData) {
            zip.file(doc.file_name || doc.file_path.split('/').pop(), fileData);
          }
        } else if (doc.type === "text") {
          zip.file(`${doc.id}.txt`, doc.content || "Empty content");
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.tenant.slug}-documents.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error creating ZIP file");
    } finally {
      setDownloadingZip(false);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading...</div>;
  if (!data || !data.tenant) return <div className="p-8 text-white">Tenant not found</div>;

  const { tenant, members, channels, documents, invoices } = data;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-header flex justify-between items-end">
        <div className="page-title-block">
          <button onClick={() => router.push("/admin/tenants")} className="text-gray-400 hover:text-white mb-2 text-sm flex items-center gap-1">&larr; Back to Tenants</button>
          <h1 className="page-title">{tenant.business_name}</h1>
          <p className="page-subtitle">{tenant.slug} • {tenant.plan_status}</p>
        </div>
        <div className="flex gap-2">
          {tenant.plan_status === "pending_payment" && (
            <button 
              onClick={() => handleAction("activate")}
              disabled={actionLoading === "activate"}
              className="bg-[#1E5FFF] hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === "activate" ? "Activating..." : "Activate"}
            </button>
          )}
          {tenant.plan_status === "active" && (
            <button 
              onClick={() => handleAction("suspend")}
              disabled={actionLoading === "suspend"}
              className="bg-red-900/80 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === "suspend" ? "Suspending..." : "Suspend"}
            </button>
          )}
          <button 
            onClick={() => handleAction("impersonate")}
            disabled={actionLoading === "impersonate"}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {actionLoading === "impersonate" ? "Impersonating..." : "Impersonate"}
          </button>
        </div>
      </div>

      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Info Card */}
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Tenant Details</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex justify-between"><span className="text-gray-500">Business Name</span> <span>{tenant.business_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Slug</span> <span>{tenant.slug}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Plan</span> <span className="capitalize">{tenant.plan || "None"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Status</span> <span>{tenant.plan_status}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Created At</span> <span>{new Date(tenant.created_at).toLocaleString()}</span></div>
            <hr className="border-gray-800 my-4" />
            <div className="flex justify-between"><span className="text-gray-500">Stripe Customer ID</span> <span className="font-mono text-xs">{tenant.stripe_customer_id || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Stripe Sub ID</span> <span className="font-mono text-xs">{tenant.stripe_subscription_id || "N/A"}</span></div>
          </div>
        </div>

        {/* Members */}
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex justify-between items-center">
            Team Members
            <span className="bg-gray-800 text-xs px-2 py-1 rounded-full">{members.length}</span>
          </h2>
          <div className="space-y-3">
            {members.length === 0 ? <p className="text-sm text-gray-500">No members found.</p> : members.map(m => (
              <div key={m.id} className="flex justify-between items-center text-sm border-b border-gray-800/50 pb-2">
                <div className="text-gray-300 font-mono text-xs truncate mr-4">{m.user_id}</div>
                <div className="bg-gray-800 px-2 py-0.5 rounded text-xs text-gray-400 capitalize">{m.role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-white mb-4">WhatsApp Channels</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="text-xs uppercase text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4">Instance Name</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {channels.length === 0 ? (
                  <tr><td colSpan="4" className="py-4 text-center">No channels found.</td></tr>
                ) : channels.map(c => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4 text-white">
                      {c.label} {c.is_primary && <span className="ml-2 text-[10px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded uppercase">Primary</span>}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{c.evolution_instance_name}</td>
                    <td className="py-3 pr-4">{c.whatsapp_phone || "—"}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        c.evolution_status === 'connected' ? 'bg-green-900/50 text-green-300' :
                        c.evolution_status === 'disconnected' ? 'bg-red-900/50 text-red-300' :
                        'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        {c.evolution_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">Knowledge Base</h2>
            <button 
              onClick={handleBulkExport}
              disabled={downloadingZip || documents.length === 0}
              className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
            >
              {downloadingZip ? "Zipping..." : "Export All ZIP"}
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {documents.length === 0 ? <p className="text-sm text-gray-500">No documents found.</p> : documents.map(d => (
              <div key={d.id} className="flex justify-between items-center text-sm bg-[#161b22] p-2 rounded border border-gray-800">
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <span className="text-gray-500">{d.type === 'file' ? '📄' : '📝'}</span>
                  <span className="text-gray-300 truncate">{d.file_name || "Text Snippet"}</span>
                </div>
                {d.type === 'file' && d.file_path && (
                  <button 
                    onClick={() => handleDownloadFile(d.file_path, d.file_name || "document")}
                    className="text-blue-400 hover:text-blue-300 text-xs shrink-0"
                  >
                    Download
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invoices */}
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Invoices</h2>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {invoices.length === 0 ? <p className="text-sm text-gray-500">No invoices found.</p> : invoices.map(inv => (
              <div key={inv.id} className="flex justify-between items-center text-sm bg-[#161b22] p-2 rounded border border-gray-800">
                <div className="flex flex-col">
                  <span className="text-gray-300">${(inv.amount_due / 100).toFixed(2)}</span>
                  <span className="text-xs text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  inv.status === 'paid' ? 'bg-green-900/50 text-green-300' :
                  inv.status === 'open' ? 'bg-blue-900/50 text-blue-300' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
