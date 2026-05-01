-- Create tenants table
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  business_name text not null,
  plan text not null default 'starter',
  bot_personality text,
  bot_default_language text not null default 'en',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.tenants enable row level security;

-- Create tenant_members table
create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'agent', 'viewer')),
  status text not null default 'active' check (status in ('active', 'removed')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);
alter table public.tenant_members enable row level security;

-- Create tenant_invitations table
create table if not exists public.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'agent', 'viewer')),
  token text unique not null,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
-- Unique index for pending invites per email/tenant
create unique index if not exists unique_pending_invite on public.tenant_invitations (tenant_id, lower(email)) where accepted_at is null and revoked_at is null;
alter table public.tenant_invitations enable row level security;

-- Create whatsapp_instances table
create table if not exists public.whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  label text not null,
  evolution_instance_name text unique not null,
  evolution_instance_token text,
  evolution_status text not null default 'pending' check (evolution_status in ('pending', 'qr_ready', 'connected', 'failed', 'disconnected')),
  whatsapp_phone text,
  is_primary boolean not null default false,
  connected_at timestamptz,
  last_qr_refreshed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_instances_tenant_is_primary_idx on public.whatsapp_instances(tenant_id, is_primary);
alter table public.whatsapp_instances enable row level security;

-- Create leads table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instances(id) on delete cascade,
  phone text not null,
  name text,
  status text not null default 'new',
  source text not null default 'whatsapp',
  current_handler text not null default 'bot' check (current_handler in ('bot', 'human')),
  last_contact timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_tenant_updated_idx on public.leads(tenant_id, updated_at desc);
create index if not exists leads_tenant_phone_idx on public.leads(tenant_id, phone);
create index if not exists leads_instance_updated_idx on public.leads(instance_id, updated_at desc);
alter table public.leads enable row level security;

-- Create messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instances(id) on delete cascade,
  phone text not null,
  body text,
  sender text not null check (sender in ('user', 'bot', 'human')),
  timestamp timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists messages_tenant_phone_time_idx on public.messages(tenant_id, phone, timestamp);
create index if not exists messages_instance_time_idx on public.messages(instance_id, timestamp desc);
alter table public.messages enable row level security;

-- Create appointments table
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  instance_id uuid not null references public.whatsapp_instances(id) on delete cascade,
  phone text not null,
  slot_iso timestamptz not null,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);
create index if not exists appointments_tenant_slot_idx on public.appointments(tenant_id, slot_iso);
alter table public.appointments enable row level security;

-- Create knowledge_sources table
create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null check (type in ('flow', 'faq', 'website', 'document')),
  label text not null,
  content text,
  source_url text,
  storage_path text,
  original_filename text,
  file_size_bytes bigint,
  mime_type text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed')),
  error_message text,
  meta jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.knowledge_sources enable row level security;

-- RLS POLICIES

-- Helper function to check if user is an active member
create or replace function public.is_active_member(target_tenant_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from public.tenant_members
    where tenant_id = target_tenant_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

-- Tenants: user can view/update if they are an active member. 
-- Service role handles creation (during signup).
create policy "Users can view tenants they are members of" on public.tenants
  for select using (public.is_active_member(id));
create policy "Users can update tenants they are members of" on public.tenants
  for update using (public.is_active_member(id));

-- Tenant Members: user can view if active member. Insert/Update managed via API with service role or gated routes.
create policy "Users can view members of their tenants" on public.tenant_members
  for select using (public.is_active_member(tenant_id));

-- Tenant Invitations: viewable by members
create policy "Users can view invites for their tenants" on public.tenant_invitations
  for select using (public.is_active_member(tenant_id));

-- WhatsApp Instances: viewable/updatable by members
create policy "Users can access whatsapp instances of their tenants" on public.whatsapp_instances
  for all using (public.is_active_member(tenant_id));

-- Leads: viewable/updatable by members
create policy "Users can access leads of their tenants" on public.leads
  for all using (public.is_active_member(tenant_id));

-- Messages: viewable/updatable by members
create policy "Users can access messages of their tenants" on public.messages
  for all using (public.is_active_member(tenant_id));

-- Appointments: viewable/updatable by members
create policy "Users can access appointments of their tenants" on public.appointments
  for all using (public.is_active_member(tenant_id));

-- Knowledge Sources: viewable/updatable by members
create policy "Users can access knowledge of their tenants" on public.knowledge_sources
  for all using (public.is_active_member(tenant_id));

-- Setup Storage for Knowledge Base
insert into storage.buckets (id, name, public) values ('knowledge', 'knowledge', false) on conflict (id) do nothing;

create policy "Users can read their tenant's knowledge files" on storage.objects
  for select using (bucket_id = 'knowledge' and public.is_active_member( (string_to_array(name, '/'))[1]::uuid ));

create policy "Users can upload knowledge files for their tenant" on storage.objects
  for insert with check (bucket_id = 'knowledge' and public.is_active_member( (string_to_array(name, '/'))[1]::uuid ));

create policy "Users can update their tenant's knowledge files" on storage.objects
  for update using (bucket_id = 'knowledge' and public.is_active_member( (string_to_array(name, '/'))[1]::uuid ));

create policy "Users can delete their tenant's knowledge files" on storage.objects
  for delete using (bucket_id = 'knowledge' and public.is_active_member( (string_to_array(name, '/'))[1]::uuid ));
