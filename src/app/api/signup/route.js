import { createServiceRoleClient, createClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function generateSlug(businessName) {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function getUniqueSlug(supabase, baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const { data } = await supabase.from("tenants").select("id").eq("slug", slug).single();
    if (!data) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { businessName, fullName, email, password, phone, inviteToken } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const supabaseAdmin = createServiceRoleClient();
    const cookieStore = cookies();
    const supabaseSession = createClient(cookieStore);

    if (inviteToken) {
      // MODE B: Invite redemption
      const { data: invite, error: inviteError } = await supabaseAdmin
        .from("tenant_invitations")
        .select("*, tenants(slug)")
        .eq("token", inviteToken)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .single();

      if (inviteError || !invite) {
        return NextResponse.json({ ok: false, error: "Invalid or expired invite." }, { status: 400 });
      }

      if (invite.email.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json({ ok: false, error: "Email does not match the invitation." }, { status: 400 });
      }

      // Create Auth User or get existing
      let userId;
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError && authError.message.includes("already registered")) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existing = users.users.find(u => u.email === email);
        if (existing) userId = existing.id;
        else return NextResponse.json({ ok: false, error: "Could not resolve user." }, { status: 400 });
      } else if (authError) {
        return NextResponse.json({ ok: false, error: authError.message }, { status: 400 });
      } else {
        userId = authData.user.id;
      }

      // Add to tenant_members
      const { error: memberError } = await supabaseAdmin.from("tenant_members").insert({
        tenant_id: invite.tenant_id,
        user_id: userId,
        role: invite.role,
        status: "active",
      });

      if (memberError && memberError.code !== "23505") { // Ignore unique violation if already member
        return NextResponse.json({ ok: false, error: "Failed to join team." }, { status: 500 });
      }

      // Mark invite accepted
      await supabaseAdmin
        .from("tenant_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      // Sign user in via normal client so cookies are set
      await supabaseSession.auth.signInWithPassword({ email, password });

      return NextResponse.json({
        ok: true,
        slug: invite.tenants.slug,
        redirectTo: `/dashboard/${invite.tenants.slug}`,
      });
    } else {
      // MODE A: New tenant signup
      if (!businessName) {
        return NextResponse.json({ ok: false, error: "Business name required." }, { status: 400 });
      }

      // 1. Create Auth User or recover existing
      let userId;
      let isNewUser = true;
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError && authError.message.includes("already registered")) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existing = users.users.find(u => u.email === email);
        if (existing) {
          userId = existing.id;
          isNewUser = false;
        } else {
          return NextResponse.json({ ok: false, error: "Could not resolve user." }, { status: 400 });
        }
      } else if (authError) {
        return NextResponse.json({ ok: false, error: authError.message }, { status: 400 });
      } else {
        userId = authData.user.id;
      }

      // 2. Create Tenant
      const baseSlug = generateSlug(businessName);
      const slug = await getUniqueSlug(supabaseAdmin, baseSlug);

      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .insert({ slug, business_name: businessName })
        .select()
        .single();

      if (tenantError) {
        if (isNewUser) await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json({ ok: false, error: "Failed to create tenant." }, { status: 500 });
      }

      // 3. Insert Member (Owner)
      const { error: memberError } = await supabaseAdmin.from("tenant_members").insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: "owner",
        status: "active",
      });

      if (memberError) {
        await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
        if (isNewUser) await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json({ ok: false, error: "Failed to create owner membership." }, { status: 500 });
      }

      // 4. Provision Evolution API Instance
      const randomShortId = Math.random().toString(16).substring(2, 8);
      const instanceName = `vi_${slug.replace(/-/g, "")}_${randomShortId}`;
      const webhookBase = process.env.N8N_WEBHOOK_BASE;
      const evolutionUrl = process.env.EVOLUTION_API_URL;
      const apiKey = process.env.EVOLUTION_API_KEY; // Using request-level apikey for v2

      let evoToken = null;

      if (evolutionUrl && apiKey && webhookBase) {
        try {
          const evoRes = await fetch(`${evolutionUrl}/instance/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: apiKey,
            },
            body: JSON.stringify({
              instanceName,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS",
              webhook: {
                url: `${webhookBase}/${instanceName}`,
                events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
                webhook_by_events: false,
                webhook_base64: false,
              },
            }),
          });

          if (!evoRes.ok) {
            throw new Error(`Evolution API error: ${evoRes.statusText}`);
          }

          const evoData = await evoRes.json();
          evoToken = evoData.hash?.apikey || evoData.instance?.token || "";
        } catch (err) {
          console.error("Evolution provisioning failed:", err);
          // Rollback
          await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
          if (isNewUser) await supabaseAdmin.auth.admin.deleteUser(userId);
          return NextResponse.json({ ok: false, error: "Failed to provision WhatsApp instance." }, { status: 500 });
        }
      } else {
        console.warn("Evolution API env vars missing, skipping instance creation for demo/local purposes.");
      }

      // 5. Insert Whatsapp Instance
      const { error: instanceError } = await supabaseAdmin.from("whatsapp_instances").insert({
        tenant_id: tenant.id,
        label: "Main line",
        evolution_instance_name: instanceName,
        evolution_instance_token: evoToken,
        is_primary: true,
        evolution_status: "pending",
        whatsapp_phone: phone || null,
      });

      if (instanceError) {
        // Rollback DB and Evolution
        await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
        if (isNewUser) await supabaseAdmin.auth.admin.deleteUser(userId);
        if (evolutionUrl && apiKey) {
          await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
            method: "DELETE",
            headers: { apikey: apiKey },
          }).catch(console.error);
        }
        return NextResponse.json({ ok: false, error: "Failed to save WhatsApp instance." }, { status: 500 });
      }

      // 6. Sign In
      await supabaseSession.auth.signInWithPassword({ email, password });

      return NextResponse.json({
        ok: true,
        slug,
        redirectTo: "/onboarding/connect-whatsapp",
      });
    }
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
