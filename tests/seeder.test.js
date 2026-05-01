import { describe, it, expect } from "vitest";
import { generateDemoData } from "../scripts/seed_demo_account.js";

describe("Demo Seeder Idempotency", () => {
  it("should generate identical final state when run twice with the same seed", () => {
    const run1 = generateDemoData("tenant-1", "inst-1", 12345);
    const run2 = generateDemoData("tenant-1", "inst-1", 12345);

    expect(run1.leads).toEqual(run2.leads);
    expect(run1.messages).toEqual(run2.messages);
    expect(run1.appointments).toEqual(run2.appointments);
    expect(run1.kbEntries).toEqual(run2.kbEntries);
  });
});
