# Deployment Guide (Coolify)

The Vision Infinity dashboard is a Next.js 14 application powered by Supabase and Evolution API v2, designed for deployment on Coolify.

## Prerequisites
1. **Supabase Project**: Set up a Supabase instance for database and auth.
2. **Evolution API v2 Instance**: For WhatsApp integration.
3. **Coolify Server**: A self-hosted Coolify instance.

## Coolify Setup
1. Create a new **Application** in Coolify.
2. Select **GitHub** as the provider and choose the `vision-infinity-app` repository.
3. Choose the **Nixpacks** or **Dockerfile** build pack. We recommend the included **Dockerfile** for Next.js standalone output.
4. Set the **Start Command** to `node server.js` (handled by Dockerfile).
5. Add the necessary Environment Variables.

## Environment Variables
In the Coolify dashboard, add the following variables under the **Environment Variables** tab:
```env
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="ey..."
SUPABASE_SERVICE_ROLE_KEY="ey..."
EVOLUTION_API_URL="https://evolution.yourdomain.com"
EVOLUTION_API_KEY="your-apikey"
N8N_WEBHOOK_BASE="https://n8n.yourdomain.com/webhook"
```

## Health Checks
The application exposes a health check endpoint at `/api/health`.
In Coolify, configure the Health Check settings:
- **Path**: `/api/health`
- **Method**: `GET`
- **Expected Status**: `200`

## Build Settings
The repository includes `output: "standalone"` in `next.config.js` and a multi-stage Dockerfile tailored for Next.js.
When using the Dockerfile pack in Coolify, no further configuration is required.

## Production Considerations
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is kept secure and never exposed to the client.
- Set up Supabase Auth SMTP for reliable email delivery of invitations.
