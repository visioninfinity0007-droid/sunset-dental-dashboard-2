import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";

export async function GET(request, { params }) {
  const { slug } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const userResult = await supabase.auth.getUser();
    if (userResult.error) throw userResult.error;

    // Optional: Check tenant role if you have assertRole available
    // await assertRole(slug, ['owner', 'admin', 'agent']);
    
    // Get tenant
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (tenantErr || !tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    // Fetch leads ordered by last_contact
    const { data: leads, error: leadsErr } = await supabase
      .from('leads')
      .select('id, phone, name, status, intent, current_handler, last_contact, last_message_preview, unread_count, updated_at')
      .eq('tenant_id', tenant.id)
      .order('last_contact', { ascending: false, nullsFirst: false });

    if (leadsErr) throw leadsErr;

    return NextResponse.json({ leads });
  } catch (err) {
    console.error("Chat GET leads Error:", err);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
