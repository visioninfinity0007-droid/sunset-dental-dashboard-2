"use client";

export default function AnalyticsPage() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Google Analytics 4 Overview</p>
        </div>
        <div className="header-actions">
          <a 
            href="https://analytics.google.com/analytics/web/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-[#1E5FFF] hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            Open GA4 Dashboard ↗
          </a>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-6">
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold mb-1">Tracking Status</h3>
            <p className="text-gray-400 text-sm">
              Current Measurement ID: <span className="font-mono text-gray-300 ml-1">{measurementId || "Not configured"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {measurementId ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              )}
            </span>
            <span className="text-sm font-medium text-gray-300">{measurementId ? "Active" : "Inactive"}</span>
          </div>
        </div>

        <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden min-h-[600px] relative">
          {/* Note: Google Analytics blocks direct iframing. We recommend replacing this URL with a Looker Studio embedded report URL. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10 bg-[#0f111a]">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Embed Configuration Required</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Standard Google Analytics cannot be directly embedded due to security restrictions. 
              To view charts here, please create a report in <a href="https://lookerstudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Looker Studio</a>, connect it to your GA4 property, enable embedding, and update the iframe source in this component.
            </p>
            <a 
              href="https://analytics.google.com/analytics/web/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              Go to Google Analytics
            </a>
          </div>
          <iframe 
            src="" 
            className="w-full h-full border-none opacity-0"
            title="Analytics Report"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      </div>
    </div>
  );
}
