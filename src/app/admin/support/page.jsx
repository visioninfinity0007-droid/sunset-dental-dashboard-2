"use client";

import { useEffect, useState } from "react";

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/admin/support");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      setReplyText(selectedTicket.admin_reply || "");
      setReplyStatus(selectedTicket.status);
    }
  }, [selectedTicket]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/support/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: replyStatus,
          admin_reply: replyText
        })
      });
      if (res.ok) {
        setSelectedTicket(null);
        fetchTickets();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update ticket");
      }
    } catch (err) {
      alert("Error updating ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      open: "bg-yellow-900/50 text-yellow-400 border-yellow-800/50",
      in_progress: "bg-blue-900/50 text-blue-400 border-blue-800/50",
      resolved: "bg-green-900/50 text-green-400 border-green-800/50",
      closed: "bg-gray-800 text-gray-400 border-gray-700"
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${map[status]}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const filteredTickets = tickets.filter(t => {
    const statusMatch = filterStatus === "all" || t.status === filterStatus;
    const priorityMatch = filterPriority === "all" || t.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-8 border-b border-gray-800 bg-[#0f111a]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Support Tickets (All Tenants)</h1>
            <p className="text-gray-400 text-sm">Manage help requests from across the platform.</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-[#1a1d2d] border border-gray-700 text-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            
            <select 
              value={filterPriority} 
              onChange={e => setFilterPriority(e.target.value)}
              className="bg-[#1a1d2d] border border-gray-700 text-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 bg-[#0a0c14]">
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No tickets found matching your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-[#161a29] text-gray-300">
                  <tr>
                    <th className="px-6 py-4 font-medium">Tenant</th>
                    <th className="px-6 py-4 font-medium">Subject</th>
                    <th className="px-6 py-4 font-medium">Priority</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredTickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-[#1a1d2d] transition-colors cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{ticket.tenants?.business_name || "Unknown"}</div>
                        <div className="text-[10px] text-gray-500 uppercase">{ticket.tenants?.plan || "Free"}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-200">{ticket.subject}</td>
                      <td className="px-6 py-4 capitalize font-medium">{ticket.priority}</td>
                      <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-400 hover:text-blue-300">View & Reply</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Admin Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-8 max-w-3xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >✕</button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedTicket.subject}</h2>
                  <p className="text-sm text-gray-400">
                    From <span className="text-blue-400">{selectedTicket.tenants?.business_name}</span> • 
                    Submitted {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="bg-[#161a29] rounded-lg p-6 border border-gray-800">
                  <div className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">User Message</div>
                  <div className="text-gray-200 whitespace-pre-wrap">{selectedTicket.message}</div>
                </div>

                <form onSubmit={handleUpdate} className="space-y-4 pt-4 border-t border-gray-800">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Admin Reply</label>
                    <textarea 
                      rows={6}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Type your response here..."
                      className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-[#1a1d2d] text-white focus:outline-none focus:border-blue-500"
                    ></textarea>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Set Status</label>
                      <select 
                        value={replyStatus} 
                        onChange={e => setReplyStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                    <div className="flex-shrink-0 pt-6">
                      <button 
                        type="submit"
                        disabled={submitting}
                        className="bg-[#1E5FFF] hover:bg-blue-600 text-white px-8 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {submitting ? "Updating..." : "Save Reply & Update Status"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="space-y-6 bg-[#0a0c14] p-4 rounded-lg border border-gray-800 h-fit">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Ticket Info</div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500">Priority</div>
                      <div className={`text-sm capitalize font-medium ${selectedTicket.priority === 'urgent' ? 'text-red-400' : 'text-gray-300'}`}>
                        {selectedTicket.priority}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Current Status</div>
                      <div>{getStatusBadge(selectedTicket.status)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Tenant Info</div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500">Business Name</div>
                      <div className="text-sm text-gray-300">{selectedTicket.tenants?.business_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Plan</div>
                      <div className="text-sm text-gray-300 uppercase font-bold">{selectedTicket.tenants?.plan}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
