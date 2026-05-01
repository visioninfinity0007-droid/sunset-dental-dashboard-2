# Migration Guide: Single-Tenant to Multi-Tenant

This guide outlines the steps to migrate data from the legacy single-tenant Google Sheets architecture to the new Supabase multi-tenant architecture.

## Overview
We've introduced a PostgreSQL schema on Supabase that handles multiple tenants, role-based access, and relational data for leads, messages, and appointments.

## Step 1: Migrate Legacy Tenants
Run the `scripts/migrate_sunset_dental.js` script to create the initial `sunset-dental` tenant and link it to the hardcoded user.
```bash
node scripts/migrate_sunset_dental.js
```
This script requires the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS and insert the tenant record directly.

## Step 2: Import Legacy Data
Run `scripts/import_sheets_to_supabase.js` to migrate data from the Google Sheets CSV exports to Supabase.
```bash
node scripts/import_sheets_to_supabase.js
```
This script will parse your downloaded CSV files (leads.csv, messages.csv) and insert them into the correct tables, mapped to the legacy tenant's ID.

## Step 3: Deprecate Google Sheets
Once the data is successfully in Supabase:
1. Turn off any active n8n webhooks writing to Google Sheets.
2. Update n8n workflows to write directly to Supabase via its REST API or the Postgres node.

## Database Migrations
All future changes to the schema must be done via numbered SQL migrations in `supabase/migrations/` (e.g., `00002_add_billing.sql`). Do not modify `00001_init.sql` once applied to production.
