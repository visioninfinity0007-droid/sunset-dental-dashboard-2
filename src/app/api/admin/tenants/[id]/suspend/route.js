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
    
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("*")
      .eq("id", id)
      .single();

    if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Update tenant status to suspended
    await supabaseAdmin
      .from("tenants")
      .update({ plan_status: "suspended" })
      .eq("id", id);

    // Audit Log
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await supabaseAdmin.from("audit_log").insert({
      actor_user_id: session.user.id,
      actor_email: session.user.email,
      action: "admin_suspend_tenant",
      target_type: "tenant",
      target_id: id,
      ip_address: ip
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin suspend tenant error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
