import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabaseServer";

export async function GET(request, { params }) {
  const { slug } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('bot_config, bot_personality, bot_default_language')
      .eq('slug', slug)
      .single();

    if (tenantErr || !tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    return NextResponse.json({ 
      config: tenant.bot_config || {},
      personality: tenant.bot_personality,
      language: tenant.bot_default_language
    });
  } catch (err) {
    console.error("Bot Config GET error:", err);
    return NextResponse.json({ error: "Failed to fetch bot config" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { slug } = params;
  
  if (cookies().get("vi_impersonating")) {
    return NextResponse.json({ error: "Read-only mode active." }, { status: 403 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const body = await request.json();
    const { config, personality, language } = body;

    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (tenantErr || !tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const updates = {};
    if (config !== undefined) updates.bot_config = config;
    if (personality !== undefined) updates.bot_personality = personality;
    if (language !== undefined) {
      if (!['en', 'ur', 'roman_ur', 'all'].includes(language)) {
        return NextResponse.json({ error: "Invalid language selection" }, { status: 400 });
      }
      updates.bot_default_language = language;
    }

    const { error: updateErr } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', tenant.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Bot Config PATCH error:", err);
    return NextResponse.json({ error: "Failed to update bot config" }, { status: 500 });
  }
}
