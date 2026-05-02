import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabaseServer";

export async function POST(request, { params }) {
  const { slug } = params;
  
  if (cookies().get("vi_impersonating")) {
    return NextResponse.json({ error: "Read-only mode active." }, { status: 403 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const userResult = await supabase.auth.getUser();
    if (userResult.error) throw userResult.error;

    const body = await request.json();
    const { phone, message, instanceId } = body;

    if (!phone || !message || !instanceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (tenantErr || !tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    // Fetch instance name
    const { data: instance, error: instanceErr } = await supabase
      .from('whatsapp_instances')
      .select('evolution_instance_name')
      .eq('id', instanceId)
      .eq('tenant_id', tenant.id)
      .single();

    if (instanceErr || !instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    // Call Evolution API
    const evoApiUrl = process.env.EVOLUTION_API_URL;
    const evoApiKey = process.env.EVOLUTION_API_KEY;

    if (!evoApiUrl || !evoApiKey) {
      return NextResponse.json({ error: "Evolution API not configured" }, { status: 500 });
    }

    const evoRes = await fetch(`${evoApiUrl}/message/sendText/${instance.evolution_instance_name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evoApiKey
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    });

    if (!evoRes.ok) {
      const evoErr = await evoRes.text();
      console.error("Evolution API Error:", evoErr);
      return NextResponse.json({ error: "Failed to send message via WhatsApp" }, { status: 502 });
    }

    // Insert message into DB
    const { data: msgData, error: msgErr } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenant.id,
        instance_id: instanceId,
        phone: phone,
        body: message,
        sender: 'human',
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (msgErr) throw msgErr;
    
    // Update lead's last_contact and unread_count (since we responded, maybe clear unread_count? Or update last message preview)
    // The webhook might handle this, but for immediate UI updates, it's good to do it here.
    await supabase.from('leads').update({
      last_contact: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('tenant_id', tenant.id).eq('phone', phone);

    return NextResponse.json({ message: msgData });
  } catch (err) {
    console.error("Chat POST send Error:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
