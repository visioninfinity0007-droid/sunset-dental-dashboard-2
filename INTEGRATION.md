# Evolution API Integration

The application integrates with Evolution API v2 to provision WhatsApp instances dynamically for each tenant.

## Authentication
Evolution API v2 uses a single `apikey` header instead of the v1 global API key structure. This must be set in your `.env`:
`EVOLUTION_API_KEY=your_key`

## Provisioning Flow
When a user signs up or adds a new channel from the dashboard:
1. `POST /api/channels` (or `/api/signup`) calls `POST /instance/create` on Evolution API.
2. A new instance is created with `qrcode: true`, `integration: "WHATSAPP-BAILEYS"`.
3. The webhook is configured to point to `N8N_WEBHOOK_BASE/{instanceName}`.
4. The instance details (name, token) are saved to `whatsapp_instances` in Supabase.

## QR Code Retrieval
Evolution API v2 provides the QR code as a base64 string directly from `GET /instance/connect/{instanceName}`.
The dashboard polls `/api/instances/[id]/qr` to fetch and display this QR code to the user.

## Status Checks
The dashboard checks the status by polling `/api/instances/[id]/status` which calls `GET /instance/connectionState/{instanceName}`.
Status transitions: `close` -> `connecting` -> `open`. We map these to `pending`, `qr_ready`, and `connected`.

## Limitations & Retries
If the Evolution API is unavailable during signup, the application rolls back the created Supabase tenant and user to maintain consistency. Repeated signups with the same email will reconcile safely.
