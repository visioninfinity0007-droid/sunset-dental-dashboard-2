import { createClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { slug } = params;
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    // Enforce RLS by passing through - but actually, the client is already RLS-bound.
    // However, since bot_execution_log is admin-only via service role, we need to query it
    // securely using the service role for this specific tenant!
    // Wait, the spec said bot_usage has RLS, but bot_execution_log is admin-only.
    // So to show tenant-facing analytics, we must use service role but restricted to this tenantId.
    const { createServiceRoleClient } = await import("@/lib/supabaseServer");
    const supabaseAdmin = createServiceRoleClient();

    // Verify user is an active member
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .single();
      
    // Super admins can also view this if they are impersonating. 
    // We check impersonation or super_admin status.
    const { data: superAdmin } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!membership && !superAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Fetch usage data from bot_usage
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: usageData } = await supabaseAdmin
      .from("bot_usage")
      .select("*")
      .eq("tenant_id", tenant.id)
      .gte("date", thirtyDaysAgo.split('T')[0])
      .order("date", { ascending: true });

    // 2. Fetch recent execution logs to calculate average latency and fallbacks
    const { data: logsData } = await supabaseAdmin
      .from("bot_execution_log")
      .select("step, latency_ms, details, created_at")
      .eq("tenant_id", tenant.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false });

    // 3. Process logs
    let totalLatency = 0;
    let latencyCount = 0;
    let fallbackCount = 0;
    let totalMessages = 0;
    const fallbackMessages = [];

    if (logsData) {
      for (const log of logsData) {
        if (log.step === 'webhook_received') totalMessages++;
        if (log.step === 'fallback_triggered') {
          fallbackCount++;
          if (fallbackMessages.length < 10 && log.details?.reason) {
            fallbackMessages.push({
              reason: log.details.reason,
              time: log.created_at
            });
          }
        }
        if (log.latency_ms && log.step === 'response_sent') {
          totalLatency += log.latency_ms;
          latencyCount++;
        }
      }
    }

    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
    const fallbackRate = totalMessages > 0 ? ((fallbackCount / totalMessages) * 100).toFixed(1) : 0;

    return NextResponse.json({
      usage: usageData || [],
      stats: {
        totalMessages,
        avgLatency,
        fallbackRate,
        fallbackCount
      },
      topFallbacks: fallbackMessages
    });

  } catch (error) {
    console.error("Fetch bot activity error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
