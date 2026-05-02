-- supabase/migrations/00004_billing_fields.sql

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'unconfigured'
    CHECK (plan_status IN ('unconfigured', 'pending_payment', 'active', 'suspended', 'cancelled')),
  ADD COLUMN IF NOT EXISTS plan_selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_business_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT;

ALTER TABLE public.tenants
  ALTER COLUMN plan SET DEFAULT 'starter',
  DROP CONSTRAINT IF EXISTS tenants_plan_check,
  ADD CONSTRAINT tenants_plan_check CHECK (plan IN ('starter', 'growth', 'enterprise'));

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  setup_fee_pkr INTEGER NOT NULL,
  monthly_fee_pkr INTEGER NOT NULL,
  total_pkr INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  due_date DATE NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  pdf_storage_path TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoices_tenant_idx ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their tenant's invoices" ON public.invoices
  FOR SELECT USING (public.is_active_member(tenant_id));

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_target_idx ON public.audit_log(target_type, target_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- No SELECT policy — admin-only via service role.

CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

INSERT INTO public.super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'awais.oraimo@gmail.com'
ON CONFLICT DO NOTHING;

UPDATE public.tenants
SET plan = 'enterprise', plan_status = 'active', activated_at = NOW()
WHERE slug = 'apex-b2b-demo';

-- Create invoices storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for invoices bucket
CREATE POLICY "Super admins can manage all invoices"
ON storage.objects FOR ALL
USING (bucket_id = 'invoices' AND auth.uid() IN (SELECT user_id FROM public.super_admins));

CREATE POLICY "Members can view their tenant invoices"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoices' AND (storage.foldername(name))[1] IN (
  SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
));
