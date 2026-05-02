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
