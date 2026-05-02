# N8N Setup Guide for Vision Infinity

## Webhooks

The Vision Infinity dashboard uses n8n for workflow automation. Ensure the following workflows are imported into your n8n instance.

### 1. Tenant Plan Selected (`n8n-tenant-plan-selected.json`)
Triggered when a user selects a pricing plan on the dashboard. It sends a welcome and invoice email.
- **Endpoint**: `/webhook/tenant-plan-selected`
- **Payload format**:
  \`\`\`json
  {
    "tenant_id": "uuid",
    "tenant_slug": "my-business",
    "business_name": "My Business",
    "owner_email": "user@example.com",
    "owner_name": "John Doe",
    "plan": "starter",
    "invoice_number": "INV-20260502-0001",
    "invoice_pdf_url": "https://...",
    "total_pkr": 42000,
    "due_date": "2026-05-09"
  }
  \`\`\`
- **Action**: Configure your SMTP credentials in the `Send Email` node to enable outgoing messages.
