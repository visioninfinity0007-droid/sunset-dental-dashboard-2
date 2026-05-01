import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/data";
import { buildStats, parseFilters } from "@/lib/dashboard-utils";
import { getTenantBySlug, assertRole } from "@/lib/tenants";
import { createClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";

export async function GET(request, { params }) {
  const { slug } = params;
  const { searchParams } = new URL(request.url);
  const instanceId = searchParams.get("instance");

  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.json({ error: "Unknown client" }, { status: 404 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await assertRole(tenant.id, user.id, ["owner", "admin", "agent", "viewer"]);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await getDashboardData(tenant.id, instanceId);
  if (!data) return NextResponse.json({ error: "No data found" }, { status: 500 });

  const filters = parseFilters(searchParams);
  const stats   = buildStats(data, filters);

  return NextResponse.json(stats);
}
