import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
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

    const supabaseAdmin = createServiceRoleClient();
    
    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (invoice.status !== "pending") {
      return NextResponse.json({ error: "Invoice is not pending" }, { status: 400 });
    }

    // Cancel invoice
    await supabaseAdmin
      .from("invoices")
      .update({ status: "cancelled" })
      .eq("id", id);

    // Write to audit log
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await supabaseAdmin.from("audit_log").insert({
      actor_user_id: session.user.id,
      actor_email: session.user.email,
      action: "admin_cancel_invoice",
      target_type: "invoice",
      target_id: id,
      metadata: { invoice_number: invoice.invoice_number },
      ip_address: ip
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin cancel invoice error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
