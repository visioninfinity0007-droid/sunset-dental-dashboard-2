import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";

export async function GET(request, { params }) {
  const { id } = params;
  const cookieStore = cookies();

  // Use the regular cookie-bound client to check user identity
  const supabase = createClient(cookieStore);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    const { data: adminData } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminData) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Service role only for the privileged storage operation
    const adminSupabase = createServiceRoleClient();

    const { data: invoice, error: invoiceErr } = await adminSupabase
      .from('invoices')
      .select('pdf_storage_path')
      .eq('id', id)
      .maybeSingle();

    if (invoiceErr || !invoice || !invoice.pdf_storage_path) {
      return NextResponse.json({ error: "Invoice PDF not yet generated." }, { status: 404 });
    }

    const { data: signed, error: signErr } = await adminSupabase
      .storage
      .from('invoices')
      .createSignedUrl(invoice.pdf_storage_path, 60 * 60);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl, 302);
  } catch (err) {
    console.error("Admin invoice download error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}