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
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.terms) {
      setError("You must agree to the terms.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
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
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-[#1E5FFF] focus:border-[#1E5FFF] sm:text-sm bg-[#1a1d2d] text-white"
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
                  className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-[#1E5FFF] focus:border-[#1E5FFF] sm:text-sm bg-[#1a1d2d] text-white"
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
                  className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-[#1E5FFF] focus:border-[#1E5FFF] sm:text-sm bg-[#1a1d2d] text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-[#1E5FFF] focus:border-[#1E5FFF] sm:text-sm bg-[#1a1d2d] text-white"
                />
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
                    className="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 focus:outline-none focus:ring-[#1E5FFF] focus:border-[#1E5FFF] sm:text-sm bg-[#1a1d2d] text-white"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                className="h-4 w-4 text-[#1E5FFF] focus:ring-[#1E5FFF] border-gray-700 rounded bg-[#1a1d2d]"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-300">
                I agree to the Terms of Service
              </label>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1E5FFF] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E5FFF] disabled:opacity-50"
              >
                {loading ? "Creating account..." : (inviteToken ? "Join Team" : "Get Started")}
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