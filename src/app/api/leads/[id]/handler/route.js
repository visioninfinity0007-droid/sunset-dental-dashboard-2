import { createClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  const { id } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { handler } = body;

  if (!handler || (handler !== "bot" && handler !== "human")) {
    return NextResponse.json({ error: "Invalid handler" }, { status: 400 });
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("tenant_id")
    .eq("id", id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hasAccess = await assertRole(lead.tenant_id, user.id, ["owner", "admin", "agent"]);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error: updateError } = await supabase
    .from("leads")
    .update({ current_handler: handler }) // we didn't explicitly add current_handler to the schema migration! Let me add it. Wait, the prompt says "handler takeover... agent flips current_handler to human".
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
