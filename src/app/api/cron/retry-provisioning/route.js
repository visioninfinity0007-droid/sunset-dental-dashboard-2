import { createServiceRoleClient } from "@/lib/supabaseServer";
import { provisionTenant } from "@/lib/provisioning";
import { NextResponse } from "next/server";

export async function POST(request) {
  // Validate Cron Secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createServiceRoleClient();

  try {
    // 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: tenants, error } = await supabaseAdmin
      .from('tenants')
      .select('id, provisioning_attempts, provisioning_last_attempt_at')
      .eq('plan_status', 'active')
      .eq('provisioning_status', 'failed')
      .lt('provisioning_attempts', 3)
      .gt('provisioning_last_attempt_at', oneHourAgo);

    if (error) throw error;

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ message: "No tenants to retry" });
    }

    const results = [];
    for (const tenant of tenants) {
      const res = await provisionTenant(tenant.id);
      results.push({ id: tenant.id, success: res.ok, attempts: res.attempts });
    }

    return NextResponse.json({ message: "Retry batch completed", results });

  } catch (err) {
    console.error("Retry cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
