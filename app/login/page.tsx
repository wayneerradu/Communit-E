import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="main">
      <section className="hero-card" style={{ maxWidth: 560, justifySelf: "center", width: "100%" }}>
        <div className="page-header">
          <div>
            <h1>Sign in to CommUNIT-E</h1>
            <p>Use the local Super Admin account for development now, then switch to Google Workspace SSO when deployment settings are ready.</p>
          </div>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}

