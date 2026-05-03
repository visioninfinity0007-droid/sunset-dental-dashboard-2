import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/signup/route";

// Mock Supabase admin client and session client
const mockCreateUser = vi.fn();
const mockListUsers = vi.fn();
const mockDeleteUser = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockSingle = vi.fn();
const mockSignInWithPassword = vi.fn();

const chainable = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: mockSingle,
  maybeSingle: mockSingle,
  then: function(resolve) { resolve({ error: null }); }
};

mockSelect.mockReturnValue(chainable);
mockInsert.mockReturnValue(chainable);
mockUpdate.mockReturnValue(chainable);
mockDelete.mockReturnValue(chainable);

vi.mock("@/lib/supabaseServer", () => ({
  createServiceRoleClient: () => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
        listUsers: mockListUsers,
        deleteUser: mockDeleteUser,
      },
    },
    from: vi.fn(() => chainable),
  }),
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}));

describe("Signup POST Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body) => ({
    json: async () => body,
    headers: {
      get: vi.fn().mockReturnValue(null)
    }
  });

  it("fails if required fields are missing", async () => {
    const req = createRequest({ businessName: "Acme" });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing required fields.");
  });

  it("handles Mode A: successful new signup", async () => {
    mockCreateUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } }, error: null });
    // For getUniqueSlug
    mockSingle.mockResolvedValueOnce({ data: null, error: null }); // Tenant slug not found -> unique
    // For insert tenant
    mockSingle.mockResolvedValueOnce({ data: { id: "tenant-123", slug: "acme-corp" }, error: null });
    
    // Mock Healthcheck
    mockSingle.mockResolvedValueOnce({ data: { joined_at: "2026", tenants: { slug: "acme-corp" } }, error: null });

    mockSignInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

    const req = createRequest({
      businessName: "Acme Corp",
      fullName: "John Doe",
      email: "john@acme.com",
      password: "password123"
    });

    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.slug).toBe("acme-corp");
    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ email: "john@acme.com" }));
  });

  it("rolls back auth user if tenant creation fails", async () => {
    mockCreateUser.mockResolvedValueOnce({ data: { user: { id: "user-123" } }, error: null });
    mockSingle.mockResolvedValueOnce({ data: null, error: null }); // slug unique
    // Tenant insert fails
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: "DB Error" } });

    const req = createRequest({
      businessName: "Acme Corp",
      fullName: "John Doe",
      email: "john@acme.com",
      password: "password123"
    });

    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to create tenant.");
    expect(mockDeleteUser).toHaveBeenCalledWith("user-123");
  });

  it("handles idempotency: uses existing user if already registered", async () => {
    mockCreateUser.mockResolvedValueOnce({ data: null, error: { message: "already registered" } });
    mockListUsers.mockResolvedValueOnce({ data: { users: [{ id: "existing-user-123", email: "john@acme.com" }] } });
    
    // For getUniqueSlug
    mockSingle.mockResolvedValueOnce({ data: null, error: null });
    // For insert tenant
    mockSingle.mockResolvedValueOnce({ data: { id: "tenant-123", slug: "acme-corp" }, error: null });
    
    // Mock Healthcheck
    mockSingle.mockResolvedValueOnce({ data: { joined_at: "2026", tenants: { slug: "acme-corp" } }, error: null });

    const req = createRequest({
      businessName: "Acme Corp",
      fullName: "John Doe",
      email: "john@acme.com",
      password: "password123"
    });

    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mockDeleteUser).not.toHaveBeenCalled(); // Successful run, no rollback
  });

});
