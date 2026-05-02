import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
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

    // 1. Provision Evolution API
    const slug = tenant.slug;
    const randomShortId = Math.random().toString(16).substring(2, 8);
    const instanceName = `vi_${slug.replace(/-/g, "")}_${randomShortId}`;
    const webhookBase = process.env.N8N_WEBHOOK_BASE;
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    let evoToken = null;

    if (evolutionUrl && apiKey && webhookBase) {
      try {
        const evoRes = await fetch(`${evolutionUrl}/instance/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey,
          },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
            webhook: {
              url: `${webhookBase}/${instanceName}`,
              events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
              webhook_by_events: false,
              webhook_base64: false,
            },
          }),
        });

        if (!evoRes.ok) {
          throw new Error(`Evolution API error: ${evoRes.statusText}`);
        }
        const evoData = await evoRes.json();
        evoToken = evoData.hash?.apikey || evoData.instance?.token || "";
      } catch (err) {
        console.error("Evolution provisioning failed during activation:", err);
        return NextResponse.json({ error: "Failed to provision Evolution API." }, { status: 500 });
      }
    } else {
      console.warn("Skipping Evolution API provisioning because env vars are missing.");
    }

    // 2. Insert WhatsApp Instance
    if (evoToken) {
      await supabaseAdmin.from("whatsapp_instances").insert({
        tenant_id: id,
        label: "Primary Number",
        evolution_instance_name: instanceName,
        evolution_instance_token: evoToken,
        is_primary: true,
        evolution_status: "pending",
      });
    }

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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin activation error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
