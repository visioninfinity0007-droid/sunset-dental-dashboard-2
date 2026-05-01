import { createClient } from "./supabaseServer";
import { cookies } from "next/headers";

export async function getTenantBySlug(slug) {
  const supabase = createClient(cookies());
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !tenant) return null;
  return tenant;
}

export async function getTenantsForUser(userId) {
  const supabase = createClient(cookies());
  const { data: memberships, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, tenants(*)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error || !memberships) return [];
  return memberships.map(m => m.tenants).filter(Boolean);
}

export async function getMembership(tenantId, userId) {
  const supabase = createClient(cookies());
  const { data: membership, error } = await supabase
    .from("tenant_members")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !membership) return null;
  return membership;
}

export async function assertRole(tenantId, userId, requiredRoles) {
  const membership = await getMembership(tenantId, userId);
  if (!membership) return false;
  if (!requiredRoles.includes(membership.role)) return false;
  return true;
}
