import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: superAdmin } = await supabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!superAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supabaseAdmin = createServiceRoleClient();
    
    // 1. WhatsApp Instances
    const { data: instances } = await supabaseAdmin.from("whatsapp_instances").select("evolution_status");
    const activeInstances = instances?.filter(i => i.evolution_status === 'open' || i.evolution_status === 'connected').length || 0;
    const totalInstances = instances?.length || 0;

    // 2. Messages
    const { count: totalMessages } = await supabaseAdmin.from("messages").select("*", { count: "exact", head: true });
    
    // Calculate 30 day growth
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { count: messagesThisMonth } = await supabaseAdmin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gt("created_at", thirtyDaysAgo.toISOString());

    const { count: messagesLastMonth } = await supabaseAdmin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .gt("created_at", sixtyDaysAgo.toISOString())
      .lte("created_at", thirtyDaysAgo.toISOString());

    const messageGrowth = (messagesThisMonth || 0) - (messagesLastMonth || 0);

    // 3. Knowledge Sources (sum of file size)
    const { data: knowledge } = await supabaseAdmin.from("knowledge_sources").select("file_size_bytes").eq("type", "document");
    const totalBytes = knowledge?.reduce((acc, curr) => acc + (curr.file_size_bytes || 0), 0) || 0;
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

    return NextResponse.json({ 
      activeInstances,
      totalInstances,
      totalMessages: totalMessages || 0,
      messagesThisMonth: messagesThisMonth || 0,
      messageGrowth,
      knowledgeSizeMB: totalMB
    });
  } catch (error) {
    console.error("Admin health error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
