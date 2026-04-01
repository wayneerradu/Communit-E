import Link from "next/link";

export default function HomePage() {
  return (
    <main className="main">
      <section className="hero-card">
        <div className="page-header">
          <div>
            <h1>CommUNIT-E</h1>
            <p>Admin-first municipal coordination with residents, projects, infrastructure, PR, and donor workflows in one place.</p>
          </div>
          <Link href="/login" className="help-button" aria-label="Open login">
            Go
          </Link>
        </div>

        <div className="status-strip">
          <span>Admin Hub</span>
          <span>Residents Hub</span>
          <span>Faults Hub</span>
          <span>Infrastructure Hub</span>
          <span>Projects Hub</span>
          <span>PRO Hub</span>
        </div>
      </section>
    </main>
  );
}

