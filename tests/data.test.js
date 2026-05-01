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
      intent: "hot",
      score: 85,
      treatment_type: "Invisalign",
      conversation_summary: "Wants straight teeth",
      last_message: "How much?",
      appointment_time: "2026-05-10 10:00 AM",
      current_handler: "human"
    };

    const normalized = normLead(rawLead);
    expect(normalized.phone).toBe("+1234567890");
    expect(normalized.name).toBe("Test User");
    expect(normalized.stage).toBe("qualified");
    expect(normalized.intent).toBe("hot");
    expect(normalized.score).toBe(85);
    expect(normalized.treatmentType).toBe("Invisalign");
    expect(normalized.conversationSummary).toBe("Wants straight teeth");
    expect(normalized.lastMessage).toBe("How much?");
    expect(normalized.appointmentTime).toBe("2026-05-10 10:00 AM");
    expect(normalized.currentHandler).toBe("human");
  });

  it("provides defaults for missing fields in normLead", () => {
    const normalized = normLead({});
    expect(normalized.intent).toBe("cold");
    expect(normalized.score).toBe(0);
    expect(normalized.currentHandler).toBe("bot");
    expect(normalized.name).toBe("Unknown lead");
  });

  it("maps message fields correctly", () => {
    const rawMsg = {
      phone: "123",
      timestamp: "2026",
      sender: "user",
      body: "Hi"
    };
    const norm = normMessage(rawMsg);
    expect(norm.direction).toBe("inbound");
    expect(norm.message).toBe("Hi");
  });

  it("maps appointment fields correctly", () => {
    const rawAppt = {
      phone: "123",
      slot_iso: "2026",
      status: "booked"
    };
    const norm = normAppointment(rawAppt);
    expect(norm.slotIso).toBe("2026");
    expect(norm.status).toBe("booked");
  });
});
