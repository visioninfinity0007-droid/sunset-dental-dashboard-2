import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabaseServer";

export async function POST(request, { params }) {
  const { id } = params;
  
  if (cookies().get("vi_impersonating")) {
    return NextResponse.json({ error: "Read-only mode active." }, { status: 403 });
  }

  const cookieStore = cookies();
  const supabase = createServiceRoleClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Check super admin
    const { data: sa, error: saErr } = await supabase
      .from('super_admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (saErr || !sa) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const graceDays = parseInt(body.grace_days, 10);

    if (isNaN(graceDays) || graceDays < 0) {
      return NextResponse.json({ error: "Invalid grace days" }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from('tenants')
      .update({ suspension_grace_days: graceDays })
      .eq('id', id);

    if (updateErr) throw updateErr;

    // Log action
    await supabase.from('audit_log').insert({
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'configure_grace_period',
      target_type: 'tenant',
      target_id: id,
      metadata: { grace_days: graceDays }
    });

    return NextResponse.json({ success: true, grace_days: graceDays });
  } catch (err) {
    console.error("Configure Grace error:", err);
    return NextResponse.json({ error: "Failed to configure grace period" }, { status: 500 });
  }
}
