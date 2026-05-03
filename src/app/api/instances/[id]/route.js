import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
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

  try {
    const { label, is_primary } = await request.json();
    const updates = {};
    
    if (label !== undefined) updates.label = label;
    
    if (is_primary === true) {
      const supabaseAdmin = createServiceRoleClient();
      await supabaseAdmin
        .from("whatsapp_instances")
        .update({ is_primary: false })
        .eq("tenant_id", instance.tenant_id);
      
      updates.is_primary = true;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("whatsapp_instances")
        .update(updates)
        .eq("id", id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Instance patch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
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
      await fetch(`${evolutionUrl}/instance/delete/${instance.evolution_instance_name}`, {
        method: "DELETE",
        headers: { apikey: apiKey },
      });
    } catch (err) {
      console.error("Evolution instance delete failed:", err);
    }
  }

  // Supabase takes care of cascade deletion of messages, leads, etc via foreign key
  const supabaseAdmin = createServiceRoleClient();
  const { error: deleteError } = await supabaseAdmin
    .from("whatsapp_instances")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Instance delete error:", deleteError);
    return NextResponse.json({ error: "Failed to delete from database" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
