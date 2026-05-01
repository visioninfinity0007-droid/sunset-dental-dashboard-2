"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Logo from "@/components/Logo";

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [error,       setError]       = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      setIsSubmitting(false);
      return;
    }

    const res = await fetch("/api/auth", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: email.trim(), password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "Incorrect email or password.");
      setIsSubmitting(false);
      return;
    }

    // Server returns the slug → go directly to that client's dashboard
    const slug     = data.slug;
    const nextPath = searchParams.get("next");

    // Honour ?next= only if it belongs to their slug
    if (nextPath && nextPath.startsWith(`/dashboard/${slug}`)) {
      router.replace(nextPath);
    } else {
      router.replace(`/dashboard/${slug}`);
    }
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
