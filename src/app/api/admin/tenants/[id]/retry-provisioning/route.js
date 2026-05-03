import { createClient } from "@/lib/supabaseServer";
import { provisionTenant } from "@/lib/provisioning";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { id } = params;
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

    const result = await provisionTenant(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin retry provisioning error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
