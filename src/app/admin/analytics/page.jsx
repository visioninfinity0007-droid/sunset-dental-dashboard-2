export default function AnalyticsPage() {
  const propertyId = process.env.NEXT_PUBLIC_GA_PROPERTY_ID;

  if (propertyId) {
    const ga4Url = `https://analytics.google.com/analytics/web/#/p${propertyId}/reports/dashboard`;
    return (
      <div className="flex-1 overflow-y-auto flex items-center justify-center bg-[#0a0c10]">
        <div className="text-center">
          <div className="text-6xl mb-6">📈</div>
          <h1 className="text-2xl font-bold text-white mb-4">Google Analytics 4</h1>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Click below to open your Vision Infinity property dashboard directly in GA4.
          </p>
          <a
            href={ga4Url}
            target="_blank"
            rel="noreferrer"
            className="bg-[#1E5FFF] hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-bold transition-colors inline-block"
          >
            Open GA4 Dashboard ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Analytics</h1>
        </div>
      </div>

      <div className="bg-yellow-900/40 border border-yellow-700 rounded-xl p-6 mb-8 max-w-2xl">
        <h2 className="text-yellow-400 font-bold mb-2 flex items-center gap-2">
          <span>⚠️</span> Configuration Missing
        </h2>
        <p className="text-yellow-200/80 text-sm mb-4">
          Set <code>NEXT_PUBLIC_GA_PROPERTY_ID</code> to deep-link to your Vision Infinity property.
          This is the numeric GA4 property ID (different from the G-XXX measurement ID). 
          Find it in GA4 Admin → Property Settings → Property ID.
        </p>
        <a
          href="https://analytics.google.com/"
          target="_blank"
          rel="noreferrer"
          className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded font-medium transition-colors inline-block text-sm"
        >
          Open GA4 Home ↗
        </a>
      </div>
    </div>
  );
}
