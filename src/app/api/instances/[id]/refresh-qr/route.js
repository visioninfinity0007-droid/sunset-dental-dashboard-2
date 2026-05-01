import { createClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
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
      // Connect call also refreshes the QR code in Evolution v2
      await fetch(`${evolutionUrl}/instance/connect/${instance.evolution_instance_name}`, {
        headers: { apikey: apiKey },
      });
      
      await supabase
        .from("whatsapp_instances")
        .update({ evolution_status: "pending", last_qr_refreshed_at: new Date().toISOString() })
        .eq("id", id);
        
    } catch (err) {
      console.error("Evolution QR refresh failed:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
