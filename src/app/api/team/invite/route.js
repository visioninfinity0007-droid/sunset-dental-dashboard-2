import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { assertRole } from "@/lib/tenants";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function GET(request) {
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
  
  const { data: invites, error } = await supabase
    .from("tenant_invitations")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("accepted_at", null)
    .is("revoked_at", null);

  if (error) return NextResponse.json({ error: "DB Error" }, { status: 500 });
  return NextResponse.json({ invites });
}

export async function POST(request) {
  const body = await request.json();
  const { email, role } = body;
  
  if (!email || !role) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const supabaseAdmin = createServiceRoleClient();

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

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: invite, error } = await supabaseAdmin.from("tenant_invitations").insert({
    tenant_id: tenantId,
    email: email.toLowerCase(),
    role,
    token,
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  }).select().single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: "Pending invite already exists for this email" }, { status: 400 });
    return NextResponse.json({ error: "DB Error" }, { status: 500 });
  }

  // Generate invite link and send via Supabase Auth admin email (as requested)
  // This sends the standard invite email template which should be configured to redirect to /accept-invite
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.visioninfinity.co"}/accept-invite?token=${token}`;
  
  // Actually the prompt says: "just generate the link and send via Supabase Auth's built-in email by inviting through supabase.auth.admin.inviteUserByEmail with a redirect to your accept-invite page"
  // Let's use inviteUserByEmail. We pass the token in the RedirectTo URL so Supabase appends it? No, Supabase appends its own hash.
  // The simplest is just inviting the user using Supabase, then let them click the link which goes to /accept-invite?token=T
  // Actually, wait: `inviteUserByEmail` doesn't know about our custom token unless we append it to redirectTo.
  
  const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email.toLowerCase(), {
    redirectTo: inviteLink
  });

  if (emailError) {
     console.error("Failed to send invite email", emailError);
  }

  return NextResponse.json({ ok: true, invite });
}
