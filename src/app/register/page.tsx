"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        // Flatten Zod field errors into a readable string
        if (data.errors) {
          const msgs = Object.values(data.errors as Record<string, string[]>)
            .flat()
            .join(" • ");
          setError(msgs);
        } else {
          setError(data.message || "Registration failed.");
        }
        return;
      }

      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));

      setSuccess("Account created! Redirecting to dashboard…");
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch {
      setError("Network error — please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const field =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/20 border border-brand-500/30">
            <span className="text-2xl text-brand-400">⬡</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-100">Create account</h1>
          <p className="mt-1 text-sm text-gray-500">Join Primetrade today</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          {error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Full Name
              </label>
              <input
                type="text"
                className="input-base"
                placeholder="Alice Smith"
                required
                value={form.name}
                onChange={field("name")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Email address
              </label>
              <input
                type="email"
                className="input-base"
                placeholder="you@example.com"
                required
                value={form.email}
                onChange={field("email")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Password
              </label>
              <input
                type="password"
                className="input-base"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                required
                value={form.password}
                onChange={field("password")}
              />
              <p className="mt-1.5 text-xs text-gray-600">
                Must be at least 8 characters with one uppercase letter and one number.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Role
              </label>
              <select
                className="input-base"
                value={form.role}
                onChange={field("role")}
              >
                <option value="user">User — standard access</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>

            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-brand-400 hover:text-brand-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
