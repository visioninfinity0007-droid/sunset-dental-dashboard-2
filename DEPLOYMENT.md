# Deployment Guide

The Vision Infinity dashboard is a Next.js 14 application powered by Supabase and Evolution API v2.

## Prerequisites
1. **Supabase Project**: Create a new project on Supabase.
2. **Evolution API v2 Instance**: Set up and run the Evolution API v2.
3. **n8n Instance**: For webhook processing and bot logic.
4. **Vercel Account**: Or any environment supporting Next.js 14.

## Supabase Setup
1. Execute the migration file `supabase/migrations/00001_init.sql` in the Supabase SQL editor to create the schema and RLS policies.
2. Create a storage bucket named `knowledge` and make it public (or set appropriate RLS).
3. Get your API Keys from Settings > API.

## Environment Setup
Copy `.env.example` to `.env.local` and fill in the values:
```env
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="ey..."
SUPABASE_SERVICE_ROLE_KEY="ey..."
EVOLUTION_API_URL="https://evolution.yourdomain.com"
EVOLUTION_API_KEY="your-apikey"
N8N_WEBHOOK_BASE="https://n8n.yourdomain.com/webhook"
```

## Running Locally
```bash
npm install
npm run dev
```

## Deploying to Vercel
1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add the environment variables from your `.env.local`.
4. Deploy.

## Production Considerations
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is kept secure and never exposed to the client.
- Set up Supabase Auth SMTP for reliable email delivery of invitations.
