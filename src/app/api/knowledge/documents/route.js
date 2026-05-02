import { createClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request) {
  if (cookies().get("vi_impersonating")) return NextResponse.json({ error: "Read-only mode active." }, { status: 403 });
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

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "text/plain", "text/csv"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 25MB." }, { status: 400 });
    }

    // Insert DB record first to get ID
    const { data: source, error: insertError } = await supabase
      .from("knowledge_sources")
      .insert({
        tenant_id: tenantId,
        type: "document",
        label: file.name,
        original_filename: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        status: "pending",
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const ext = file.name.split('.').pop();
    const storagePath = `${tenantId}/${source.id}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("knowledge")
      .upload(storagePath, file);

    if (uploadError) {
      // Rollback
      await supabase.from("knowledge_sources").delete().eq("id", source.id);
      throw uploadError;
    }

    // Update with storage path
    await supabase.from("knowledge_sources").update({ storage_path: storagePath }).eq("id", source.id);

    return NextResponse.json({ ok: true, source });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
