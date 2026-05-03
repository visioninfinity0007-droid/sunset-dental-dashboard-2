import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
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
    
    // Fetch tenant details
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single();

    if (tenantError || !tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Fetch tenant members
    const { data: members } = await supabaseAdmin
      .from("tenant_members")
      .select("*")
      .eq("tenant_id", id);

    // Fetch channels (whatsapp_instances)
    const { data: channels } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("*")
      .eq("tenant_id", id);

    // Fetch knowledge sources
    const { data: documents } = await supabaseAdmin
      .from("knowledge_sources")
      .select("*")
      .eq("tenant_id", id);

    // Fetch invoices
    const { data: invoices } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("tenant_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      tenant,
      members: members || [],
      channels: channels || [],
      documents: documents || [],
      invoices: invoices || []
    });
  } catch (error) {
    console.error("Admin fetch tenant error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  if (cookies().get("vi_impersonating")) return NextResponse.json({ error: "Read-only mode active." }, { status: 403 });
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
    const { business_name, plan, plan_status, suspension_grace_days } = await request.json();
    
    const updates = {};
    if (business_name !== undefined) updates.business_name = business_name;
    if (plan !== undefined) updates.plan = plan;
    if (plan_status !== undefined) updates.plan_status = plan_status;
    if (suspension_grace_days !== undefined) updates.suspension_grace_days = suspension_grace_days;

    const { error } = await supabaseAdmin
      .from("tenants")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    await supabaseAdmin.from("audit_log").insert({
      actor_user_id: session.user.id,
      actor_email: session.user.email,
      action: "admin_edit_tenant",
      target_type: "tenant",
      target_id: id,
      metadata: updates,
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Edit tenant error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (cookies().get("vi_impersonating")) return NextResponse.json({ error: "Read-only mode active." }, { status: 403 });
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

    await supabaseAdmin.from("whatsapp_instances").delete().eq("tenant_id", id);
    await supabaseAdmin.from("leads").delete().eq("tenant_id", id);
    await supabaseAdmin.from("messages").delete().eq("tenant_id", id);
    await supabaseAdmin.from("appointments").delete().eq("tenant_id", id);
    await supabaseAdmin.from("knowledge_sources").delete().eq("tenant_id", id);
    await supabaseAdmin.from("invoices").delete().eq("tenant_id", id);
    await supabaseAdmin.from("bot_usage").delete().eq("tenant_id", id);
    await supabaseAdmin.from("bot_execution_log").delete().eq("tenant_id", id);
    await supabaseAdmin.from("tenant_members").delete().eq("tenant_id", id);
    await supabaseAdmin.from("tenant_invitations").delete().eq("tenant_id", id);
    
    const { error: tenantDeleteError } = await supabaseAdmin.from("tenants").delete().eq("id", id);
    if (tenantDeleteError) throw tenantDeleteError;

    await supabaseAdmin.from("audit_log").insert({
      actor_user_id: session.user.id,
      actor_email: session.user.email,
      action: "admin_delete_tenant",
      target_type: "tenant",
      target_id: id,
      metadata: {},
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete tenant error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
