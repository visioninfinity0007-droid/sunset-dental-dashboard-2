import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";

export async function POST(request, { params }) {
  const { id } = params;

  if (cookies().get("vi_impersonating")) {
    return NextResponse.json({ error: "Read-only mode active." }, { status: 403 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: sa } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sa) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabaseAdmin = createServiceRoleClient();

    const body = await request.json();
    const grace = Number(body.grace_days);
    if (!Number.isInteger(grace) || grace < 0 || grace > 90) {
      return NextResponse.json({ error: "grace_days must be an integer between 0 and 90" }, { status: 400 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('tenants')
      .update({ suspension_grace_days: grace })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ error: "Update failed", details: updateErr.message }, { status: 500 });
    }

    await supabaseAdmin.from('audit_log').insert({
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'configure_grace_period',
      target_type: 'tenant',
      target_id: id,
      metadata: { suspension_grace_days: grace },
    });

    return NextResponse.json({ ok: true, suspension_grace_days: grace });
  } catch (err) {
    console.error("Configure grace error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}