"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function TrainBotPage() {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState(null);

  useEffect(() => {
    // Determine user's tenant
    fetch("/api/channels")
      .then(r => r.json())
      .then(d => {
         if (d.tenantSlug) setTenantSlug(d.tenantSlug);
      })
      .catch(console.error);
  }, []);

  const handleSkip = () => {
    if (tenantSlug) {
      router.push(`/dashboard/${tenantSlug}`);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#04050F] flex flex-col items-center justify-center py-12 sm:px-6 lg:px-8 font-inter">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center flex flex-col items-center mb-8">
        <Logo size={36} withText={true} />
        <h2 className="mt-6 text-3xl font-extrabold text-white font-poppins mb-4">
          Train your new AI Assistant
        </h2>
        <p className="text-gray-400">
          Upload knowledge so your bot can answer questions and book appointments 24/7.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 max-w-5xl w-full px-4 mb-10">
        <a href={tenantSlug ? `/dashboard/${tenantSlug}/knowledge?tab=flows` : "#"} className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 hover:border-[#1E5FFF] transition-colors flex flex-col items-center text-center cursor-pointer">
          <div className="w-12 h-12 bg-blue-900/50 rounded-full flex items-center justify-center mb-4 text-[#1E5FFF]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Add chat flows</h3>
          <p className="text-sm text-gray-400">Write custom scripts for the bot to follow.</p>
        </a>

        <a href={tenantSlug ? `/dashboard/${tenantSlug}/knowledge?tab=docs` : "#"} className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 hover:border-[#1E5FFF] transition-colors flex flex-col items-center text-center cursor-pointer">
          <div className="w-12 h-12 bg-purple-900/50 rounded-full flex items-center justify-center mb-4 text-[#7C3AED]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Upload FAQs & Docs</h3>
          <p className="text-sm text-gray-400">Train on your existing PDFs, Word docs, and Q&As.</p>
        </a>

        <a href={tenantSlug ? `/dashboard/${tenantSlug}/knowledge?tab=website` : "#"} className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 hover:border-[#1E5FFF] transition-colors flex flex-col items-center text-center cursor-pointer">
          <div className="w-12 h-12 bg-green-900/50 rounded-full flex items-center justify-center mb-4 text-[#25D366]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Scrape your website</h3>
          <p className="text-sm text-gray-400">Automatically ingest your entire website's content.</p>
        </a>
      </div>

      <button onClick={handleSkip} className="text-sm font-medium text-gray-500 hover:text-gray-300">
        Skip for now &rarr; go to dashboard
      </button>
    </div>
  );
}
