import { createClient } from "@/lib/supabaseServer";
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

    const { searchParams } = new URL(request.url);
    const step = searchParams.get('step');
    const status = searchParams.get('status');

    let query = supabase
      .from("bot_execution_log")
      .select(`
        id,
        created_at,
        tenant_id,
        phone,
        step,
        status,
        latency_ms,
        details,
        tenants ( slug )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (step && step !== 'all') {
      query = query.eq('step', step);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: logs, error } = await query;

    if (error) throw error;

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Admin fetch bot logs error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
