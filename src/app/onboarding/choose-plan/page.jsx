"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const plans = [
  {
    id: "starter",
    name: "Starter",
    setup: 30000,
    monthly: 12000,
    bestFor: "Small businesses, single product",
    features: [
      "Smart FAQ (30 Qs)",
      "Lead capture",
      "Google Sheets sync",
      "English + Roman Urdu",
      "<30s replies",
      "Monthly report",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    setup: 45000,
    monthly: 20000,
    bestFor: "Growing SMEs, lead generation",
    popular: true,
    features: [
      "Everything in Starter",
      "Full order capture",
      "Lead scoring",
      "Excel/CRM export",
      "Auto upsell",
      "Meta Ads integration",
      "Revenue dashboard",
      "Bi-weekly reports",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    setup: 95000,
    monthly: 35000,
    bestFor: "High-volume, multi-branch",
    features: [
      "Everything in Growth",
      "Multi-branch routing",
      "Human handoff",
      "AI conversation summaries",
      "JazzCash/EasyPaisa",
      "Weekly strategy call",
      "Priority 1-hr support",
    ],
  },
];

function PlanPicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug");

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedDPA, setAgreedDPA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = selectedPlan && agreedTerms && agreedPrivacy && agreedDPA;

  async function handleSelectPlan() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/select-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          acceptedTerms: agreedTerms,
          acceptedPrivacy: agreedPrivacy,
          acceptedDPA: agreedDPA,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Failed to select plan.");
        setLoading(false);
        return;
      }

      // Track with GA
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "plan_selected", { plan: selectedPlan });
      }

      router.push(data.redirectTo);
    } catch (err) {
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060d1e] text-white py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#e8f3ff]">Choose your plan</h1>
          <p className="text-xl text-[#b0cde8] max-w-2xl mx-auto">
            All plans include a free 30-min onboarding call. 3-month minimum, cancel with 30-day notice.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedPlan(p.id)}
              className={`relative bg-[#0f111a] border rounded-2xl p-8 cursor-pointer transition-all ${
                selectedPlan === p.id
                  ? "border-[#1E5FFF] shadow-[0_0_30px_rgba(30,95,255,0.2)]"
                  : "border-gray-800 hover:border-gray-600"
              }`}
            >
              {p.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1E5FFF] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                  Most Popular
                </div>
              )}
              <h2 className="text-2xl font-bold mb-2">{p.name}</h2>
              <p className="text-sm text-[#38bdf8] mb-6 min-h-[40px]">{p.bestFor}</p>

              <div className="mb-6 space-y-2 border-b border-gray-800 pb-6">
                <div>
                  <span className="text-3xl font-bold">Rs. {p.monthly.toLocaleString()}</span>
                  <span className="text-gray-400"> / mo</span>
                </div>
                <div className="text-sm text-gray-400">
                  + Rs. {p.setup.toLocaleString()} one-time setup
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start text-sm text-gray-300">
                    <svg className="w-5 h-5 text-[#22d3ee] mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-6 border-t border-gray-800">
                <button
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    selectedPlan === p.id
                      ? "bg-[#1E5FFF] text-white"
                      : "bg-[#162a4a] text-[#e8f3ff] hover:bg-[#1f3a63]"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(p.id);
                  }}
                >
                  {selectedPlan === p.id ? "Selected" : "Choose Plan"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-xl mx-auto bg-[#0f111a] border border-gray-800 rounded-xl p-8 mb-8">
          <h3 className="text-lg font-bold mb-4">Required Agreements</h3>
          <div className="space-y-4">
            <label className="flex items-start cursor-pointer group">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-[#1E5FFF] focus:ring-[#1E5FFF] focus:ring-offset-gray-900"
                />
              </div>
              <div className="ml-3 text-sm">
                <span className="text-gray-300">I agree to the </span>
                <a href="/terms" target="_blank" className="text-[#1E5FFF] hover:underline" onClick={e => e.stopPropagation()}>Terms of Service</a>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={agreedPrivacy}
                  onChange={(e) => setAgreedPrivacy(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-[#1E5FFF] focus:ring-[#1E5FFF] focus:ring-offset-gray-900"
                />
              </div>
              <div className="ml-3 text-sm">
                <span className="text-gray-300">I agree to the </span>
                <a href="/privacy" target="_blank" className="text-[#1E5FFF] hover:underline" onClick={e => e.stopPropagation()}>Privacy Policy</a>
              </div>
            </label>

            <label className="flex items-start cursor-pointer group">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={agreedDPA}
                  onChange={(e) => setAgreedDPA(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-[#1E5FFF] focus:ring-[#1E5FFF] focus:ring-offset-gray-900"
                />
              </div>
              <div className="ml-3 text-sm">
                <span className="text-gray-300">I agree to the </span>
                <a href="/dpa" target="_blank" className="text-[#1E5FFF] hover:underline" onClick={e => e.stopPropagation()}>Data Processing Agreement</a>
              </div>
            </label>
          </div>

          {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">{error}</div>}

          <div className="mt-8 flex flex-col items-center">
            <button
              onClick={handleSelectPlan}
              disabled={!canSubmit || loading}
              className="w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-[#1E5FFF] hover:bg-blue-600 text-white shadow-[0_0_20px_rgba(30,95,255,0.3)]"
            >
              {loading ? "Processing..." : `Continue with ${plans.find(p => p.id === selectedPlan)?.name || "Plan"}`}
            </button>
            <div className="mt-4">
              <Link href={`/dashboard/${slug}`} className="text-sm text-gray-500 hover:text-gray-300 hover:underline">
                I'll decide later
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060d1e] flex items-center justify-center text-white">Loading...</div>}>
      <PlanPicker />
    </Suspense>
  );
}
