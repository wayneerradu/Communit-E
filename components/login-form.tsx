"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LOCAL_SUPERADMIN_EMAIL, LOCAL_SUPERADMIN_PASSWORD } from "@/lib/dev-auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(LOCAL_SUPERADMIN_EMAIL);
  const [password, setPassword] = useState(LOCAL_SUPERADMIN_PASSWORD);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    <form className="surface-panel" onSubmit={handleSubmit}>
      <div className="section-header">
        <div>
          <h2>Local Super Admin</h2>
          <p>Built for development so you can access the platform before live Google configuration is added.</p>
        </div>
        <span className="status-chip status-chip-success">Ready</span>
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
        <span>Password: {LOCAL_SUPERADMIN_PASSWORD}</span>
      </div>

      {message ? (
        <div className="flash-panel flash-panel-warning">
          <strong>{message}</strong>
        </div>
      ) : null}

      <div className="action-row">
        <button className="button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </form>
  );
}
