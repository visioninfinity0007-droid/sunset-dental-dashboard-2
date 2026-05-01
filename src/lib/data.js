import { createClient } from "./supabaseServer";
import { cookies } from "next/headers";

export function normLead(r) {
  return {
    ...r, // include everything
    phone:               String(r.phone || "").trim(),
    name:                String(r.name || "Unknown lead").trim() || "Unknown lead",
    stage:               String(r.status || "").trim(),
    sourceChannel:       String(r.source || "").trim(),
    createdAt:           String(r.created_at || "").trim(),
    updatedAt:           String(r.updated_at || "").trim(),
    lastInteractionAt:   String(r.last_contact || "").trim(),
    instanceId:          r.instance_id,
    currentHandler:      String(r.current_handler || "bot").trim(), // assumed column
    intent:              String(r.intent || "cold").trim(),
    score:               Number(r.score || 0),
    treatmentType:       String(r.treatment_type || "").trim(),
    conversationSummary: String(r.conversation_summary || "").trim(),
    lastMessage:         String(r.last_message || "").trim(),
    appointmentTime:     String(r.appointment_time || "").trim(),
  };
}

export function normMessage(r) {
  return {
    ...r,
    timestamp:   String(r.timestamp || "").trim(),
    phone:       String(r.phone || "").trim(),
    direction:   r.sender === "user" ? "inbound" : "outbound",
    message:     String(r.body || "").trim(),
  };
}

export function normAppointment(r) {
  return {
    ...r,
    phone:           String(r.phone || "").trim(),
    slotIso:         String(r.slot_iso || "").trim(),
    status:          String(r.status || "").trim(),
    createdAt:       String(r.created_at || "").trim(),
  };
}

export async function getDashboardData(tenantId, instanceId = null) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const leadsQuery = supabase.from("leads").select("*").eq("tenant_id", tenantId);
  const msgsQuery = supabase.from("messages").select("*").eq("tenant_id", tenantId);
  const apptsQuery = supabase.from("appointments").select("*").eq("tenant_id", tenantId);

  if (instanceId) {
    leadsQuery.eq("instance_id", instanceId);
    msgsQuery.eq("instance_id", instanceId);
    apptsQuery.eq("instance_id", instanceId);
  }

  const [
    { data: leads },
    { data: messages },
    { data: appointments },
    { data: instances }
  ] = await Promise.all([
    leadsQuery,
    msgsQuery,
    apptsQuery,
    supabase.from("whatsapp_instances").select("id, label").eq("tenant_id", tenantId)
  ]);

  const instanceMap = (instances || []).reduce((acc, inst) => {
    acc[inst.id] = inst.label;
    return acc;
  }, {});

  const normalizedLeads = (leads || []).map(l => ({
     ...normLead(l),
     instanceLabel: instanceMap[l.instance_id] || "Unknown Channel"
  }));

  return {
    generatedAt: new Date().toISOString(),
    leads: normalizedLeads,
    messages: (messages || []).map(normMessage),
    appointments: (appointments || []).map(normAppointment),
  };
}
