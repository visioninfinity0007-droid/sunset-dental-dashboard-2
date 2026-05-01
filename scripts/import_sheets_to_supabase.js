const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Sheet import logic ported from src/lib/data.js
const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const PRIVATE_KEY   = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

async function getAccessToken() {
  if (!SERVICE_EMAIL || !PRIVATE_KEY) return null;
  const crypto = require('crypto');
  const header  = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now     = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss:   SERVICE_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  })).toString("base64url");

  const signingInput = `${header}.${payload}`;
  const keyData      = PRIVATE_KEY.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign({
    key: `-----BEGIN PRIVATE KEY-----\n${keyData.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----\n`,
    format: 'pem',
    type: 'pkcs8'
  });

  const jwt = `${signingInput}.${signature.toString("base64url")}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });

  if (!tokenRes.ok) return null;
  const tokenData = await tokenRes.json();
  return tokenData.access_token || null;
}

async function fetchSheet(token, sheetId, sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const data = await res.json();
  const rows = data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return obj;
  });
}

function parseDate(d) {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function run() {
  const args = process.argv.slice(2);
  let slug, instanceId, sheetId;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--slug") slug = args[i + 1];
    if (args[i] === "--instance-id") instanceId = args[i + 1];
    if (args[i] === "--sheet-id") sheetId = args[i + 1];
  }

  sheetId = sheetId || process.env.CLIENT_SUNSET_DENTAL_SHEET_ID || process.env.GOOGLE_SHEET_ID;

  if (!slug || !instanceId || !sheetId) {
    console.error("Usage: node import_sheets_to_supabase.js --slug <slug> --instance-id <instance_id> [--sheet-id <sheet_id>]");
    process.exit(1);
  }

  // Get tenant
  const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", slug).single();
  if (!tenant) {
    console.error(`Tenant not found for slug: ${slug}`);
    process.exit(1);
  }

  console.log(`Importing data for tenant ${slug} from sheet ${sheetId}...`);

  const token = await getAccessToken();
  if (!token) {
    console.error("Failed to get Google Access Token. Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY");
    process.exit(1);
  }

  const [leadsRaw, messagesRaw, appointmentsRaw] = await Promise.all([
    fetchSheet(token, sheetId, "leads"),
    fetchSheet(token, sheetId, "chat_log"),
    fetchSheet(token, sheetId, "appointments"),
  ]);

  console.log(`Fetched ${leadsRaw.length} leads, ${messagesRaw.length} messages, ${appointmentsRaw.length} appointments.`);

  // Insert leads
  for (const r of leadsRaw) {
    if (!r.phone) continue;
    await supabase.from("leads").insert({
      tenant_id: tenant.id,
      instance_id: instanceId,
      phone: String(r.phone || "").trim(),
      name: String(r.name || "Unknown lead").trim() || "Unknown lead",
      status: String(r.stage || "new").trim(),
      source: String(r.source_channel || "whatsapp").trim(),
      last_contact: parseDate(r.last_interaction_at) || new Date().toISOString(),
      updated_at: parseDate(r.updated_at) || new Date().toISOString(),
      created_at: parseDate(r.created_at) || new Date().toISOString()
    });
  }

  // Insert messages
  for (const r of messagesRaw) {
    if (!r.phone) continue;
    await supabase.from("messages").insert({
      tenant_id: tenant.id,
      instance_id: instanceId,
      phone: String(r.phone || "").trim(),
      body: String(r.message || "").trim(),
      sender: String(r.direction || "").trim() === "outbound" ? "bot" : "user", // Rough approximation
      timestamp: parseDate(r.timestamp) || new Date().toISOString()
    });
  }

  // Insert appointments
  for (const r of appointmentsRaw) {
    if (!r.phone || !r.slot_iso) continue;
    await supabase.from("appointments").insert({
      tenant_id: tenant.id,
      instance_id: instanceId,
      phone: String(r.phone || "").trim(),
      slot_iso: String(r.slot_iso || "").trim(),
      status: String(r.status || "scheduled").trim(),
      created_at: parseDate(r.created_at) || new Date().toISOString()
    });
  }

  console.log("Import completed successfully!");
}

run();
