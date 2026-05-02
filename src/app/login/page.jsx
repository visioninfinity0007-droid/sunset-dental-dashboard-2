"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Logo from "@/components/Logo";

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,       setError]       = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      setIsSubmitting(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError) {
      setError(authError.message || "Incorrect email or password.");
      setIsSubmitting(false);
      return;
    }

    // Resolve which tenant to send them to
    const userId = data.user.id;
    const { data: membership, error: membershipError } = await supabase
      .from("tenant_members")
      .select("joined_at, tenants!inner(slug)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      console.error("Login tenant resolution error:", membershipError);
    }

    const slug = membership?.tenants?.slug;
    if (!slug) {
      console.error(`No active tenant found for user ${userId}. Query returned:`, membership);
      setError("No tenant found for this account. Contact support.");
      setIsSubmitting(false);
      return;
    }

    const nextPath = searchParams.get("next");
    router.replace(nextPath && nextPath.startsWith(`/dashboard/${slug}`)
      ? nextPath
      : `/dashboard/${slug}`);
  }

  return (
    <main className="login-shell">
      {/* ─── Left: Brand copy ──────────────────────────────────── */}
      <section className="login-copy">
        <div style={{ marginBottom: 24 }}>
          <Logo size={36} withText={true} />
        </div>
        <h1>Your AI-powered business dashboard.</h1>
        <p className="lede">
          Real-time leads, bookings, and pipeline health — all in one place.
          Log in to see your personalised dashboard.
        </p>

        <div className="feature-stack">
          <article className="feature-card">
            <strong>📊 Real-time lead intelligence</strong>
            <p>See hot leads, booked appointments, and conversion rate the moment your bot captures them.</p>
          </article>
          <article className="feature-card">
            <strong>🎯 Full pipeline visibility</strong>
            <p>Track every lead from first message through appointment confirmation and outcome.</p>
          </article>
          <article className="feature-card">
            <strong>🔒 Your data, only yours</strong>
            <p>Each login gives you access only to your own dashboard. Private and secure.</p>
          </article>
        </div>
      </section>

      {/* ─── Right: Login panel ────────────────────────────────── */}
      <section className="login-panel">
        <div className="login-panel-inner">
          <span className="panel-kicker">Client portal</span>
          <h2>Sign in</h2>
          <p className="panel-copy">
            Enter your credentials to access your dashboard.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                autoComplete="email"
                className="text-input disabled:opacity-50"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                type="email"
                value={email}
                disabled={isSubmitting}
              />
            </label>

            <label className="field relative block">
              <span>Password</span>
              <div className="relative">
                <input
                  autoComplete="current-password"
                  className="text-input w-full pr-10 disabled:opacity-50"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </label>

            {error ? <p className="form-error" role="alert">{error}</p> : null}

            <button className="primary-button disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2" disabled={isSubmitting} type="submit">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : "Open my dashboard →"}
            </button>
          </form>

          <p style={{ fontSize: 11, color: "var(--stone-400)", marginTop: 24, textAlign: "center" }}>
            Powered by Vision Infinity · Confidential
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
