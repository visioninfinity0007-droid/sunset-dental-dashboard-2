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

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
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
                className="text-input"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                type="email"
                value={email}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                className="text-input"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
              />
            </label>

            {error ? <p className="form-error" role="alert">{error}</p> : null}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in…" : "Open my dashboard →"}
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
