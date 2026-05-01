import { describe, it, expect } from "vitest";
import { generateCSV } from "../src/lib/csv";

describe("CSV Generation", () => {
  it("generates empty string for no data", () => {
    expect(generateCSV([])).toBe("");
    expect(generateCSV(null)).toBe("");
  });

  it("escapes commas, quotes, and newlines properly", () => {
    const data = [
      {
        name: 'John "The Boss" Doe',
        message: "Hello,\nWorld!",
        intent: "hot, but waiting",
      },
    ];
    const csv = generateCSV(data);
    
    // papaparse escapes quotes by doubling them, and wraps fields with commas/newlines in quotes
    expect(csv).toContain('"John ""The Boss"" Doe"');
    expect(csv).toContain('"Hello,\nWorld!"');
    expect(csv).toContain('"hot, but waiting"');
  });

  it("handles basic data", () => {
    const data = [
      { name: "Alice", score: 90 },
      { name: "Bob", score: 50 },
    ];
    const csv = generateCSV(data);
    expect(csv).toContain("Alice,90");
    expect(csv).toContain("Bob,50");
  });
});
