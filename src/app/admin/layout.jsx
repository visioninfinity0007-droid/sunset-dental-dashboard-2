import { createClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({ children }) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Check super_admins table
  const { data: superAdmin } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!superAdmin) {
    // If not super admin, try to redirect to their dashboard or home
    const { data: membership } = await supabase
      .from("tenant_members")
      .select("tenants(slug)")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
      
    if (membership && membership.tenants) {
      redirect(`/dashboard/${membership.tenants.slug}`);
    } else {
      redirect("/login");
    }
  }

  return (
    <div className="dashboard-shell">
      <AdminSidebar userEmail={session.user.email} />
      <main className="main-content flex flex-col h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}
