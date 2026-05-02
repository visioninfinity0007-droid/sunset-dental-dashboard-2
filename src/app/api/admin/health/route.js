import { createServiceRoleClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  const healthData = {
    supabase: { status: "unknown", latencyMs: 0, details: null },
    evolution: { status: "unknown", latencyMs: 0, details: null },
    n8n: { status: "unknown", latencyMs: 0, details: null },
  };

  // 1. Supabase Health Check
  const startSupabase = Date.now();
  try {
    const supabaseAdmin = createServiceRoleClient();
    
    // Check connectivity and active connections
    const { count, error: connError } = await supabaseAdmin
      .from("tenants")
      .select("*", { count: "exact", head: true });

    // For DB size, we would ideally run a raw query `SELECT pg_database_size(current_database());`
    // but RPC is required if we want to run it via the API.
    // We will just provide a connectivity status.
    
    healthData.supabase.latencyMs = Date.now() - startSupabase;

    if (connError) {
      healthData.supabase.status = "error";
      healthData.supabase.details = connError.message;
    } else {
      healthData.supabase.status = "healthy";
      healthData.supabase.details = { connections_check: "ok", test_query_count: count };
    }
  } catch (error) {
    healthData.supabase.status = "error";
    healthData.supabase.latencyMs = Date.now() - startSupabase;
    healthData.supabase.details = error.message;
  }

  // 2. Evolution API Health Check
  const startEvo = Date.now();
  const evolutionUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (evolutionUrl && apiKey) {
    try {
      const res = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(5000)
      });
      healthData.evolution.latencyMs = Date.now() - startEvo;
      if (res.ok) {
        const instances = await res.json();
        healthData.evolution.status = "healthy";
        healthData.evolution.details = { active_instances: instances.length };
      } else {
        healthData.evolution.status = "error";
        healthData.evolution.details = `Status: ${res.status}`;
      }
    } catch (error) {
      healthData.evolution.status = "error";
      healthData.evolution.latencyMs = Date.now() - startEvo;
      healthData.evolution.details = error.message;
    }
  } else {
    healthData.evolution.status = "not_configured";
  }

  // 3. n8n Webhook Health Check
  const startN8n = Date.now();
  // Using N8N_WEBHOOK_URL or N8N_WEBHOOK_BASE. Assuming N8N_WEBHOOK_URL from instructions.
  const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_BASE;
  
  if (n8nUrl) {
    try {
      // Just a simple OPTIONS request to see if the server responds
      const res = await fetch(n8nUrl, {
        method: "OPTIONS",
        signal: AbortSignal.timeout(5000)
      });
      healthData.n8n.latencyMs = Date.now() - startN8n;
      healthData.n8n.status = "healthy"; // As long as it responds
      healthData.n8n.details = `Status: ${res.status}`;
    } catch (error) {
      healthData.n8n.status = "error";
      healthData.n8n.latencyMs = Date.now() - startN8n;
      healthData.n8n.details = error.message;
    }
  } else {
    healthData.n8n.status = "not_configured";
  }

  return NextResponse.json(healthData);
}
