import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabaseServer";

export async function GET(request, { params }) {
  const { id } = params;
  const cookieStore = cookies();
  const supabase = createServiceRoleClient(); // Using service role since we verify admin status

  try {
    // Standard auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    const { data: adminData } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!adminData) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Look up invoice
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .select('pdf_storage_path')
      .eq('id', id)
      .single();

    if (invoiceErr || !invoice || !invoice.pdf_storage_path) {
      return NextResponse.json({ error: "Invoice PDF not yet generated." }, { status: 404 });
    }

    // Generate signed URL
    const { data: signed, error: signErr } = await supabase
      .storage
      .from('invoices')
      .createSignedUrl(invoice.pdf_storage_path, 60 * 60); // 1 hour expiry

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl, 302);
  } catch (err) {
    console.error("Admin invoice download error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
