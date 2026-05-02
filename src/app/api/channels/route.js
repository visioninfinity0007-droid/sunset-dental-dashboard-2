import { createClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { searchParams } = new URL(request.url);
  const primaryOnly = searchParams.get("primary");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's active tenant (for simplicity, we assume they have one active context, 
  // but to be safe we'll fetch the first active one or they can pass tenant_id.
  // Actually, since this is called on onboarding, let's just grab their first active tenant).
  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id, tenants(slug)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ error: "No active tenants" }, { status: 403 });
  }

  const tenantId = memberships[0].tenant_id;
  const tenantSlug = memberships[0].tenants.slug;

  let query = supabase.from("whatsapp_instances").select("*").eq("tenant_id", tenantId);
  if (primaryOnly) {
    query = query.eq("is_primary", true);
  }

  const { data: instances, error } = await query;

  if (error) {
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }

  if (primaryOnly) {
     return NextResponse.json({ instance: instances[0], tenantSlug });
  }

  return NextResponse.json({ instances, tenantSlug });
}

export async function POST(request) {
  if (cookies().get("vi_impersonating")) return NextResponse.json({ error: "Read-only mode active." }, { status: 403 });
  const body = await request.json();
  const { tenantId, label } = body;
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await assertRole(tenantId, user.id, ["owner", "admin"]);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Provision Evolution API Instance
  const { data: tenant } = await supabase.from("tenants").select("slug").eq("id", tenantId).single();
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
      console.error("Evolution provisioning failed:", err);
      return NextResponse.json({ error: "Failed to provision WhatsApp instance." }, { status: 500 });
    }
  }

  // Insert Whatsapp Instance
  const { data: newInstance, error: instanceError } = await supabase.from("whatsapp_instances").insert({
    tenant_id: tenantId,
    label: label || "WhatsApp Channel",
    evolution_instance_name: instanceName,
    evolution_instance_token: evoToken,
    is_primary: false,
    evolution_status: "pending",
  }).select().single();

  if (instanceError) {
    return NextResponse.json({ error: "Failed to save WhatsApp instance." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, instance: newInstance });
}
