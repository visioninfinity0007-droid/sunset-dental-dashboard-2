"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'pending', 'paid', 'overdue', 'cancelled'
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await fetch("/api/admin/invoices");
      const data = await res.json();
      if (res.ok) {
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id) => {
    if (!confirm("Mark this invoice as paid?")) return;
    try {
      const res = await fetch(`/api/admin/invoices/${id}/pay`, { method: "POST" });
      if (res.ok) {
        alert("Invoice marked as paid.");
        fetchInvoices();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to mark paid.");
      }
    } catch (err) {
      alert("Error marking paid.");
    }
  };

  const handleCancel = async (id) => {
    if (!confirm("Cancel this invoice?")) return;
    try {
      const res = await fetch(`/api/admin/invoices/${id}/cancel`, { method: "POST" });
      if (res.ok) {
        alert("Invoice cancelled.");
        fetchInvoices();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to cancel.");
      }
    } catch (err) {
      alert("Error cancelling.");
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === "all") return true;
    return inv.status === filter;
  });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage billing and payments.</p>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          {["all", "pending", "paid", "overdue", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                filter === f ? "bg-[#1E5FFF] text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-[#161b22] border-b border-gray-800 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4">Invoice #</th>
                <th className="px-6 py-4">Tenant</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Total (PKR)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Issued</th>
                <th className="px-6 py-4">Due</th>
                <th className="px-6 py-4">Paid</th>
                <th className="px-6 py-4 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center">Loading invoices...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center">No invoices found.</td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <React.Fragment key={inv.id}>
                    <tr 
                      className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === inv.id ? null : inv.id)}
                    >
                      <td className="px-6 py-4 font-bold text-white">{inv.invoice_number}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-200">{inv.tenants?.business_name}</div>
                        <div className="text-xs text-gray-500">{inv.tenants?.slug}</div>
                      </td>
                      <td className="px-6 py-4 capitalize">{inv.plan}</td>
                      <td className="px-6 py-4 text-white">Rs. {inv.total_pkr?.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          inv.status === 'paid' ? 'bg-green-900/50 text-green-300' :
                          inv.status === 'pending' ? 'bg-blue-900/50 text-blue-300' :
                          inv.status === 'overdue' ? 'bg-red-900/50 text-red-300' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{new Date(inv.issued_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">{new Date(inv.due_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}</td>
                      <td className="px-6 py-4 text-right">
                        {inv.pdf_storage_path && (
                          <a 
                            href={`/api/admin/invoices/${inv.id}/download`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[#1E5FFF] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            PDF ↗
                          </a>
                        )}
                      </td>
                    </tr>
                    {expandedRow === inv.id && (
                      <tr className="bg-[#11131c]">
                        <td colSpan="9" className="px-6 py-4 border-t border-gray-800/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-gray-300 block mb-1">Notes</strong>
                              <p className="text-gray-400 text-xs max-w-lg">{inv.notes || "No notes available."}</p>
                            </div>
                            <div className="flex gap-2">
                              {inv.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handlePay(inv.id)}
                                    className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                                  >
                                    Mark as paid
                                  </button>
                                  <button
                                    onClick={() => handleCancel(inv.id)}
                                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                                  >
                                    Cancel invoice
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
