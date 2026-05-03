import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
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
    const { data: tickets, error } = await supabaseAdmin
      .from("support_tickets")
      .select(`
        *,
        tenants (
          business_name,
          plan
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tickets });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
