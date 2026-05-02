"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";

export default function BotConfigPage({ params }) {
  const { slug } = params;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [personality, setPersonality] = useState("");
  const [language, setLanguage] = useState("en");
  const [config, setConfig] = useState({
    bot_name: "Assistant",
    tone: "professional",
    business_hours: "9 AM - 5 PM",
    auto_reply_outside_hours: "Hi! We are currently closed. We'll get back to you as soon as we open."
  });

  useEffect(() => {
    fetchConfig();
  }, [slug]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`/api/bot/${slug}/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.personality) setPersonality(data.personality);
        if (data.language) setLanguage(data.language);
        if (data.config && Object.keys(data.config).length > 0) {
          setConfig(prev => ({ ...prev, ...data.config }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/bot/${slug}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personality,
          language,
          config
        })
      });
      
      if (res.ok) {
        alert("Bot configuration saved successfully.");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save configuration.");
      }
    } catch (err) {
      alert("Error saving configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <DashboardShell slug={slug} activeTab="bot" userEmail="" clientMeta={{}}>
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Bot Configuration</h1>
          <p className="page-subtitle">Customize how your AI assistant behaves and interacts with leads.</p>
        </div>
      </div>

      <div className="px-8 pb-10 max-w-4xl">
        {loading ? (
          <div className="text-gray-400">Loading configuration...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">General Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Bot Name</label>
                  <input 
                    type="text" 
                    value={config.bot_name || ""} 
                    onChange={e => handleConfigChange('bot_name', e.target.value)}
                    className="w-full px-4 py-2 bg-[#161a29] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#1E5FFF]"
                    placeholder="e.g., Sarah"
                  />
                  <p className="text-xs text-gray-500 mt-1">The name the bot uses to introduce itself.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Default Language</label>
                  <select 
                    value={language} 
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full px-4 py-2 bg-[#161a29] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#1E5FFF]"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="pt">Portuguese</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Personality & Tone</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Response Tone</label>
                  <select 
                    value={config.tone || "professional"} 
                    onChange={e => handleConfigChange('tone', e.target.value)}
                    className="w-full md:w-1/2 px-4 py-2 bg-[#161a29] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#1E5FFF]"
                  >
                    <option value="professional">Professional & Polished</option>
                    <option value="friendly">Friendly & Casual</option>
                    <option value="enthusiastic">Enthusiastic & Energetic</option>
                    <option value="empathetic">Empathetic & Caring</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Custom Instructions (System Prompt)</label>
                  <textarea 
                    rows={6}
                    value={personality} 
                    onChange={e => setPersonality(e.target.value)}
                    className="w-full px-4 py-2 bg-[#161a29] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#1E5FFF] font-mono text-sm"
                    placeholder="e.g., You are a helpful dental assistant. Always be polite. Do not offer medical advice."
                  />
                  <p className="text-xs text-gray-500 mt-1">These instructions override the default AI behavior.</p>
                </div>
              </div>
            </div>

            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Business Hours</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Operating Hours</label>
                  <input 
                    type="text" 
                    value={config.business_hours || ""} 
                    onChange={e => handleConfigChange('business_hours', e.target.value)}
                    className="w-full md:w-1/2 px-4 py-2 bg-[#161a29] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#1E5FFF]"
                    placeholder="e.g., Mon-Fri 9AM-5PM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Out of Hours Auto-Reply</label>
                  <textarea 
                    rows={3}
                    value={config.auto_reply_outside_hours || ""} 
                    onChange={e => handleConfigChange('auto_reply_outside_hours', e.target.value)}
                    className="w-full px-4 py-2 bg-[#161a29] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-[#1E5FFF]"
                    placeholder="Message to send when closed..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-800">
              <button 
                type="submit" 
                disabled={saving}
                className="bg-[#1E5FFF] hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
