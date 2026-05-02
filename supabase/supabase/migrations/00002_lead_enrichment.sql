-- Migration: 00002_lead_enrichment.sql
-- Add new columns for lead scoring, intent, and advanced data tracking

ALTER TABLE leads
ADD COLUMN intent TEXT,
ADD COLUMN score INTEGER DEFAULT 0,
ADD COLUMN treatment_type TEXT,
ADD COLUMN conversation_summary TEXT,
ADD COLUMN last_message TEXT,
ADD COLUMN appointment_time TEXT;
