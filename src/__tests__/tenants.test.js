import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertRole } from "@/lib/tenants";

const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/lib/supabaseServer", () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
    })),
  }),
}));

describe("Tenant Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("assertRole", () => {
    it("returns true if user has the required role", async () => {
      mockSingle.mockResolvedValueOnce({ data: { role: "owner" }, error: null });
      
      const result = await assertRole("tenant-123", "user-123", ["owner", "admin"]);
      expect(result).toBe(true);
      expect(mockEq).toHaveBeenCalledWith("tenant_id", "tenant-123");
      expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("returns false if user does not have the required role", async () => {
      mockSingle.mockResolvedValueOnce({ data: { role: "viewer" }, error: null });
      
      const result = await assertRole("tenant-123", "user-123", ["owner", "admin"]);
      expect(result).toBe(false);
    });

    it("returns false if membership is not found", async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: "Not found" } });
      
      const result = await assertRole("tenant-123", "user-123", ["owner", "admin"]);
      expect(result).toBe(false);
    });
  });
});
