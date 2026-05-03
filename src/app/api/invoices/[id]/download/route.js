import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";

export async function GET(request, { params }) {
  const { id } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the invoice to find its tenant_id
    const { data: invoice, error: invoiceErr } = await supabase
      .from('invoices')
      .select('tenant_id, pdf_storage_path')
      .eq('id', id)
      .single();

    // Since RLS is enabled on invoices, this query will fail if user is not an active member
    if (invoiceErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found or unauthorized." }, { status: 404 });
    }
    
    if (!invoice.pdf_storage_path) {
      return NextResponse.json({ error: "Invoice PDF not yet generated." }, { status: 404 });
    }

    // Use service role to generate signed URL because the normal user might not have
    // explicit storage policy matching exactly, though the policy exists. Service role is safe here
    // since we already verified RLS allowed them to read the invoice row.
    const supabaseAdmin = createServiceRoleClient();
    const { data: signed, error: signErr } = await supabaseAdmin
      .storage
      .from('invoices')
      .createSignedUrl(invoice.pdf_storage_path, 60 * 60); // 1 hour expiry

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
    }

    return NextResponse.redirect(signed.signedUrl, 302);
  } catch (err) {
    console.error("Invoice download error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
