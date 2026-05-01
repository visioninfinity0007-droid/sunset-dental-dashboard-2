import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";

export default async function AcceptInvitePage({ searchParams }) {
  const token = searchParams.token;

  if (!token) {
    return (
      <div className="min-h-screen bg-[#04050F] flex flex-col items-center justify-center text-white font-inter">
        <Logo size={36} withText={true} />
        <p className="mt-6 text-gray-400">Invalid invitation link.</p>
      </div>
    );
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const supabaseAdmin = createServiceRoleClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Validate token via admin client
  const { data: invite, error } = await supabaseAdmin
    .from("tenant_invitations")
    .select("*, tenants(slug)")
    .eq("token", token)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .single();

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-[#04050F] flex flex-col items-center justify-center text-white font-inter">
        <Logo size={36} withText={true} />
        <p className="mt-6 text-gray-400">Invitation is invalid or has expired.</p>
      </div>
    );
  }

  if (user) {
    // If the logged-in user matches the invite email, accept it automatically.
    if (user.email?.toLowerCase() === invite.email.toLowerCase()) {
      // Add member
      await supabaseAdmin.from("tenant_members").insert({
        tenant_id: invite.tenant_id,
        user_id: user.id,
        role: invite.role,
        status: "active",
      });

      // Mark accepted
      await supabaseAdmin
        .from("tenant_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      redirect(`/dashboard/${invite.tenants.slug}`);
    } else {
      // Mismatched email -> force logout or ask them to sign in with the correct email
      return (
        <div className="min-h-screen bg-[#04050F] flex flex-col items-center justify-center text-white font-inter">
          <Logo size={36} withText={true} />
          <p className="mt-6 mb-4 text-center max-w-md">
            You are signed in as <b className="text-gray-300">{user.email}</b>, but this invitation is for <b className="text-gray-300">{invite.email}</b>.
          </p>
          <a href="/api/auth/signout" className="text-[#1E5FFF] hover:underline">
            Sign out
          </a>
        </div>
      );
    }
  } else {
    // Not signed in -> send to signup with token
    redirect(`/signup?invite=${token}`);
  }
}
