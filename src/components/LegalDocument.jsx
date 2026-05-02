"use client";

import { privacyPolicyContent, termsOfServiceContent, dpaContent } from "@/lib/legal-content";
import Link from "next/link";

const contents = {
  privacy: privacyPolicyContent,
  terms: termsOfServiceContent,
  dpa: dpaContent,
};

export default function LegalDocument({ slug }) {
  const content = contents[slug] || "Content not found.";

  return (
    <div className="min-h-screen bg-[#060d1e] text-gray-300 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-[#1E5FFF] hover:underline mb-8 inline-block">
          ← Back to Home
        </Link>
        <div className="bg-[#0f111a] border border-gray-800 rounded-2xl p-8 sm:p-12 shadow-xl">
          <div 
            className="legal-content"
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        </div>
      </div>
      <style jsx global>{`
        .legal-content h1 {
          font-size: 2.25rem;
          font-weight: 700;
          color: #e8f3ff;
          margin-bottom: 0.5rem;
        }
        .legal-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #b0cde8;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }
        .legal-content p {
          margin-bottom: 1rem;
          line-height: 1.7;
        }
        .legal-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .legal-content li {
          margin-bottom: 0.5rem;
        }
        .legal-content strong {
          color: #e8f3ff;
        }
      `}</style>
    </div>
  );
}
