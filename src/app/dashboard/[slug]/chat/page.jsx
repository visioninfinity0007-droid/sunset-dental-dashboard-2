"use client";

import { useEffect, useState, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";

export default function ChatPage({ params }) {
  const { slug } = params;
  
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/chat/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchMessages = async (lead) => {
    if (!lead) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/${slug}/messages?leadId=${lead.id}&phone=${encodeURIComponent(lead.phone)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        scrollToBottom();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(() => {
      fetchLeads();
      if (selectedLead) {
        // Simple polling for messages, ideally use a timestamp cursor, but fetching the latest 50 is fine for polling
        fetch(`/api/chat/${slug}/messages?leadId=${selectedLead.id}&phone=${encodeURIComponent(selectedLead.phone)}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d && d.messages) setMessages(d.messages);
          })
          .catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [slug, selectedLead]);

  useEffect(() => {
    if (selectedLead) {
      fetchMessages(selectedLead);
    }
  }, [selectedLead]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedLead || sending) return;

    setSending(true);
    const body = {
      phone: selectedLead.phone,
      message: messageInput.trim(),
      instanceId: selectedLead.instance_id || leads.find(l => l.id === selectedLead.id)?.instance_id
    };

    // Optimistic UI
    const optimisticMsg = {
      id: "temp-" + Date.now(),
      body: messageInput.trim(),
      sender: "human",
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setMessageInput("");
    scrollToBottom();

    try {
      // We need the instanceId. If it's not on the selectedLead object, we might need to find it from leads list, 
      // but let's assume it was fetched or we can fetch it. Wait, leads query doesn't select instance_id in route.js!
      // Let's modify route.js to select instance_id, or we can fetch it. I'll make sure route.js selects instance_id.
      
      const res = await fetch(`/api/chat/${slug}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "Failed to send message");
        // Remove optimistic message
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      } else {
        const { message } = await res.json();
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? message : m));
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      alert("Error sending message");
    } finally {
      setSending(false);
    }
  };

  const handleToggleHandler = async () => {
    if (!selectedLead) return;
    const newHandler = selectedLead.current_handler === 'bot' ? 'human' : 'bot';
    
    // Optimistic update
    setSelectedLead({ ...selectedLead, current_handler: newHandler });
    setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, current_handler: newHandler } : l));

    try {
      await fetch(`/api/leads/${selectedLead.id}/handler`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handler: newHandler })
      });
    } catch (err) {
      console.error(err);
      // Revert on error
      setSelectedLead({ ...selectedLead, current_handler: selectedLead.current_handler });
    }
  };

  const loadMoreMessages = async () => {
    if (messages.length === 0 || !selectedLead) return;
    const oldestTimestamp = messages[0].timestamp;
    try {
      const res = await fetch(`/api/chat/${slug}/messages?leadId=${selectedLead.id}&phone=${encodeURIComponent(selectedLead.phone)}&before=${encodeURIComponent(oldestTimestamp)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => [...data.messages, ...prev]);
        }
      }
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <DashboardShell slug={slug} activeTab="chat" userEmail="" clientMeta={{}}>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Sidebar - Leads List */}
        <div className="w-1/3 min-w-[300px] border-r border-gray-800 bg-[#0a0c14] flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Live Chat</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingLeads ? (
              <div className="p-4 text-center text-gray-500">Loading conversations...</div>
            ) : leads.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No conversations yet</div>
            ) : (
              leads.map(lead => (
                <div 
                  key={lead.id} 
                  onClick={() => setSelectedLead(lead)}
                  className={`p-4 border-b border-gray-800/50 cursor-pointer hover:bg-[#161a29] transition-colors ${selectedLead?.id === lead.id ? 'bg-[#161a29]' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-white truncate pr-2">{lead.name || lead.phone}</span>
                    {lead.last_contact && (
                      <span className="text-xs text-gray-500 shrink-0">
                        {new Date(lead.last_contact).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        lead.intent === 'hot' ? 'bg-red-900/50 text-red-400' :
                        lead.intent === 'warm' ? 'bg-orange-900/50 text-orange-400' :
                        lead.intent === 'emergency' ? 'bg-purple-900/50 text-purple-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {lead.intent || 'cold'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        lead.current_handler === 'bot' ? 'bg-blue-900/50 text-blue-400' : 'bg-green-900/50 text-green-400'
                      }`}>
                        {lead.current_handler}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Chat Area */}
        <div className="flex-1 bg-[#0f111a] flex flex-col relative">
          {selectedLead ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-800 bg-[#161a29] flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-white">{selectedLead.name || selectedLead.phone}</h3>
                  <p className="text-xs text-gray-400">{selectedLead.phone}</p>
                </div>
                <div>
                  <button 
                    onClick={handleToggleHandler}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      selectedLead.current_handler === 'bot' 
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                        : 'bg-green-900/80 text-green-300 hover:bg-green-800'
                    }`}
                  >
                    {selectedLead.current_handler === 'bot' ? 'Takeover Conversation' : 'Return to Bot'}
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length >= 50 && (
                  <div className="text-center pb-4">
                    <button onClick={loadMoreMessages} className="text-xs text-blue-400 hover:text-blue-300">Load previous messages</button>
                  </div>
                )}
                {loadingMessages && messages.length === 0 ? (
                  <div className="text-center text-gray-500">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500">No messages found for this lead.</div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.sender === 'user' 
                          ? 'bg-gray-800 text-gray-200 rounded-tl-sm' 
                          : msg.sender === 'bot'
                            ? 'bg-blue-900/50 text-blue-100 border border-blue-800/50 rounded-tr-sm'
                            : 'bg-[#1E5FFF] text-white rounded-tr-sm'
                      }`}>
                        <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
                        <div className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-gray-500' : 'text-blue-200/70'}`}>
                          {msg.sender === 'bot' && <span className="mr-1">🤖</span>}
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-[#161a29] border-t border-gray-800">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="flex-1 bg-[#0f111a] border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-[#1E5FFF]"
                  />
                  <button 
                    type="submit" 
                    disabled={!messageInput.trim() || sending}
                    className="bg-[#1E5FFF] hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <div className="text-4xl mb-4">💬</div>
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
