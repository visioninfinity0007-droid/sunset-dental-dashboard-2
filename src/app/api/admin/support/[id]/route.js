import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
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

    // Impersonation block
    const impersonated = cookieStore.get('impersonating_tenant_id');
    if (impersonated) return NextResponse.json({ error: "Cannot perform this action while impersonating" }, { status: 403 });

    const { status, admin_reply } = await request.json();

    const supabaseAdmin = createServiceRoleClient();
    const updateData = {};
    if (status) updateData.status = status;
    if (admin_reply !== undefined) {
      updateData.admin_reply = admin_reply;
      updateData.replied_at = new Date().toISOString();
    }
    updateData.updated_at = new Date().toISOString();

    const { data: ticket, error } = await supabaseAdmin
      .from("support_tickets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
