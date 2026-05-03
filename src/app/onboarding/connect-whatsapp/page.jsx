"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";

function ConnectWhatsAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const instanceId = searchParams.get("instance");
  const slug = searchParams.get("slug");

  const [instanceName, setInstanceName] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState("initializing"); // initializing, pending, qr_ready, connected, failed
  const [error, setError] = useState(null);
  const [isExisting, setIsExisting] = useState(false);
  const [tenantSlug, setTenantSlug] = useState(slug);

  // 1. Create temporary instance on mount
  useEffect(() => {
    const init = async () => {
      if (instanceId) {
        // Mode: Existing Instance Reconnect
        setIsExisting(true);
        try {
          const res = await fetch(`/api/instances/${instanceId}/status`);
          if (res.ok) {
            const data = await res.json();
            setInstanceName(data.instanceName || data.name);
            setTenantSlug(data.tenantSlug);
            setStatus("pending");
          } else {
            setError("Failed to resolve instance");
            setStatus("failed");
          }
        } catch (err) {
          setError("Connection error");
          setStatus("failed");
        }
      } else {
        // Mode: Onboarding Temporary Instance
        try {
          const res = await fetch("/api/onboarding/create-temp-instance", { method: "POST" });
          if (res.ok) {
            const data = await res.json();
            setInstanceName(data.instanceName);
            setStatus("pending");
          } else {
            const data = await res.json();
            setError(data.error || "Failed to initialize connection");
            setStatus("failed");
          }
        } catch (err) {
          setError("Network error. Please refresh.");
          setStatus("failed");
        }
      }
    };
    init();
  }, [instanceId]);

  // 2. Poll for QR and Status
  useEffect(() => {
    if (!instanceName || status === "connected") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/onboarding/qr-status?instanceName=${instanceName}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          if (data.qrcode) setQrCode(data.qrcode);
          
          if (data.status === "connected") {
            // Wait a bit to show success message
            setTimeout(() => {
              if (isExisting) {
                router.push(`/dashboard/${tenantSlug}/channels`);
              } else {
                router.push("/onboarding/choose-plan" + (tenantSlug ? `?slug=${tenantSlug}` : ""));
              }
            }, 2000);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    const interval = setInterval(poll, 3000);
    poll(); // initial check

    return () => clearInterval(interval);
  }, [instanceName, status, router]);

  return (
    <div className="min-h-screen bg-[#04050F] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-inter">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Logo size={36} withText={true} />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white font-poppins mb-2">
          {isExisting ? "Reconnect Your WhatsApp" : "Connect Your WhatsApp"}
        </h2>
        <p className="text-center text-sm text-gray-400 mb-8 max-w-sm">
          {isExisting 
            ? "Your connection has expired. Please scan the QR code to restore service." 
            : "Scan this QR code with your WhatsApp to verify your account before choosing a plan."}
        </p>
      </div>

      <div className="bg-[#0f111a] py-8 px-6 shadow-2xl sm:rounded-2xl border border-gray-800 text-center flex flex-col items-center max-w-sm w-full">
        <div className="mb-6">
          {status === "connected" ? (
            <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-green-900/50 text-green-400 border border-green-800/50">
              <span className="mr-2">✅</span> WhatsApp Connected!
            </div>
          ) : status === "failed" ? (
            <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-red-900/50 text-red-400 border border-red-800/50">
              Connection Failed
            </div>
          ) : (
            <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold bg-blue-900/50 text-blue-400 border border-blue-800/50 animate-pulse">
              {status === "qr_ready" ? "Scan the QR Code" : "Generating QR..."}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl flex items-center justify-center w-64 h-64 mb-8 relative overflow-hidden">
          {status === "connected" ? (
            <div className="flex flex-col items-center animate-bounce">
              <svg className="w-24 h-24 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : qrCode ? (
            <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#1E5FFF] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400">Loading Evolution API...</p>
            </div>
          )}
          
          {status === "connected" && (
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center"></div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="w-full space-y-4">
          <button
            onClick={() => {
              if (isExisting) {
                router.push(`/dashboard/${tenantSlug}/channels`);
              } else {
                router.push("/onboarding/choose-plan" + (tenantSlug ? `?slug=${tenantSlug}` : ""));
              }
            }}
            disabled={status !== "connected"}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-[#1E5FFF] hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
          >
            {status === "connected" 
              ? (isExisting ? "Return to Channels" : "Continue to Choose Plan") 
              : (isExisting ? "Reconnect to Continue" : "Connect to Continue")}
          </button>

          {!isExisting && (
            <button 
              onClick={() => router.push("/onboarding/choose-plan" + (tenantSlug ? `?slug=${tenantSlug}` : ""))}
              className="text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors"
            >
              I'll connect later &rarr;
            </button>
          )}
          
          {isExisting && (
            <button 
              onClick={() => router.push(`/dashboard/${tenantSlug}/channels`)}
              className="text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors"
            >
              &larr; Back to Channels
            </button>
          )}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-800 w-full text-left">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-3">How it works</p>
          <ol className="text-xs text-gray-400 space-y-2 list-decimal ml-4">
            <li>Open WhatsApp on your phone</li>
            <li>Tap Menu or Settings &rarr; Linked Devices</li>
            <li>Tap Link a Device</li>
            <li>Point your phone to this screen to capture the code</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#04050F] flex items-center justify-center text-white">Loading onboarding...</div>}>
      <ConnectWhatsAppContent />
    </Suspense>
  );
}