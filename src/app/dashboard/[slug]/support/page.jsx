"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";

export default function SupportPage({ params }) {
  const { slug } = params;
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ subject: "", priority: "normal", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`/api/dashboard/${slug}/support`);
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
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.message.length < 20) return alert("Message must be at least 20 characters");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dashboard/${slug}/support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ subject: "", priority: "normal", message: "" });
        fetchTickets();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit ticket");
      }
    } catch (err) {
      alert("Error submitting ticket");
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

  const getPriorityColor = (priority) => {
    const map = {
      low: "text-gray-400",
      normal: "text-blue-400",
      high: "text-orange-400",
      urgent: "text-red-400 font-bold"
    };
    return map[priority] || "text-gray-400";
  };

  return (
    <DashboardShell slug={slug} activeTab="support" userEmail="" clientMeta={{}}>
      <div className="page-header px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-white">Support Tickets</h1>
          <p className="page-subtitle text-gray-400 text-sm">Need help? Submit a ticket to our support team.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#1E5FFF] hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + New Ticket
        </button>
      </div>

      <div className="px-8 pb-10">
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              <div className="text-4xl mb-4">🎫</div>
              <p>You haven't submitted any tickets yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-[#161a29] text-gray-300">
                  <tr>
                    <th className="px-6 py-4 font-medium">Subject</th>
                    <th className="px-6 py-4 font-medium">Priority</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Submitted</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-[#1a1d2d] transition-colors cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                      <td className="px-6 py-4 text-white font-medium">{ticket.subject}</td>
                      <td className={`px-6 py-4 capitalize ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</td>
                      <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>
                      <td className="px-6 py-4">{new Date(ticket.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right text-blue-400 hover:text-blue-300">View Details</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >✕</button>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-white">{selectedTicket.subject}</h2>
                {getStatusBadge(selectedTicket.status)}
              </div>
              <p className="text-xs text-gray-500">
                Submitted on {new Date(selectedTicket.created_at).toLocaleString()} • Priority: <span className={getPriorityColor(selectedTicket.priority)}>{selectedTicket.priority}</span>
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-[#161a29] rounded-lg p-4 border border-gray-800">
                <div className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">Your Message</div>
                <div className="text-gray-200 whitespace-pre-wrap">{selectedTicket.message}</div>
              </div>

              {selectedTicket.admin_reply ? (
                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-800/30">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-blue-400 uppercase font-bold tracking-wider">Admin Reply</div>
                    {selectedTicket.replied_at && (
                      <span className="text-[10px] text-blue-400/60">{new Date(selectedTicket.replied_at).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-blue-100 whitespace-pre-wrap">{selectedTicket.admin_reply}</div>
                </div>
              ) : (
                <div className="text-center py-6 border-t border-gray-800 mt-6">
                  <p className="text-gray-500 text-sm italic">Waiting for an admin reply...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >✕</button>
            <h2 className="text-xl font-bold text-white mb-6">Submit New Ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
                <input 
                  type="text" 
                  required 
                  value={formData.subject} 
                  onChange={e => setFormData({...formData, subject: e.target.value})} 
                  placeholder="What can we help you with?"
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white focus:outline-none focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                <select 
                  value={formData.priority} 
                  onChange={e => setFormData({...formData, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Message (Min 20 chars)</label>
                <textarea 
                  required 
                  rows={5} 
                  value={formData.message} 
                  onChange={e => setFormData({...formData, message: e.target.value})} 
                  placeholder="Describe your issue in detail..."
                  className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white focus:outline-none focus:border-blue-500"
                ></textarea>
                <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                  <span>{formData.message.length} characters</span>
                  <span>Min 20 required</span>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={submitting || formData.message.length < 20}
                className="w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-[#1E5FFF] hover:bg-blue-600 disabled:opacity-50 transition-colors mt-4"
              >
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
