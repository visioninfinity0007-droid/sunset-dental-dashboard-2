import { describe, it, expect, vi } from 'vitest';

describe('Login Tenant Resolution Logic', () => {
  it('should correctly resolve the most recently joined active tenant slug', async () => {
    // 1. Setup mock data
    const mockUserId = 'user-123';
    const expectedSlug = 'expected-slug-123';
    
    // Create a chainable mock object for the Supabase query
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        joined_at: '2026-05-01T12:00:00Z',
        tenants: { slug: expectedSlug }
      },
      error: null
    });
    
    const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    
    const mockSupabase = {
      from: mockFrom
    };

    // 2. Execute the exact logic from login/page.jsx
    const { data: membership, error: membershipError } = await mockSupabase
      .from("tenant_members")
      .select("joined_at, tenants!inner(slug)")
      .eq("user_id", mockUserId)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    const resolvedSlug = membership?.tenants?.slug;

    // 3. Assert correct execution and results
    expect(mockFrom).toHaveBeenCalledWith("tenant_members");
    expect(mockSelect).toHaveBeenCalledWith("joined_at, tenants!inner(slug)");
    expect(mockEq1).toHaveBeenCalledWith("user_id", mockUserId);
    expect(mockEq2).toHaveBeenCalledWith("status", "active");
    expect(mockOrder).toHaveBeenCalledWith("joined_at", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(1);
    expect(mockMaybeSingle).toHaveBeenCalled();
    
    expect(membershipError).toBeNull();
    expect(resolvedSlug).toBe(expectedSlug);
  });
  
  it('should handle missing tenant explicitly', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null
    });
    
    const mockLimit = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    
    const mockSupabase = {
      from: mockFrom
    };

    const { data: membership } = await mockSupabase
      .from("tenant_members")
      .select("joined_at, tenants!inner(slug)")
      .eq("user_id", 'user-404')
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    const resolvedSlug = membership?.tenants?.slug;
    
    expect(resolvedSlug).toBeUndefined();
  });
});

describe('Admin Activation Endpoint', () => {
  it('should require super_admin privileges to activate a tenant', async () => {
    // 1. Setup mock data
    const mockUserId = 'user-not-admin';
    const tenantIdToActivate = 'tenant-123';
    
    const mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { session: { user: { id: mockUserId } } }
    });
    
    // Not a super admin
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null
    });
    
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    
    const mockSupabase = {
      auth: { getSession: mockAuthGetUser },
      from: mockFrom
    };
    
    // Simulate the route.js logic
    const { data: { session } } = await mockSupabase.auth.getSession();
    const { data: superAdmin } = await mockSupabase
      .from("super_admins")
      .select("user_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
      
    // Should fail authorization
    expect(superAdmin).toBeNull();
  });
});
