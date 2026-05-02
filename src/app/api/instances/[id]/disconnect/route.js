import { createClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  if (cookies().get("vi_impersonating")) return NextResponse.json({ error: "Read-only mode active." }, { status: 403 });
  const { id } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: instance, error } = await supabase
    .from("whatsapp_instances")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !instance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hasAccess = await assertRole(instance.tenant_id, user.id, ["owner", "admin"]);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (evolutionUrl && apiKey) {
    try {
      await fetch(`${evolutionUrl}/instance/logout/${instance.evolution_instance_name}`, {
        method: "DELETE",
        headers: { apikey: apiKey },
      });
      
      await supabase
        .from("whatsapp_instances")
        .update({ evolution_status: "disconnected" })
        .eq("id", id);
        
    } catch (err) {
      console.error("Evolution logout failed:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
