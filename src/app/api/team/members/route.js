import { createClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get active tenant
  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ error: "No active tenants" }, { status: 403 });
  }

  const tenantId = memberships[0].tenant_id;
  
  // A standard user can view the team if they are part of it. The RLS allows select.
  // We need user email, which requires admin privileges because auth.users is protected.
  // Instead, for this version, we will fetch users via the service_role client.
  
  const { createServiceRoleClient } = require("@/lib/supabaseServer");
  const supabaseAdmin = createServiceRoleClient();
  
  const { data: members, error } = await supabaseAdmin
    .from("tenant_members")
    .select("*, auth:user_id(email, raw_user_meta_data)")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }
  
  const formatted = members.map(m => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    email: m.auth?.email || "Unknown",
    name: m.auth?.raw_user_meta_data?.full_name || "Unknown"
  }));

  return NextResponse.json({ members: formatted });
}
