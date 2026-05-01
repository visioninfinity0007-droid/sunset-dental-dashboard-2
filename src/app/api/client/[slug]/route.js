import { NextResponse } from "next/server";
import { getTenantBySlug, assertRole } from "@/lib/tenants";
import { createClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";

export async function GET(request, { params }) {
  const tenant = await getTenantBySlug(params.slug);
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await assertRole(tenant.id, user.id, ["owner", "admin", "agent", "viewer"]);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: instances } = await supabase
    .from("whatsapp_instances")
    .select("id, label, evolution_status, whatsapp_phone, is_primary")
    .eq("tenant_id", tenant.id);

  const { data: membership } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    slug: tenant.slug,
    name: tenant.business_name,
    plan: tenant.plan,
    instances: instances || [],
    membership: { role: membership?.role || "viewer" },
  });
}