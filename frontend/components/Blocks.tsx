import Link from "next/link";
import { BRANCHES, GUIDES, type ServiceInfo } from "@/lib/content";
import { ChatIcon, FileIcon } from "./Icons";

export function Crumbs({ items }: { items: [string, string?][] }) {
  return (
    <nav className="wrap crumbs" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {items.map(([t, h]) => (
        <span key={t}>
          {" / "}
          {h ? <Link href={h}>{t}</Link> : <span aria-current="page">{t}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Fork() {
  return (
    <div className="fork">
      <Link className="path" href="/lawyers">
        <span className="ico">
          <FileIcon />
        </span>
        <h3>For Lawyers</h3>
        <p>Case drafting, research, pleadings and documentation, ready for you to review and file.</p>
        <span className="te">న్యాయవాదుల కోసం</span>
        <span className="go">Submit a request →</span>
      </Link>
      <Link className="path client" href="/individuals">
        <span className="ico">
          <ChatIcon />
        </span>
        <h3>For Individuals</h3>
        <p>Legal queries, document help and consultations with a qualified advocate near you.</p>
        <span className="te">ప్రజల కోసం · న్యాయ సలహా</span>
        <span className="go">Get legal help →</span>
      </Link>
    </div>
  );
}

export function WhoTags({ who }: { who: ServiceInfo["who"] }) {
  return (
    <div className="tags">
      {who !== "individual" && <span className="tag">For lawyers</span>}
      {who !== "lawyer" && <span className="tag c">For individuals</span>}
    </div>
  );
}

export function ServiceCards({ list }: { list: ServiceInfo[] }) {
  return (
    <div className="grid">
      {list.map((s) => (
        <Link className="card" href={`/services/${s.slug}`} key={s.slug}>
          <WhoTags who={s.who} />
          <h3>{s.name}</h3>
          <p className="muted">{s.short}</p>
          <span className="more">Learn more →</span>
        </Link>
      ))}
    </div>
  );
}

export function BranchTiles() {
  return (
    <div className="grid3">
      {BRANCHES.map((b) => (
        <Link className="br" href={`/locations/${b.slug}`} key={b.slug}>
          <span className="code">
            {b.code} · {b.state}
          </span>
          <strong>{b.name}</strong>
          <span className="te">{b.te}</span>
          <span className="more">View branch →</span>
        </Link>
      ))}
    </div>
  );
}

export function Steps() {
  return (
    <ol className="steps">
      <li>
        <b>Tell us your need</b>
        <span>Fill one short form. Write in English or Telugu.</span>
      </li>
      <li>
        <b>We review it</b>
        <span>Your nearest branch checks the details and calls you within one working day.</span>
      </li>
      <li>
        <b>We do the work</b>
        <span>The right team drafts, researches or advises, and an advocate reviews legal content.</span>
      </li>
      <li>
        <b>You receive it</b>
        <span>Download your document or advice from your dashboard and track every step.</span>
      </li>
    </ol>
  );
}

export function GuideCards() {
  return (
    <div className="grid">
      {GUIDES.map((g) => (
        <Link className="card" href={`/knowledge/${g.slug}`} key={g.slug}>
          <span className="tag c">{g.tag}</span>
          <h3>{g.title}</h3>
          <span className="more">Read →</span>
        </Link>
      ))}
    </div>
  );
}

export function Band() {
  return (
    <section className="blk">
      <div className="wrap">
        <div className="band">
          <div style={{ display: "grid", gap: 6 }}>
            <h2>Not sure where to start?</h2>
            <p>Send a legal query. We will tell you which service fits.</p>
          </div>
          <Link className="btn" href="/individuals/legal-query">
            Ask a question
          </Link>
        </div>
      </div>
    </section>
  );
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  const cls = ["SUBMITTED"].includes(status)
    ? "new"
    : ["AWAITING_INFORMATION", "ON_HOLD", "PAYMENT_PENDING", "REVISION_REQUESTED"].includes(status)
      ? "wait"
      : ["COMPLETED", "CANCELLED", "REJECTED", "REFUND_PENDING"].includes(status)
        ? "closed"
        : "";
  return <span className={`pill ${cls}`}>{label}</span>;
}
