"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [formData, setFormData] = useState({
    businessName: "",
    fullName: "",
    email: "",
    password: "",
    phone: "",
    terms: false,
    privacy: false,
    dpa: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.terms || !formData.privacy || !formData.dpa) {
      setError("You must agree to all legal agreements.");
      return;
    }

    setLoading(true);

    try {
        fullName: formData.fullName,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        acceptedTerms: formData.terms,
        acceptedPrivacy: formData.privacy,
        acceptedDPA: formData.dpa,
      };

      if (inviteToken) {
        payload.inviteToken = inviteToken;
      } else {
        payload.businessName = formData.businessName;
        payload.phone = formData.phone;
      }

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Signup failed.");
      }

      router.push(data.redirectTo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#04050F] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-inter">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Logo size={36} withText={true} />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white font-poppins">
          {inviteToken ? "Join Your Team" : "Create your account"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Or{" "}
          <a href="/login" className="font-medium text-[#1E5FFF] hover:text-blue-400">
            sign in to your existing account
          </a>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#0f111a] py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!inviteToken && (
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-300">
                  Business Name
                </label>
                <div className="mt-1">
                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    disabled={loading}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-[#1E5FFF] focus:border-[#1E5FFF] sm:text-sm bg-[#1a1d2d] text-white disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-300">
                Your Name
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-[#1E5FFF] focus:border-[#1E5FFF] sm:text-sm bg-[#1a1d2d] text-white disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-[#1E5FFF] focus:border-[#1E5FFF] sm:text-sm bg-[#1a1d2d] text-white disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-[#1E5FFF] focus:border-[#1E5FFF] sm:text-sm bg-[#1a1d2d] text-white disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {!inviteToken && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                  Phone number for WhatsApp (Optional)
                </label>
                <div className="mt-1">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={loading}
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-[#1E5FFF] focus:border-[#1E5FFF] sm:text-sm bg-[#1a1d2d] text-white disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" required checked={formData.terms} onChange={(e) => setFormData({ ...formData, terms: e.target.checked })} disabled={loading} className="h-4 w-4 text-[#1E5FFF] focus:ring-[#1E5FFF] border-gray-700 rounded bg-[#1a1d2d] disabled:opacity-50" />
                <span className="ml-2 text-sm text-gray-300">I agree to the <a href="/terms" target="_blank" className="text-blue-500 underline">Terms of Service</a></span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" required checked={formData.privacy} onChange={(e) => setFormData({ ...formData, privacy: e.target.checked })} disabled={loading} className="h-4 w-4 text-[#1E5FFF] focus:ring-[#1E5FFF] border-gray-700 rounded bg-[#1a1d2d] disabled:opacity-50" />
                <span className="ml-2 text-sm text-gray-300">I agree to the <a href="/privacy" target="_blank" className="text-blue-500 underline">Privacy Policy</a></span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" required checked={formData.dpa} onChange={(e) => setFormData({ ...formData, dpa: e.target.checked })} disabled={loading} className="h-4 w-4 text-[#1E5FFF] focus:ring-[#1E5FFF] border-gray-700 rounded bg-[#1a1d2d] disabled:opacity-50" />
                <span className="ml-2 text-sm text-gray-300">I agree to the <a href="/dpa" target="_blank" className="text-blue-500 underline">Data Processing Agreement</a></span>
              </label>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1E5FFF] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E5FFF] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </>
                ) : (inviteToken ? "Join Team" : "Get Started")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#04050F] flex items-center justify-center text-white">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}