import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabaseServer";

export async function GET(request, { params }) {
  const { slug } = params;
  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId");
  const phone = url.searchParams.get("phone");
  const before = url.searchParams.get("before");

  if (!phone) {
    return NextResponse.json({ error: "Missing phone parameter" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const userResult = await supabase.auth.getUser();
    if (userResult.error) throw userResult.error;

    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (tenantErr || !tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    let query = supabase
      .from('messages')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('phone', phone)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (before) {
      // Decode the before timestamp and fetch messages strictly older
      query = query.lt('timestamp', before);
    }

    const { data: messages, error: messagesErr } = await query;

    if (messagesErr) throw messagesErr;

    // Messages are fetched descending (newest first).
    // Let's reverse them before sending so the client renders them top-down chronologically.
    return NextResponse.json({ messages: messages.reverse() });
  } catch (err) {
    console.error("Chat GET messages Error:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
