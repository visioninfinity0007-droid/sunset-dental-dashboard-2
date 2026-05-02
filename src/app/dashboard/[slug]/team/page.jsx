"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

export default function TeamPage({ params }) {
  const { slug } = params;
  const router = useRouter();

  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [memRes, invRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/team/invite"),
      ]);
      if (memRes.ok) {
        const d = await memRes.json();
        setMembers(d.members || []);
      }
      if (invRes.ok) {
        const d = await invRes.json();
        setInvites(d.invites || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });
      if (res.ok) {
        setInviteModalOpen(false);
        setInviteEmail("");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to send invite");
    }
  };

  return (
    <DashboardShell
      slug={slug}
      activeTab="team"
      userEmail=""
      clientMeta={{}}
    >
      <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">Team Members</h1>
            <p className="page-subtitle">Manage who has access to your workspace.</p>
          </div>
          <div className="header-actions">
            <button className="bg-[#1E5FFF] text-white px-4 py-2 rounded-md hover:bg-blue-600 font-medium" onClick={() => setInviteModalOpen(true)}>
              + Invite member
            </button>
          </div>
        </div>

        <div className="px-8 pb-10">
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden mb-10">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-[#161a29] text-gray-300">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Joined</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                   <tr><td colSpan="4" className="px-6 py-4 text-center">Loading...</td></tr>
                ) : members.map(m => (
                  <tr key={m.id} className="hover:bg-[#1a1d2d]">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{m.name}</div>
                      <div className="text-xs">{m.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        m.role === 'owner' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'
                      }`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(m.joined_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                       <button className="text-gray-500 hover:text-red-400 disabled:opacity-50" disabled={m.role === 'owner'}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-xl font-bold text-white mb-4">Pending Invitations</h2>
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden">
             <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-[#161a29] text-gray-300">
                <tr>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Sent Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                   <tr><td colSpan="4" className="px-6 py-4 text-center">Loading...</td></tr>
                ) : invites.length === 0 ? (
                   <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">No pending invitations</td></tr>
                ) : invites.map(inv => (
                  <tr key={inv.id} className="hover:bg-[#1a1d2d]">
                    <td className="px-6 py-4 text-white">{inv.email}</td>
                    <td className="px-6 py-4 capitalize">{inv.role}</td>
                    <td className="px-6 py-4">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right space-x-3">
                       <button className="text-[#1E5FFF] hover:text-blue-400">Resend</button>
                       <button className="text-gray-500 hover:text-red-400">Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isInviteModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl relative">
              <button 
                onClick={() => setInviteModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >✕</button>
              <h2 className="text-xl font-bold text-white mb-6">Invite Team Member</h2>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white focus:outline-none focus:ring-1 focus:ring-[#1E5FFF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white focus:outline-none focus:ring-1 focus:ring-[#1E5FFF]"
                  >
                    <option value="admin">Admin - Full access except billing/ownership</option>
                    <option value="agent">Agent - Manage leads and reply to messages</option>
                    <option value="viewer">Viewer - Read-only access to dashboard</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1E5FFF] hover:bg-blue-600 focus:outline-none mt-4"
                >
                  Send Invitation
                </button>
              </form>
            </div>
          </div>
        )}
    </DashboardShell>
  );
}
