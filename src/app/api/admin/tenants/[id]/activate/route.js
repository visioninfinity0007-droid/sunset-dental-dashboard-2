import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { provisionTenant } from "@/lib/provisioning";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: superAdmin } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!superAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supabaseAdmin = createServiceRoleClient();
    
    // Check if tenant exists and is in pending_payment
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single();

    if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (tenant.plan_status !== "pending_payment" && tenant.plan_status !== "suspended" && tenant.plan_status !== "unconfigured") {
      return NextResponse.json({ error: "Tenant is already active" }, { status: 400 });
    }

    // 1 & 2. Provisioning is now handled asynchronously / best-effort after activation.
    // We will call it at the end of this function.

    // 3. Mark invoice as paid
    const { data: invoices } = await supabaseAdmin
      .from("invoices")
      .select("id")
      .eq("tenant_id", id)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1);

    if (invoices && invoices.length > 0) {
      await supabaseAdmin.from("invoices").update({ status: "paid" }).eq("id", invoices[0].id);
    }

    // 4. Update tenant status to active
    await supabaseAdmin
      .from("tenants")
      .update({ plan_status: "active" })
      .eq("id", id);

    // 5. Audit Log
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await supabaseAdmin.from("audit_log").insert({
      actor_user_id: session.user.id,
      actor_email: session.user.email,
      action: "admin_activate_tenant",
      target_type: "tenant",
      target_id: id,
      ip_address: ip
    });

    // 6. Call provisionTenant
    // The activate route NEVER throws on provisioning failure. Activation always succeeds.
    // Provisioning is best-effort with retry handled by cron.
    const provisionResult = await provisionTenant(id);

    return NextResponse.json({ ok: true, provisioning: provisionResult });
  } catch (error) {
    console.error("Admin activation error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
