import { createClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) return NextResponse.json({ error: "No active tenants" }, { status: 403 });
  const tenantId = memberships[0].tenant_id;

  let query = supabase.from("knowledge_sources").select("*").eq("tenant_id", tenantId);
  if (type) {
    query = query.eq("type", type);
  }

  const { data: sources, error } = await query;
  if (error) return NextResponse.json({ error: "DB Error" }, { status: 500 });

  return NextResponse.json({ sources });
}

export async function POST(request) {
  const body = await request.json();
  const { type, label, content, url, meta } = body;
  
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) return NextResponse.json({ error: "No active tenants" }, { status: 403 });
  const tenantId = memberships[0].tenant_id;

  const hasAccess = await assertRole(tenantId, user.id, ["owner", "admin"]);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const insertData = {
    tenant_id: tenantId,
    type,
    label,
    status: "pending",
    created_by: user.id,
  };

  if (type === "flow" || type === "faq") {
    insertData.content = content;
  } else if (type === "website") {
    insertData.source_url = url;
    insertData.meta = meta || {};
  } else {
    return NextResponse.json({ error: "Invalid type for JSON payload" }, { status: 400 });
  }

  const { data: source, error } = await supabase
    .from("knowledge_sources")
    .insert(insertData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to add source" }, { status: 500 });
  return NextResponse.json({ ok: true, source });
}
