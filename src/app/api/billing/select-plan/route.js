import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const PLANS = {
  starter: { name: "Starter", setup: 30000, monthly: 12000 },
  growth: { name: "Growth", setup: 45000, monthly: 20000 },
  enterprise: { name: "Enterprise", setup: 95000, monthly: 35000 },
};

export async function POST(request) {
  try {
    const cookieStore = cookies();
    const supabaseSession = createClient(cookieStore);
    const { data: { session } } = await supabaseSession.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, acceptedTerms, acceptedPrivacy, acceptedDPA } = body;

    if (!PLANS[plan] || !acceptedTerms || !acceptedPrivacy || !acceptedDPA) {
      return NextResponse.json({ ok: false, error: "Invalid request data." }, { status: 400 });
    }

    const supabaseAdmin = createServiceRoleClient();

    // Get user's active tenant
    const { data: membership, error: memberError } = await supabaseSession
      .from("tenant_members")
      .select("tenant_id, tenants(id, slug, business_name, plan_status)")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (memberError || !membership || !membership.tenants) {
      return NextResponse.json({ ok: false, error: "No active tenant found." }, { status: 403 });
    }

    const tenant = membership.tenants;

    if (tenant.plan_status === "active" || tenant.plan_status === "pending_payment") {
      return NextResponse.json({ ok: false, error: "Plan already selected." }, { status: 400 });
    }

    const selectedPlan = PLANS[plan];
    const subtotalPkr = selectedPlan.setup + selectedPlan.monthly;
    const gstPct = parseFloat(process.env.INVOICE_GST_PCT || "0");
    const gstPkr = gstPct > 0 ? Math.round(subtotalPkr * gstPct / 100) : 0;
    const totalPkr = subtotalPkr + gstPkr;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    // Generate Invoice Number
    const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const { count } = await supabaseAdmin
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .gte("issued_at", new Date().toISOString().split("T")[0] + "T00:00:00Z");
    
    const seq = String((count || 0) + 1).padStart(4, "0");
    const invoiceNumber = `INV-${todayStr}-${seq}`;

    // PDF Generation
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Draw Header
    page.drawText("INVOICE", { x: 50, y: height - 50, size: 24, font: boldFont, color: rgb(0.12, 0.37, 1) }); // #1E5FFF equivalent
    page.drawText(`Invoice Number: ${invoiceNumber}`, { x: 50, y: height - 80, size: 10, font });
    page.drawText(`Issue Date: ${new Date().toLocaleDateString()}`, { x: 50, y: height - 95, size: 10, font });
    page.drawText(`Due Date: ${dueDate.toLocaleDateString()}`, { x: 50, y: height - 110, size: 10, font });

    // Bill From
    const bizName = process.env.INVOICE_BUSINESS_NAME || "Vision Infinity";
    const bizAddress = process.env.INVOICE_BUSINESS_ADDRESS || "(not provided)";
    const bizNTN = process.env.INVOICE_BUSINESS_NTN || "(not provided)";
    const bizSTRN = process.env.INVOICE_BUSINESS_STRN || "(not provided)";
    const bizEmail = process.env.INVOICE_BUSINESS_EMAIL || "(not provided)";
    const bizWhatsApp = process.env.INVOICE_BUSINESS_WHATSAPP || "(not provided)";

    page.drawText("Bill From:", { x: 50, y: height - 150, size: 12, font: boldFont });
    page.drawText(bizName, { x: 50, y: height - 170, size: 10, font });
    page.drawText(`Address: ${bizAddress}`, { x: 50, y: height - 185, size: 10, font });
    page.drawText(`NTN: ${bizNTN}`, { x: 50, y: height - 200, size: 10, font });
    page.drawText(`STRN: ${bizSTRN}`, { x: 50, y: height - 215, size: 10, font });
    page.drawText(`Email: ${bizEmail}`, { x: 50, y: height - 230, size: 10, font });
    page.drawText(`WhatsApp: ${bizWhatsApp}`, { x: 50, y: height - 245, size: 10, font });

    // Bill To
    page.drawText("Bill To:", { x: 300, y: height - 150, size: 12, font: boldFont });
    page.drawText(`${tenant.business_name}`, { x: 300, y: height - 170, size: 10, font });
    page.drawText(`${session.user.user_metadata?.full_name || "Client"}`, { x: 300, y: height - 185, size: 10, font });
    page.drawText(`${session.user.email}`, { x: 300, y: height - 200, size: 10, font });

    // Table Header
    const tableY = height - 300;
    page.drawLine({ start: { x: 50, y: tableY }, end: { x: width - 50, y: tableY }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawText("Description", { x: 50, y: tableY - 15, size: 10, font: boldFont });
    page.drawText("Qty", { x: 350, y: tableY - 15, size: 10, font: boldFont });
    page.drawText("Rate (PKR)", { x: 400, y: tableY - 15, size: 10, font: boldFont });
    page.drawText("Amount (PKR)", { x: 480, y: tableY - 15, size: 10, font: boldFont });
    page.drawLine({ start: { x: 50, y: tableY - 25 }, end: { x: width - 50, y: tableY - 25 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Line Items
    page.drawText(`One-time Setup Fee — ${selectedPlan.name} Plan`, { x: 50, y: tableY - 45, size: 10, font });
    page.drawText("1", { x: 350, y: tableY - 45, size: 10, font });
    page.drawText(`${selectedPlan.setup.toLocaleString()}`, { x: 400, y: tableY - 45, size: 10, font });
    page.drawText(`${selectedPlan.setup.toLocaleString()}`, { x: 480, y: tableY - 45, size: 10, font });

    page.drawText(`Monthly Subscription — ${selectedPlan.name} Plan (Month 1)`, { x: 50, y: tableY - 65, size: 10, font });
    page.drawText("1", { x: 350, y: tableY - 65, size: 10, font });
    page.drawText(`${selectedPlan.monthly.toLocaleString()}`, { x: 400, y: tableY - 65, size: 10, font });
    page.drawText(`${selectedPlan.monthly.toLocaleString()}`, { x: 480, y: tableY - 65, size: 10, font });

    page.drawLine({ start: { x: 50, y: tableY - 85 }, end: { x: width - 50, y: tableY - 85 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Totals
    page.drawText("Subtotal:", { x: 400, y: tableY - 105, size: 10, font });
    page.drawText(`${subtotalPkr.toLocaleString()}`, { x: 480, y: tableY - 105, size: 10, font });
    
    let totalY = tableY - 120;
    if (gstPct > 0) {
      page.drawText(`GST (${gstPct}%):`, { x: 400, y: totalY, size: 10, font });
      page.drawText(`${gstPkr.toLocaleString()}`, { x: 480, y: totalY, size: 10, font });
      totalY -= 20;
    }
    
    page.drawText("Total Due:", { x: 400, y: totalY, size: 12, font: boldFont });
    page.drawText(`Rs. ${totalPkr.toLocaleString()}`, { x: 480, y: totalY, size: 12, font: boldFont });

    // Payment Box
    const bankName = process.env.INVOICE_BANK_NAME || "(not provided)";
    const bankTitle = process.env.INVOICE_BANK_ACCOUNT_TITLE || "(not provided)";
    const bankAccount = process.env.INVOICE_BANK_ACCOUNT_NUMBER || "(not provided)";
    const bankIban = process.env.INVOICE_BANK_IBAN || "";

    const payBoxY = tableY - 250;
    page.drawRectangle({ x: 50, y: payBoxY, width: 300, height: 90, color: rgb(0.95, 0.95, 0.95) });
    page.drawText("Payment Instructions:", { x: 60, y: payBoxY + 70, size: 10, font: boldFont });
    page.drawText("Pay via bank transfer to:", { x: 60, y: payBoxY + 55, size: 9, font });
    page.drawText(`Bank: ${bankName}`, { x: 60, y: payBoxY + 40, size: 9, font });
    page.drawText(`Account Title: ${bankTitle}`, { x: 60, y: payBoxY + 25, size: 9, font });
    page.drawText(`Account #: ${bankAccount}${bankIban ? ` / IBAN: ${bankIban}` : ""}`, { x: 60, y: payBoxY + 10, size: 9, font });
    
    page.drawText(`After payment, send a screenshot to WhatsApp ${bizWhatsApp}`, { x: 50, y: payBoxY - 20, size: 9, font: boldFont });
    page.drawText(`with your invoice number (${invoiceNumber}) to activate your account.`, { x: 50, y: payBoxY - 35, size: 9, font });

    // Footer
    page.drawText("Payment due within 7 days. 3-month minimum. Cancel with 30-day written notice.", { x: 50, y: 50, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText("By paying, you agree to Vision Infinity's Terms of Service and Privacy Policy.", { x: 50, y: 35, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText("Thank you for choosing Vision Infinity.", { x: width / 2 - 80, y: 20, size: 10, font: boldFont, color: rgb(0.12, 0.37, 1) });

    const pdfBytes = await pdfDoc.save();

    // Upload PDF
    const storagePath = `${tenant.id}/${invoiceNumber}.pdf`;
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from("invoices")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf" });
    
    if (uploadError) {
      console.error("PDF upload error:", uploadError);
      return NextResponse.json({ ok: false, error: "Failed to generate invoice document." }, { status: 500 });
    }

    // Get signed URL
    const { data: signedUrlData } = await supabaseAdmin
      .storage
      .from("invoices")
      .createSignedUrl(storagePath, 7 * 24 * 60 * 60); // 7 days

    // Update Tenant
    const { error: updateError } = await supabaseAdmin
      .from("tenants")
      .update({
        plan: plan,
        plan_status: "pending_payment",
        plan_selected_at: new Date().toISOString(),
      })
      .eq("id", tenant.id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: "Failed to update tenant status." }, { status: 500 });
    }

    // Create Invoice DB Record
    await supabaseAdmin.from("invoices").insert({
      tenant_id: tenant.id,
      invoice_number: invoiceNumber,
      plan: plan,
      setup_fee_pkr: selectedPlan.setup,
      monthly_fee_pkr: selectedPlan.monthly,
      total_pkr: totalPkr,
      due_date: dueDate.toISOString(),
      pdf_storage_path: storagePath
    });

    // Audit Log
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    
    await supabaseAdmin.from("audit_log").insert({
      actor_user_id: session.user.id,
      actor_email: session.user.email,
      action: "terms_accepted",
      target_type: "tenant",
      target_id: tenant.id,
      metadata: { plan, acceptedTerms, acceptedPrivacy, acceptedDPA },
      ip_address: ip,
      user_agent: userAgent
    });

    // Webhook to n8n
    const webhookUrl = process.env.N8N_WEBHOOK_BASE ? `${process.env.N8N_WEBHOOK_BASE}/tenant-plan-selected` : null;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenant.id,
          tenant_slug: tenant.slug,
          business_name: tenant.business_name,
          owner_email: session.user.email,
          owner_name: session.user.user_metadata?.full_name || "Client",
          plan: plan,
          invoice_number: invoiceNumber,
          invoice_pdf_url: signedUrlData?.signedUrl || "",
          total_pkr: totalPkr,
          due_date: dueDate.toISOString().split("T")[0],
          payment_bank: bankName,
          payment_title: bankTitle,
          payment_account: bankAccount,
          payment_iban: bankIban,
          support_whatsapp: bizWhatsApp,
        })
      }).catch(err => console.error("Webhook failed:", err));
    }

    return NextResponse.json({
      ok: true,
      redirectTo: `/dashboard/${tenant.slug}?welcome=1`,
    });

  } catch (error) {
    console.error("Plan selection error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
