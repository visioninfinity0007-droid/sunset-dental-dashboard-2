import { createServiceRoleClient } from "./supabaseServer";

export async function provisionTenant(tenantId) {
  const supabaseAdmin = createServiceRoleClient();

  try {
    // 1. Fetch tenant
    const { data: tenant, error: fetchErr } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (fetchErr || !tenant) {
      throw new Error(`Tenant fetch failed: ${fetchErr?.message || 'Not found'}`);
    }

    if (tenant.plan_status !== 'active') {
      throw new Error(`Tenant plan status is not active (status: ${tenant.plan_status})`);
    }

    const attempts = (tenant.provisioning_attempts || 0) + 1;

    // 2. Mark in progress
    await supabaseAdmin
      .from('tenants')
      .update({
        provisioning_status: 'in_progress',
        provisioning_attempts: attempts,
        provisioning_last_attempt_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    // 3. Setup Evolution API
    const slug = tenant.slug;
    const randomShortId = Math.random().toString(16).substring(2, 8);
    const instanceName = `vi_${slug.replace(/-/g, "")}_${randomShortId}`;
    
    // N8N Shared Webhook URL
    const n8nBaseUrl = process.env.N8N_WEBHOOK_BASE;
    if (!n8nBaseUrl) throw new Error("Missing N8N_WEBHOOK_BASE environment variable");
    const sharedWebhookUrl = `${n8nBaseUrl.replace(/\/$/, '')}/webhook/vi-shared-bot`;

    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!evolutionUrl || !apiKey) {
      throw new Error("Missing Evolution API configuration (EVOLUTION_API_URL or EVOLUTION_API_KEY)");
    }

    let evoToken = null;
    
    // Create Evolution Instance
    const evoCreateRes = await fetch(`${evolutionUrl}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      }),
    });

    if (!evoCreateRes.ok) {
      const errData = await evoCreateRes.text();
      throw new Error(`Evolution create failed (${evoCreateRes.status}): ${errData}`);
    }
    const evoCreateData = await evoCreateRes.json();
    evoToken = evoCreateData.hash?.apikey || evoCreateData.instance?.token || "";

    // Insert WhatsApp instance to database before setting webhook
    // so that when webhook hits n8n, it can immediately resolve the tenant.
    const { error: insertInstanceErr } = await supabaseAdmin.from("whatsapp_instances").insert({
      tenant_id: tenantId,
      label: "Primary Number",
      evolution_instance_name: instanceName,
      evolution_instance_token: evoToken,
      is_primary: true,
      evolution_status: "pending",
    });

    if (insertInstanceErr) {
      throw new Error(`Failed to insert whatsapp_instance: ${insertInstanceErr.message}`);
    }

    // 4. Configure Webhook on Evolution Instance
    const evoWebhookRes = await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        url: sharedWebhookUrl,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        webhook_by_events: false,
        webhook_base64: false
      }),
    });

    if (!evoWebhookRes.ok) {
      const errData = await evoWebhookRes.text();
      throw new Error(`Evolution webhook set failed (${evoWebhookRes.status}): ${errData}`);
    }

    // 5. Stamp success
    await supabaseAdmin
      .from('tenants')
      .update({
        provisioning_status: 'completed',
        provisioning_last_error: null,
        shared_flow_registered_at: new Date().toISOString()
      })
      .eq('id', tenantId);

    // 6. Audit Log
    await supabaseAdmin.from('audit_log').insert({
      actor_user_id: 'system',
      actor_email: 'system@visioninfinity.co',
      action: 'tenant_provisioned',
      target_type: 'tenant',
      target_id: tenantId,
      metadata: { instanceName }
    });

    return { ok: true, attempts };

  } catch (err) {
    console.error(`Provisioning failed for tenant ${tenantId}:`, err);
    
    // Fallback error logging
    await supabaseAdmin
      .from('tenants')
      .update({
        provisioning_status: 'failed',
        provisioning_last_error: err.message
      })
      .eq('id', tenantId);

    await supabaseAdmin.from('audit_log').insert({
      actor_user_id: 'system',
      actor_email: 'system@visioninfinity.co',
      action: 'tenant_provisioning_failed',
      target_type: 'tenant',
      target_id: tenantId,
      metadata: { error: err.message }
    });

    // Alert Admin via N8N
    try {
      const alertWebhookUrl = `${process.env.N8N_WEBHOOK_BASE.replace(/\/$/, '')}/webhook/admin-alert`;
      
      const { data: tenantInfo } = await supabaseAdmin.from('tenants').select('business_name').eq('id', tenantId).single();
      
      await fetch(alertWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "provisioning_failed",
          tenant_id: tenantId,
          business_name: tenantInfo?.business_name || 'Unknown',
          error_message: err.message,
          timestamp: new Date().toISOString()
        })
      });
    } catch (alertErr) {
      console.error("Failed to trigger admin-alert webhook:", alertErr);
    }

    // Return the attempts so the caller knows if it was the first attempt or not (for cron limits)
    return { ok: false, error: err.message };
  }
}
