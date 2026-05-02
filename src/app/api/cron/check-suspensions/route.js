import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabaseServer";

export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  try {
    // We use plan_selected_at from migration 00004
    const { data: tenants, error: fetchErr } = await supabase
      .from('tenants')
      .select('id, slug, plan_status, plan_selected_at, suspension_grace_days')
      .eq('plan_status', 'pending_payment');

    if (fetchErr) throw fetchErr;

    const now = new Date();
    const toSuspend = [];

    for (const t of tenants) {
      if (!t.plan_selected_at) continue;
      
      const selectedAt = new Date(t.plan_selected_at);
      const graceMs = (t.suspension_grace_days || 7) * 24 * 60 * 60 * 1000;
      
      if (now.getTime() - selectedAt.getTime() > graceMs) {
        toSuspend.push(t);
      }
    }

    if (toSuspend.length === 0) {
      return NextResponse.json({ message: "No tenants to suspend", count: 0 });
    }

    const tenantIds = toSuspend.map(t => t.id);

    // Update status
    const { error: updateErr } = await supabase
      .from('tenants')
      .update({ plan_status: 'suspended' })
      .in('id', tenantIds);

    if (updateErr) throw updateErr;

    // Log to audit
    const auditLogs = toSuspend.map(t => ({
      actor_email: 'system',
      action: 'auto_suspend_overdue',
      target_type: 'tenant',
      target_id: t.id,
      metadata: { reason: "Grace period expired", grace_days: t.suspension_grace_days }
    }));

    await supabase.from('audit_log').insert(auditLogs);

    return NextResponse.json({ 
      message: `Suspended ${toSuspend.length} tenants`, 
      count: toSuspend.length,
      suspended_slugs: toSuspend.map(t => t.slug)
    });

  } catch (err) {
    console.error("Cron check-suspensions error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
