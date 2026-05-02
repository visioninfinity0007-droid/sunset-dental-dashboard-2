-- Migration: 00003_lead_enrichment_complete.sql
-- Fix column names and add remaining columns from round 3

DO $$ 
BEGIN
  -- Rename 'intent' to 'intent_level' if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='intent') THEN
    ALTER TABLE public.leads RENAME COLUMN intent TO intent_level;
  END IF;

  -- Rename 'score' to 'lead_score' if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='score') THEN
    ALTER TABLE public.leads RENAME COLUMN score TO lead_score;
  END IF;

  -- Drop 'appointment_time' if it exists and is TEXT
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='appointment_time' AND data_type='text') THEN
    ALTER TABLE public.leads DROP COLUMN appointment_time;
  END IF;
END $$;

-- 1. Add columns to 'leads'
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS conversation_stage TEXT,
  ADD COLUMN IF NOT EXISTS inquiry_type TEXT,
  ADD COLUMN IF NOT EXISTS pain_level INT,
  ADD COLUMN IF NOT EXISTS urgency_score INT,
  ADD COLUMN IF NOT EXISTS preferred_day TEXT,
  ADD COLUMN IF NOT EXISTS preferred_time TEXT,
  ADD COLUMN IF NOT EXISTS appointment_status TEXT,
  ADD COLUMN IF NOT EXISTS last_intent TEXT,
  ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_campaign TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS handoff_status TEXT,
  ADD COLUMN IF NOT EXISTS appointment_slot_iso TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS past_purchases JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS customer_lifetime_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS appointment_time TIMESTAMPTZ;

-- Re-add CHECK constraint for intent_level safely
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_intent_level_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_intent_level_check CHECK (intent_level IS NULL OR intent_level IN ('hot','warm','cold','emergency'));

-- Indexes for 'leads'
CREATE INDEX IF NOT EXISTS leads_tenant_score_idx ON public.leads(tenant_id, lead_score DESC);
CREATE INDEX IF NOT EXISTS leads_tenant_intent_idx ON public.leads(tenant_id, intent_level);

-- 2. Add columns to 'messages'
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS intent TEXT,
  ADD COLUMN IF NOT EXISTS stage_at_send TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT;

-- 3. Add columns to 'appointments'
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS treatment_type TEXT,
  ADD COLUMN IF NOT EXISTS slot_human TEXT,
  ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
  ADD COLUMN IF NOT EXISTS source_lead_score INT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
