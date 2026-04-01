"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCAL_SUPERADMIN_EMAIL } from "@/lib/dev-auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(LOCAL_SUPERADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setIsGoogleSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/google/start");
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to start Google sign-in.");
      }
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start Google sign-in.");
      setIsGoogleSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to sign in.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dashboard-stack">
      <section className="surface-panel">
        <div className="section-header">
          <div>
            <h2>Google Workspace Sign-In</h2>
            <p>Admins and office bearers sign in through Google Workspace for verification and access control.</p>
          </div>
          <span className="status-chip status-chip-success">Recommended</span>
        </div>
        <div className="action-row">
          <button className="button-primary" type="button" onClick={handleGoogleSignIn} disabled={isGoogleSubmitting}>
            {isGoogleSubmitting ? "Redirecting..." : "Continue with Google Workspace"}
          </button>
        </div>
      </section>

      <form className="surface-panel" onSubmit={handleSubmit}>
        <div className="section-header">
          <div>
            <h2>Local Super Admin Fallback</h2>
            <p>Use only for local development fallback.</p>
          </div>
          <span className="status-chip status-chip-warning">Dev Only</span>
        </div>

        <div className="form-grid">
          <label className="field field-wide">
            <span>Email Address</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" />
          </label>
          <label className="field field-wide">
            <span>Password</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
        </div>

        <div className="meta-row">
          <span>Local email: {LOCAL_SUPERADMIN_EMAIL}</span>
          <span>Password must be entered manually</span>
        </div>

        <div className="action-row">
          <button className="button-secondary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Use Local Fallback"}
          </button>
        </div>
      </form>

      {message ? (
        <div className="flash-panel flash-panel-warning">
          <strong>{message}</strong>
        </div>
      ) : null}
    </div>
  );
}
