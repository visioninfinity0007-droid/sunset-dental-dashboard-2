import { describe, it, expect, vi } from "vitest";

// Mock server-only dependencies
vi.mock("next/headers", () => ({
  cookies: () => ({}),
}));
vi.mock("../src/lib/supabaseServer", () => ({
  createClient: () => ({}),
}));

import { normLead, normMessage, normAppointment } from "../src/lib/data";

describe("Data Normalizers", () => {
  it("maps new lead enrichment fields correctly", () => {
    const rawLead = {
      phone: "+1234567890",
      name: "Test User",
      status: "qualified",
      source: "facebook",
      intent_level: "hot",
      lead_score: 85,
      treatment_type: "Invisalign",
      conversation_summary: "Wants straight teeth",
      last_message: "How much?",
      appointment_time: "2026-05-10T10:00:00Z",
      current_handler: "human",
      past_purchases: [{ item: "Checkup" }],
      customer_lifetime_value: 1000
    };

    const normalized = normLead(rawLead);
    expect(normalized.phone).toBe("+1234567890");
    expect(normalized.name).toBe("Test User");
    expect(normalized.stage).toBe("qualified");
    expect(normalized.intentLevel).toBe("hot");
    expect(normalized.leadScore).toBe(85);
    expect(normalized.treatmentType).toBe("Invisalign");
    expect(normalized.conversationSummary).toBe("Wants straight teeth");
    expect(normalized.lastMessage).toBe("How much?");
    expect(normalized.appointmentTime).toBe("2026-05-10T10:00:00Z");
    expect(normalized.currentHandler).toBe("human");
    expect(normalized.pastPurchases.length).toBe(1);
    expect(normalized.customerLifetimeValue).toBe(1000);
  });

  it("provides defaults for missing fields in normLead", () => {
    const normalized = normLead({});
    expect(normalized.intentLevel).toBe("cold");
    expect(normalized.leadScore).toBe(0);
    expect(normalized.currentHandler).toBe("bot");
    expect(normalized.name).toBe("Unknown lead");
    expect(normalized.pastPurchases).toEqual([]);
    expect(normalized.customerLifetimeValue).toBe(0);
  });

  it("maps message fields correctly", () => {
    const rawMsg = {
      phone: "123",
      timestamp: "2026",
      sender: "user",
      body: "Hi",
      intent: "warm"
    };
    const norm = normMessage(rawMsg);
    expect(norm.direction).toBe("inbound");
    expect(norm.message).toBe("Hi");
    expect(norm.intent).toBe("warm");
  });

  it("maps appointment fields correctly", () => {
    const rawAppt = {
      phone: "123",
      slot_iso: "2026",
      status: "booked",
      name: "John Doe"
    };
    const norm = normAppointment(rawAppt);
    expect(norm.slotIso).toBe("2026");
    expect(norm.status).toBe("booked");
    expect(norm.name).toBe("John Doe");
  });
});
