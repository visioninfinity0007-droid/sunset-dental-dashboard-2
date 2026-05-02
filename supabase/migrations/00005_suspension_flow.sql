-- Migration 00005: Suspension Flow & Bot Config

-- Add suspension_grace_days and bot_config to tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS suspension_grace_days integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS bot_config jsonb DEFAULT '{}'::jsonb;

-- Note: To run the suspension cron, ensure CRON_SECRET is set in your environment
-- and an external cron runner pings POST /api/cron/check-suspensions
