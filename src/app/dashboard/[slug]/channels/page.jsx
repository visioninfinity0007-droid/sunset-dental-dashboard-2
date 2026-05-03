"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

export default function ChannelsPage({ params }) {
  const { slug } = params;
  const router = useRouter();
  
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientMeta, setClientMeta] = useState({});
  const [planStatus, setPlanStatus] = useState("active");
  const [rescanning, setRescanning] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = React.useRef(null);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels`);
      if (res.ok) {
        const data = await res.json();
        setChannels(data.instances || []);
      } else {
        const data = await res.json();
        setError(data.error);
      }
      const metaRes = await fetch(`/api/client/${slug}`);
      if (metaRes.ok) {
        const meta = await metaRes.json();
        setClientMeta(meta);
        setPlanStatus(meta.plan_status || "active");
      }
    } catch (err) {
      setError("Failed to load channels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRescan = async (id) => {
    setRescanning(id);
    try {
      const res = await fetch(`/api/instances/${id}/rescan`, { method: "POST" });
      if (res.ok) {
        router.push(`/onboarding/connect-whatsapp?instance=${id}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reconnect instance.");
      }
    } catch (err) {
      alert("Error reconnecting instance.");
    } finally {
      setRescanning(null);
      setMenuOpenId(null);
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      const res = await fetch(`/api/instances/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_primary: true })
      });
      if (res.ok) fetchChannels();
    } catch (err) {
      console.error(err);
    } finally {
      setMenuOpenId(null);
    }
  };

  const handleRefreshQR = async (id) => {
    try {
      const res = await fetch(`/api/instances/${id}/refresh-qr`, { method: "POST" });
      if (res.ok) {
        router.push(`/onboarding/connect-whatsapp?instance=${id}`);
      } else {
        alert("Failed to refresh QR.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMenuOpenId(null);
    }
  };

  const handleDisconnect = async (id) => {
    if (!confirm("Are you sure you want to disconnect this instance?")) return;
    try {
      const res = await fetch(`/api/instances/${id}/disconnect`, { method: "POST" });
      if (res.ok) fetchChannels();
    } catch (err) {
      console.error(err);
    } finally {
      setMenuOpenId(null);
    }
  };

  const handleRename = async (id, currentLabel) => {
    const label = prompt("Enter a new label for the WhatsApp number:", currentLabel);
    if (!label || label === currentLabel) {
      setMenuOpenId(null);
      return;
    }
    try {
      const res = await fetch(`/api/instances/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label })
      });
      if (res.ok) fetchChannels();
    } catch (err) {
      console.error(err);
    } finally {
      setMenuOpenId(null);
    }
  };

  const handleDelete = async (id, channelName) => {
    const conf = prompt(`This will permanently disconnect WhatsApp for this number and delete all message history. Type the channel name (${channelName}) to confirm.`);
    if (conf !== channelName) {
      setMenuOpenId(null);
      return;
    }
    try {
      const res = await fetch(`/api/instances/${id}`, { method: "DELETE" });
      if (res.ok) fetchChannels();
    } catch (err) {
      console.error(err);
    } finally {
      setMenuOpenId(null);
    }
  };

  const handleAddChannel = async () => {
    const label = prompt("Enter a label for the new WhatsApp number (e.g., Sales, Support):");
    if (!label) return;
    
    // We need the tenant id, but the api/channels uses the active tenant from server side.
    try {
      // First find tenantId from channels or a separate call
      // Since all channels have the same tenant_id, we can pick the first one
      if (channels.length === 0) return;
      const tenantId = channels[0].tenant_id;
      
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, label }),
      });
      
      if (res.ok) {
        const data = await res.json();
        router.push(`/onboarding/connect-whatsapp?instance=${data.instance.id}`);
      } else {
        alert("Failed to add channel.");
      }
    } catch (err) {
      alert("Error adding channel.");
    }
  };

  return (
    <DashboardShell
      slug={slug}
      activeTab="channels"
      userEmail="" // Ideally fetched, but we match the layout's behavior
      clientMeta={{ plan_status: planStatus }}
    >
      <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">WhatsApp Channels</h1>
            <p className="page-subtitle">Manage your connected WhatsApp numbers.</p>
          </div>
          <div className="header-actions">
            {planStatus === "unconfigured" ? (
              <span className="text-sm text-gray-400">Connecting WhatsApp numbers is available after activation.</span>
            ) : planStatus === "pending_payment" ? (
              <div className="bg-blue-900/50 border border-blue-700 text-blue-200 px-4 py-2 text-sm rounded max-w-xl text-left">
                ⏳ <strong>Awaiting payment confirmation.</strong> Once you've paid via bank transfer, send a screenshot to{" "}
                <a href={`https://wa.me/923128779368?text=Hi%20Vision%20Infinity!%20I've%20paid%20for%20the%20${clientMeta?.plan || "selected"}%20plan.%20My%20business%20is%20${encodeURIComponent(clientMeta?.name || slug)}.%20Invoice%20number:%20${clientMeta?.invoice_number || ""}`} target="_blank" rel="noopener noreferrer" className="font-bold underline text-white">WhatsApp +92 312 8779368</a>{" "}
                with your invoice number. Activation typically happens within 24 hours.
                {clientMeta?.latest_invoice_id && (
                  <div><a href={`/api/invoices/${clientMeta.latest_invoice_id}/download`} className="underline mt-1 inline-block text-blue-300 hover:text-blue-100">View invoice</a></div>
                )}
              </div>
            ) : (
              <button className="bg-[#1E5FFF] text-white px-4 py-2 rounded-md hover:bg-blue-600 font-medium" onClick={handleAddChannel}>
                + Add WhatsApp number
              </button>
            )}
          </div>
        </div>

        {error && <div className="text-red-500 px-8">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-8">
          {loading ? (
             <div className="text-gray-400">Loading channels...</div>
          ) : channels.length === 0 ? (
             <div className="text-gray-400">No channels found.</div>
          ) : (
            channels.map(channel => (
              <div key={channel.id} className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {channel.label}
                    {channel.is_primary && (
                      <span className="text-xs font-medium bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
                        Primary
                      </span>
                    )}
                  </h3>
                  <div className="relative" ref={menuOpenId === channel.id ? menuRef : null}>
                    <button 
                      className="text-gray-400 hover:text-white px-2 py-1 rounded" 
                      onClick={() => setMenuOpenId(menuOpenId === channel.id ? null : channel.id)}
                    >
                      ...
                    </button>
                    {menuOpenId === channel.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#1a1d2d] rounded-md shadow-lg py-1 z-10 border border-gray-700">
                        {!channel.is_primary && (
                          <button onClick={() => handleSetPrimary(channel.id)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                            Set as Primary
                          </button>
                        )}
                        {(channel.evolution_status === 'disconnected' || channel.evolution_status === 'failed') && (
                          <button onClick={() => handleRescan(channel.id)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                            Reconnect
                          </button>
                        )}
                        {channel.evolution_status === 'qr_ready' && (
                          <button onClick={() => handleRefreshQR(channel.id)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                            Refresh QR
                          </button>
                        )}
                        {channel.evolution_status === 'connected' && (
                          <button onClick={() => handleDisconnect(channel.id)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                            Disconnect
                          </button>
                        )}
                        <button onClick={() => handleRename(channel.id, channel.label)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                          Rename
                        </button>
                        <button onClick={() => handleDelete(channel.id, channel.label)} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800">
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-sm text-gray-400 mb-4">
                  <div className="flex justify-between py-1">
                    <span>Status:</span>
                    <span className={`font-medium ${
                      channel.evolution_status === 'connected' ? 'text-green-400' :
                      channel.evolution_status === 'disconnected' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {channel.evolution_status}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Phone:</span>
                    <span className="text-white">{channel.whatsapp_phone || "Not connected"}</span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-800 flex gap-2">
                  {channel.evolution_status === 'pending' && (
                    <button 
                      onClick={() => router.push(`/onboarding/connect-whatsapp?instance=${channel.id}`)}
                      className="text-sm bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded"
                    >
                      Scan QR
                    </button>
                  )}
                  {(channel.evolution_status === 'disconnected' || channel.evolution_status === 'failed') && (
                    <button 
                      onClick={() => handleRescan(channel.id)}
                      disabled={rescanning === channel.id}
                      className="text-sm border border-[#1E5FFF] text-[#1E5FFF] hover:bg-blue-900/30 px-3 py-1.5 rounded disabled:opacity-50 flex items-center gap-2 font-medium"
                    >
                      {rescanning === channel.id && (
                        <svg className="animate-spin h-3 w-3 text-[#1E5FFF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {rescanning === channel.id ? "Reconnecting..." : "Reconnect"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
    </DashboardShell>
  );
}
