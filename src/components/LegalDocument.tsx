import Link from "next/link";

export type LegalSection = {
  id: string;
  title: string;
  body: string[];
};

export function LegalDocument({
  kicker = "Legal",
  title,
  effective,
  updated,
  lead,
  sections,
  footerNote,
}: {
  kicker?: string;
  title: string;
  effective: string;
  updated?: string;
  lead: string;
  sections: LegalSection[];
  footerNote?: string;
}) {
  return (
    <main className="legal-page">
      <header className="legal-hero">
        <p className="legal-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="legal-meta">
          Effective: <strong>{effective}</strong>
          {updated ? (
            <>
              <span aria-hidden> · </span>
              Updated: <strong>{updated}</strong>
            </>
          ) : null}
          <span aria-hidden> · </span>
          Klasshi · klasshi.com
        </p>
        <p className="legal-lead">{lead}</p>
      </header>

      <nav className="legal-toc" aria-label="On this page">
        <h2>Contents</h2>
        <ol>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title.replace(/^\d+\.\s*/, "")}</a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="legal-body">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="legal-section">
            <h2>{s.title}</h2>
            {s.body.map((p) => (
              <p key={p.slice(0, 64)}>{p}</p>
            ))}
          </section>
        ))}
      </div>

      <footer className="legal-footer">
        {footerNote ? <p>{footerNote}</p> : null}
        <div className="legal-footer__actions">
          <Link href="/" className="btn btn--primary">
            Back to lobby
          </Link>
          <Link href="/support" className="btn">
            Contact support
          </Link>
          <Link href="/privacy" className="btn">
            Privacy
          </Link>
          <Link href="/terms" className="btn">
            Terms
          </Link>
        </div>
      </footer>
    </main>
  );
}
