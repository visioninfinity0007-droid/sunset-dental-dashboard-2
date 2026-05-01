import { createClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { id } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: instance, error } = await supabase
    .from("whatsapp_instances")
    .select("*, tenants(slug)")
    .eq("id", id)
    .single();

  if (error || !instance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check access (any member can view status)
  const hasAccess = await assertRole(instance.tenant_id, user.id, ["owner", "admin", "agent", "viewer"]);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Fetch status from Evolution API
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (evolutionUrl && apiKey) {
    try {
      const stateRes = await fetch(`${evolutionUrl}/instance/connectionState/${instance.evolution_instance_name}`, {
        headers: { apikey: apiKey },
      });

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        const state = stateData.instance?.state || "close"; // open, connecting, close

        let newStatus = instance.evolution_status;
        if (state === "open") newStatus = "connected";
        else if (state === "connecting") newStatus = "qr_ready";
        else if (state === "close") newStatus = "pending";

        if (newStatus !== instance.evolution_status) {
          // Update DB if state changed
          const updateData = { evolution_status: newStatus };
          
          if (newStatus === "connected" && !instance.whatsapp_phone) {
            // Try to fetch the connected phone number
            const fetchRes = await fetch(`${evolutionUrl}/instance/fetchInstances?instanceName=${instance.evolution_instance_name}`, {
               headers: { apikey: apiKey }
            });
            if (fetchRes.ok) {
                const arr = await fetchRes.json();
                if (arr && arr.length > 0 && arr[0].owner) {
                    updateData.whatsapp_phone = arr[0].owner.replace("@s.whatsapp.net", "");
                }
            }
          }

          await supabase.from("whatsapp_instances").update(updateData).eq("id", id);
          instance.evolution_status = newStatus;
        }
      }
    } catch (err) {
      console.error("Evolution status check failed:", err);
    }
  }

  return NextResponse.json({
    status: instance.evolution_status,
    is_primary: instance.is_primary,
    tenantSlug: instance.tenants?.slug,
    phone: instance.whatsapp_phone,
  });
}
