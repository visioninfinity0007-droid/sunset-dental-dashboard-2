import { createClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";

export default async function AdminOverview() {
  const supabase = createClient(cookies());
  
  // Basic metrics
  const { count: tenantsCount } = await supabase.from("tenants").select("*", { count: "exact", head: true });
  const { count: activeTenants } = await supabase.from("tenants").select("*", { count: "exact", head: true }).eq("plan_status", "active");
  const { count: pendingTenants } = await supabase.from("tenants").select("*", { count: "exact", head: true }).eq("plan_status", "pending_payment");
  const { count: unconfiguredTenants } = await supabase.from("tenants").select("*", { count: "exact", head: true }).eq("plan_status", "unconfigured");

  // Sum monthly revenue for active
  const { data: activePlans } = await supabase.from("tenants").select("plan").eq("plan_status", "active");
  
  const PLANS = {
    starter: 12000,
    growth: 20000,
    enterprise: 35000,
  };

  const mrr = activePlans?.reduce((acc, t) => acc + (PLANS[t.plan] || 0), 0) || 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">Overview</h1>
          <p className="page-subtitle">High-level metrics for Vision Infinity.</p>
        </div>
      </div>
      
      <div className="px-8 pb-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Total MRR</h3>
            <div className="text-3xl font-bold text-white">Rs. {mrr.toLocaleString()}</div>
          </div>
          
          <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Active Tenants</h3>
            <div className="text-3xl font-bold text-white">{activeTenants || 0}</div>
          </div>
          
          <div className="bg-[#0f111a] border border-[#1E5FFF] rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
            </div>
            <h3 className="text-sm font-medium text-blue-200 mb-1">Pending Payment</h3>
            <div className="text-3xl font-bold text-white">{pendingTenants || 0}</div>
            <a href="/admin/tenants" className="text-xs text-blue-400 hover:underline mt-2 inline-block">Review & Activate &rarr;</a>
          </div>

          <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-1">Unconfigured (New)</h3>
            <div className="text-3xl font-bold text-white">{unconfiguredTenants || 0}</div>
          </div>
        </div>
        
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <a href="/admin/tenants" className="bg-[#1E5FFF] text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors">
              Manage Tenants
            </a>
            <a href="/admin/invoices" className="bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors">
              View Invoices
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
