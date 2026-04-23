import { readFileSync } from "fs";
import path from "path";
import { getClientSheetId, getClientStatsUrl, getClientLeadsUrl } from "@/lib/clients";

// ─── Shared Google Sheets service account (used for all clients) ──────────
const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
const PRIVATE_KEY   = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

async function getAccessToken() {
  if (!SERVICE_EMAIL || !PRIVATE_KEY) return null;

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
  const binaryKey    = Buffer.from(keyData, "base64");

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"],
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, Buffer.from(signingInput));
  const jwt = `${signingInput}.${Buffer.from(signature).toString("base64url")}`;

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
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next:    { revalidate: 120 },
  });
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

// ─── Normalizers ──────────────────────────────────────────────────────────

function normLead(r) {
  return {
    phone:               String(r.phone || "").trim(),
    name:                String(r.name || "Unknown lead").trim() || "Unknown lead",
    stage:               String(r.stage || "").trim(),
    conversationStage:   String(r.conversation_stage || "").trim(),
    intentLevel:         String(r.intent_level || "").trim().toLowerCase(),
    leadScore:           Number(r.lead_score) || 0,
    inquiryType:         String(r.inquiry_type || "").trim(),
    treatmentType:       String(r.treatment_type || "").trim(),
    painLevel:           Number(r.pain_level) || 0,
    urgencyScore:        Number(r.urgency_score) || 0,
    preferredDay:        String(r.preferred_day || "").trim(),
    preferredTime:       String(r.preferred_time || "").trim(),
    appointmentTime:     String(r.appointment_time || "").trim(),
    appointmentStatus:   String(r.appointment_status || "").trim(),
    lastIntent:          String(r.last_intent || "").trim(),
    lastMessage:         String(r.last_message || "").trim(),
    lastInteractionAt:   String(r.last_interaction_at || "").trim(),
    sourceChannel:       String(r.source_channel || "").trim(),
    sourceCampaign:      String(r.source_campaign || "").trim(),
    language:            String(r.language || "").trim(),
    currentHandler:      String(r.current_handler || "bot").trim(),
    handoffStatus:       String(r.handoff_status || "").trim(),
    conversationSummary: String(r.conversation_summary || "").trim(),
    createdAt:           String(r.created_at || "").trim(),
    updatedAt:           String(r.updated_at || "").trim(),
    appointmentSlotIso:  String(r.appointment_slot_iso || "").trim(),
    noShowCount:         Number(r.no_show_count) || 0,
  };
}

function normMessage(r) {
  return {
    timestamp:   String(r.timestamp || "").trim(),
    phone:       String(r.phone || "").trim(),
    direction:   String(r.direction || "").trim(),
    message:     String(r.message || "").trim(),
    intent:      String(r.intent || "").trim(),
    stageAtSend: String(r.stage_at_send || "").trim(),
    language:    String(r.language || "").trim(),
    mediaType:   String(r.media_type || "").trim(),
  };
}

function normAppointment(r) {
  return {
    appointmentId:   String(r.appointment_id || "").trim(),
    phone:           String(r.phone || "").trim(),
    name:            String(r.name || "Unknown").trim(),
    treatmentType:   String(r.treatment_type || "").trim(),
    slotIso:         String(r.slot_iso || "").trim(),
    slotHuman:       String(r.slot_human || "").trim(),
    status:          String(r.status || "").trim(),
    createdAt:       String(r.created_at || "").trim(),
    outcomeNotes:    String(r.outcome_notes || "").trim(),
    sourceLeadScore: Number(r.source_lead_score) || 0,
  };
}

// ─── Per-client cache ─────────────────────────────────────────────────────
const _cache = {}; // { [slug]: { data, cachedAt } }
const CACHE_TTL = 2 * 60 * 1000;

// ─── Main export — per-client ─────────────────────────────────────────────

export async function getDashboardData(slug = "default") {
  // 1. n8n webhook mode (per-client)
  const statsUrl = getClientStatsUrl(slug);
  const leadsUrl = getClientLeadsUrl(slug);
  if (statsUrl && leadsUrl) {
    return null; // Signal to use webhook mode in the route handler
  }

  // 2. Google Sheets (per-client sheet ID)
  const sheetId = getClientSheetId(slug);
  if (sheetId && SERVICE_EMAIL && PRIVATE_KEY) {
    const now = Date.now();
    if (_cache[slug]?.data && now - _cache[slug].cachedAt < CACHE_TTL) {
      return _cache[slug].data;
    }
    try {
      const token = await getAccessToken();
      if (token) {
        const [leadsRaw, messagesRaw, appointmentsRaw] = await Promise.all([
          fetchSheet(token, sheetId, "leads"),
          fetchSheet(token, sheetId, "chat_log"),
          fetchSheet(token, sheetId, "appointments"),
        ]);
        const data = {
          generatedAt:  new Date().toISOString(),
          leads:        leadsRaw.map(normLead),
          messages:     messagesRaw.map(normMessage),
          appointments: appointmentsRaw.map(normAppointment),
        };
        _cache[slug] = { data, cachedAt: now };
        return data;
      }
    } catch (err) {
      console.error(`[${slug}] Google Sheets fetch failed:`, err.message);
    }
  }

  // 3. Local JSON fallback (shared demo data)
  try {
    const filePath = path.join(process.cwd(), "data", "dashboard-data.json");
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return { generatedAt: new Date().toISOString(), leads: [], messages: [], appointments: [] };
  }
}
