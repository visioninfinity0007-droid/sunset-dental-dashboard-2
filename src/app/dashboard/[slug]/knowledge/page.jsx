"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

export default function KnowledgePage({ params }) {
  const { slug } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "flows");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Flow / FAQ state
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [formData, setFormData] = useState({ label: "", content: "", question: "", answer: "", url: "", deep: false });

  // File state
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge/sources");
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSubmitText = async (e) => {
    e.preventDefault();
    let payload = {};
    if (modalType === "flow") {
      payload = { type: "flow", label: formData.label, content: formData.content };
    } else if (modalType === "faq") {
      payload = { type: "faq", label: formData.question, content: JSON.stringify({ question: formData.question, answer: formData.answer }) };
    } else if (modalType === "website") {
      payload = { type: "website", label: formData.url, url: formData.url, meta: { deep: formData.deep } };
    }

    try {
      const res = await fetch("/api/knowledge/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setModalOpen(false);
        setFormData({ label: "", content: "", question: "", answer: "", url: "", deep: false });
        fetchSources();
      } else {
        alert("Failed to add source");
      }
    } catch(err) {
      alert("Error adding source");
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/knowledge/documents", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        fetchSources();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch(err) {
      alert("Upload failed");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const renderStatus = (status, errorMsg) => {
    const map = {
      pending: "bg-gray-800 text-gray-300",
      processing: "bg-blue-900 text-blue-300 animate-pulse",
      ready: "bg-green-900 text-green-300",
      failed: "bg-red-900 text-red-300",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status]}`} title={errorMsg}>
        {status}
      </span>
    );
  };

  const filteredSources = sources.filter(s => {
    if (activeTab === "flows") return s.type === "flow";
    if (activeTab === "faqs") return s.type === "faq";
    if (activeTab === "website") return s.type === "website";
    if (activeTab === "docs") return s.type === "document";
    return true;
  });

  return (
    <DashboardShell
      slug={slug}
      activeTab="knowledge"
      userEmail=""
      clientMeta={{}}
    >
      <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title capitalize">{activeTab.replace("docs", "documents")}</h1>
            <p className="page-subtitle">Train your AI assistant with custom knowledge.</p>
          </div>
          <div className="header-actions">
            {activeTab === "flows" && (
              <button className="bg-[#1E5FFF] text-white px-4 py-2 rounded-md hover:bg-blue-600" onClick={() => { setModalType("flow"); setModalOpen(true); }}>+ Add Flow</button>
            )}
            {activeTab === "faqs" && (
              <button className="bg-[#1E5FFF] text-white px-4 py-2 rounded-md hover:bg-blue-600" onClick={() => { setModalType("faq"); setModalOpen(true); }}>+ Add FAQ</button>
            )}
            {activeTab === "website" && (
              <button className="bg-[#1E5FFF] text-white px-4 py-2 rounded-md hover:bg-blue-600" onClick={() => { setModalType("website"); setModalOpen(true); }}>+ Add Website URL</button>
            )}
            {activeTab === "docs" && (
              <div>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.docx,.doc,.txt,.csv" />
                <button className="bg-[#1E5FFF] text-white px-4 py-2 rounded-md hover:bg-blue-600" onClick={() => fileInputRef.current.click()}>+ Upload File</button>
              </div>
            )}
          </div>
        </div>

        <div className="px-8 border-b border-gray-800 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'flows' ? 'border-[#1E5FFF] text-[#1E5FFF]' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'}`} onClick={() => setActiveTab("flows")}>Chat Flows</button>
            <button className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'faqs' ? 'border-[#1E5FFF] text-[#1E5FFF]' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'}`} onClick={() => setActiveTab("faqs")}>FAQs</button>
            <button className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'docs' ? 'border-[#1E5FFF] text-[#1E5FFF]' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'}`} onClick={() => setActiveTab("docs")}>Documents</button>
            <button className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'website' ? 'border-[#1E5FFF] text-[#1E5FFF]' : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'}`} onClick={() => setActiveTab("website")}>Website Links</button>
          </nav>
        </div>

        <div className="px-8 pb-10">
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden mb-10">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-[#161a29] text-gray-300">
                <tr>
                  <th className="px-6 py-4 font-medium">Label</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Added</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loading ? (
                   <tr><td colSpan="4" className="px-6 py-4 text-center">Loading...</td></tr>
                ) : filteredSources.length === 0 ? (
                   <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">No data found</td></tr>
                ) : filteredSources.map(s => (
                  <tr key={s.id} className="hover:bg-[#1a1d2d]">
                    <td className="px-6 py-4 text-white font-medium max-w-xs truncate">{s.label}</td>
                    <td className="px-6 py-4">{renderStatus(s.status, s.error_message)}</td>
                    <td className="px-6 py-4">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                       {s.status === 'failed' && <button className="text-[#1E5FFF] hover:text-blue-400 mr-3">Retry</button>}
                       <button className="text-gray-500 hover:text-red-400">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl relative">
              <button 
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >✕</button>
              <h2 className="text-xl font-bold text-white mb-6 capitalize">Add {modalType}</h2>
              <form onSubmit={handleSubmitText} className="space-y-4">
                {modalType === "flow" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Flow Name / Trigger</label>
                      <input type="text" required value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Flow Content / Instructions</label>
                      <textarea required rows={6} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white"></textarea>
                    </div>
                  </>
                )}
                {modalType === "faq" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Question</label>
                      <input type="text" required value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Answer</label>
                      <textarea required rows={4} value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white"></textarea>
                    </div>
                  </>
                )}
                {modalType === "website" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">URL to Scrape</label>
                      <input type="url" required value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://example.com" className="w-full px-3 py-2 border border-gray-700 rounded-md bg-[#1a1d2d] text-white" />
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" checked={formData.deep} onChange={e => setFormData({...formData, deep: e.target.checked})} className="mr-2 rounded bg-gray-800" />
                      <label className="text-sm text-gray-300">Scrape linked pages too (Deep scan)</label>
                    </div>
                  </>
                )}
                <button type="submit" className="w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-[#1E5FFF] hover:bg-blue-600 mt-4">
                  Save
                </button>
              </form>
            </div>
          </div>
        )}
    </DashboardShell>
  );
}
