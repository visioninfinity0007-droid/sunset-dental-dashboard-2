import { createClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
// v2 - added debug logging

export default async function AdminLayout({ children }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check super_admins table
  const { data: superAdmin } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!superAdmin) {
    // Not a super admin - redirect to their dashboard
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenants(slug)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membership?.tenants?.slug) {
      redirect(`/dashboard/${membership.tenants.slug}`);
    } else {
      redirect("/login");
    }
  }

  return (
    <div className="dashboard-shell">
      <AdminSidebar userEmail={user.email} />
      <main className="main-content flex flex-col h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}
