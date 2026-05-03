CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' 
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Tenants can only see their own tickets
CREATE POLICY "tenant_own_tickets" ON support_tickets
  FOR ALL USING (is_active_member(tenant_id));

-- Service role full access for admin
-- (Supabase default for service_role is to bypass RLS)
