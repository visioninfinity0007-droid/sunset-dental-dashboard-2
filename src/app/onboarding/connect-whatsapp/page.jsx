"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";

function ConnectWhatsAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const instanceIdParam = searchParams.get("instance");

  const [instanceId, setInstanceId] = useState(instanceIdParam);
  const [qrCode, setQrCode] = useState(null);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const resolveInstance = async () => {
      if (instanceIdParam) {
        setInstanceId(instanceIdParam);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/channels?primary=true");
        if (res.ok) {
          const data = await res.json();
          if (data.instance) {
            setInstanceId(data.instance.id);
            if (data.instance.evolution_status === "connected") {
              router.push(`/dashboard/${data.tenantSlug}`);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Failed to resolve primary instance:", err);
      }
      setLoading(false);
    };

    resolveInstance();
  }, [instanceIdParam, router]);

  const handleRefreshQr = async () => {
    if (!instanceId) return;
    try {
      await fetch(`/api/instances/${instanceId}/refresh-qr`, { method: "POST" });
      setRefreshCount(prev => prev + 1);
      setQrCode(null);
      setStatus("pending");
    } catch (err) {
      console.error("Refresh QR error:", err);
    }
  };

  useEffect(() => {
    if (!instanceId) return;

    let pollInterval;
    let autoRefreshTimeout;

    const fetchStatusAndQr = async () => {
      try {
        const statusRes = await fetch(`/api/instances/${instanceId}/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setStatus(statusData.status);

          if (statusData.status === "connected") {
            clearInterval(pollInterval);
            clearTimeout(autoRefreshTimeout);
            setTimeout(() => {
              if (statusData.is_primary) {
                router.push("/onboarding/train-bot");
              } else {
                router.push(`/dashboard/${statusData.tenantSlug}/channels`);
              }
            }, 1500);
          } else if (statusData.status === "qr_ready" || statusData.status === "pending") {
            const qrRes = await fetch(`/api/instances/${instanceId}/qr`);
            if (qrRes.ok) {
              const qrData = await qrRes.json();
              if (qrData.qrcode) {
                setQrCode(qrData.qrcode);
              }
            }
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    fetchStatusAndQr();
    pollInterval = setInterval(fetchStatusAndQr, 3000);

    if (refreshCount < 5) {
      autoRefreshTimeout = setTimeout(handleRefreshQr, 60000);
    }

    return () => {
      clearInterval(pollInterval);
      clearTimeout(autoRefreshTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, refreshCount, router]);

  if (loading) {
    return <div className="min-h-screen bg-[#04050F] flex items-center justify-center text-white font-inter">Loading...</div>;
  }

  if (!instanceId) {
    return <div className="min-h-screen bg-[#04050F] flex items-center justify-center text-white font-inter">Instance not found.</div>;
  }

  return (
    <div className="min-h-screen bg-[#04050F] flex flex-col items-center justify-center py-12 sm:px-6 lg:px-8 font-inter">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Logo size={36} withText={true} />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white font-poppins mb-2">
          Connect your WhatsApp
        </h2>
        <p className="text-center text-sm text-gray-400 mb-8">
          Open WhatsApp on your phone &rarr; Settings &rarr; Linked Devices &rarr; Link a Device &rarr; scan this QR.
        </p>
      </div>

      <div className="bg-[#0f111a] py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-800 text-center flex flex-col items-center max-w-sm w-full">
        <div className="mb-4">
          {status === "connected" ? (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900 text-green-300">
              Connected! Redirecting...
            </div>
          ) : status === "failed" ? (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-900 text-red-300">
              Connection Failed
            </div>
          ) : (
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-900 text-yellow-300">
              {status === "qr_ready" ? "Ready to Scan" : "Generating QR..."}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl flex items-center justify-center w-64 h-64 mb-6 relative">
          {status === "connected" ? (
            <svg className="w-20 h-20 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : qrCode ? (
            <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
          ) : (
            <div className="w-10 h-10 border-4 border-[#1E5FFF] border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>

        {refreshCount >= 5 ? (
          <div className="text-sm text-gray-400 mb-4">
            QR code expired. Please click below to refresh, or contact support if you are having trouble.
          </div>
        ) : null}

        <button
          onClick={handleRefreshQr}
          disabled={status === "connected"}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1E5FFF] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E5FFF] disabled:opacity-50 mb-4"
        >
          Refresh QR
        </button>

        <a href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-300">
          Skip for now &rarr; go to dashboard
        </a>
      </div>
    </div>
  );
}

export default function ConnectWhatsAppPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#04050F] flex items-center justify-center text-white">Loading...</div>}>
      <ConnectWhatsAppContent />
    </Suspense>
  );
}