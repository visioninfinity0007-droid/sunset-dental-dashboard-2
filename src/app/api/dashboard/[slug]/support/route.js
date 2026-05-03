import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";

export async function GET(request, { params }) {
  const { slug } = params;
  const supabase = createClient(cookies());
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();
      
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ tickets });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { slug } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Impersonation block
    const impersonated = cookieStore.get('impersonating_tenant_id');
    if (impersonated) return NextResponse.json({ error: "Cannot perform this action while impersonating" }, { status: 403 });

    const { subject, message, priority } = await request.json();
    if (!subject || !message || message.length < 20) {
      return NextResponse.json({ error: "Message must be at least 20 characters" }, { status: 400 });
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();
      
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const supabaseAdmin = createServiceRoleClient();
    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        tenant_id: tenant.id,
        submitted_by: user.id,
        subject,
        message,
        priority: priority || 'normal',
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ ticket });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
