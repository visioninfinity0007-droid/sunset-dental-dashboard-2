-- Track auto-provisioning status per tenant
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS provisioning_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (provisioning_status IN ('not_started', 'in_progress', 'completed', 'failed', 'manual')),
  ADD COLUMN IF NOT EXISTS provisioning_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provisioning_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provisioning_last_error TEXT,
  ADD COLUMN IF NOT EXISTS n8n_workflow_id TEXT,  -- For future Pattern A enterprise flows
  ADD COLUMN IF NOT EXISTS shared_flow_registered_at TIMESTAMPTZ;  -- Stamps when this tenant was registered with the shared flow

-- Track LLM usage per tenant for future billing
CREATE TABLE IF NOT EXISTS public.bot_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  llm_provider TEXT NOT NULL,    -- 'ollama' | 'openai'
  llm_model TEXT NOT NULL,        -- 'qwen2.5:7b' | 'gpt-4o-mini'
  message_count INTEGER NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  total_latency_ms BIGINT NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, date, llm_provider, llm_model)
);

CREATE INDEX IF NOT EXISTS bot_usage_tenant_date_idx ON public.bot_usage(tenant_id, date DESC);
ALTER TABLE public.bot_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their tenant's bot usage"
  ON public.bot_usage FOR SELECT
  USING (public.is_active_member(tenant_id));

-- Detailed bot execution log (for debugging silent failures)
CREATE TABLE IF NOT EXISTS public.bot_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  phone TEXT,
  step TEXT NOT NULL CHECK (step IN ('webhook_received', 'llm_call', 'response_sent', 'human_gate_blocked', 'fallback_triggered', 'error')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'skipped')),
  latency_ms INTEGER,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bot_execution_log_tenant_idx
  ON public.bot_execution_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bot_execution_log_step_idx
  ON public.bot_execution_log(step, status, created_at DESC);

ALTER TABLE public.bot_execution_log ENABLE ROW LEVEL SECURITY;
-- Admin-only via service role. No public select policy.

UPDATE public.tenants
SET provisioning_status = 'manual', shared_flow_registered_at = NOW()
WHERE slug = 'apex-b2b-demo';
