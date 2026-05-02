import { createClient } from "./supabaseServer";
import { cookies } from "next/headers";

export function normLead(r) {
  return {
    ...r, // include everything
    phone:                 String(r.phone || "").trim(),
    name:                  String(r.name || "Unknown lead").trim() || "Unknown lead",
    stage:                 String(r.status || "").trim(),
    sourceChannel:         String(r.source || "").trim(),
    sourceCampaign:        String(r.source_campaign || "").trim(),
    createdAt:             String(r.created_at || "").trim(),
    updatedAt:             String(r.updated_at || "").trim(),
    lastInteractionAt:     String(r.last_interaction_at || r.last_contact || "").trim(),
    instanceId:            r.instance_id,
    currentHandler:        String(r.current_handler || "bot").trim(),
    intentLevel:           String(r.intent_level || "cold").trim(),
    leadScore:             Number(r.lead_score || 0),
    treatmentType:         String(r.treatment_type || "").trim(),
    conversationSummary:   String(r.conversation_summary || "").trim(),
    lastMessage:           String(r.last_message || "").trim(),
    appointmentTime:       String(r.appointment_time || "").trim(),
    conversationStage:     String(r.conversation_stage || "").trim(),
    inquiryType:           String(r.inquiry_type || "").trim(),
    painLevel:             Number(r.pain_level || 0),
    urgencyScore:          Number(r.urgency_score || 0),
    preferredDay:          String(r.preferred_day || "").trim(),
    preferredTime:         String(r.preferred_time || "").trim(),
    appointmentStatus:     String(r.appointment_status || "").trim(),
    lastIntent:            String(r.last_intent || "").trim(),
    language:              String(r.language || "en").trim(),
    handoffStatus:         String(r.handoff_status || "").trim(),
    appointmentSlotIso:    String(r.appointment_slot_iso || "").trim(),
    noShowCount:           Number(r.no_show_count || 0),
    pastPurchases:         r.past_purchases || [],
    customerLifetimeValue: Number(r.customer_lifetime_value || 0),
  };
}

export function normMessage(r) {
  return {
    ...r,
    timestamp:   String(r.timestamp || "").trim(),
    phone:       String(r.phone || "").trim(),
    direction:   r.sender === "user" ? "inbound" : "outbound",
    message:     String(r.body || "").trim(),
    intent:      String(r.intent || "").trim(),
    stageAtSend: String(r.stage_at_send || "").trim(),
    language:    String(r.language || "").trim(),
    mediaType:   String(r.media_type || "").trim(),
  };
}

export function normAppointment(r) {
  return {
    ...r,
    phone:           String(r.phone || "").trim(),
    slotIso:         String(r.slot_iso || "").trim(),
    status:          String(r.status || "").trim(),
    createdAt:       String(r.created_at || "").trim(),
    name:            String(r.name || "").trim(),
    treatmentType:   String(r.treatment_type || "").trim(),
    slotHuman:       String(r.slot_human || "").trim(),
    outcomeNotes:    String(r.outcome_notes || "").trim(),
    sourceLeadScore: Number(r.source_lead_score || 0),
    confirmedAt:     String(r.confirmed_at || "").trim(),
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
