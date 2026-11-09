import Link from "next/link";
import { ARTICLES, type Article } from "@/lib/articles";
import { BRANCHES, PRIORITY_LABELS, type ServiceInfo } from "@/lib/content";
import { BuildingIcon, PersonIcon, ScaleIcon } from "./Icons";

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

export function PageHead({ label, title, lead, children }: { label?: string; title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="wrap hero page-head">
      {label && <span className="label">{label}</span>}
      <h1>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
      {children}
    </div>
  );
}

export function Fork() {
  return (
    <div className="fork">
      <Link className="path" href="/lawyers">
        <span className="ico">
          <ScaleIcon />
        </span>
        <h3>For Lawyers</h3>
        <p>Drafting, research, document preparation and case preparation support, prepared for you to review, settle and file.</p>
        <span className="go">Lawyer services →</span>
      </Link>
      <Link className="path client" href="/individuals">
        <span className="ico">
          <PersonIcon />
        </span>
        <h3>For Individuals</h3>
        <p>Legal opinions and consultations from qualified advocates, legal notices, agreements and help with property papers.</p>
        <span className="go">Get legal help →</span>
      </Link>
      <Link className="path biz" href="/businesses">
        <span className="ico">
          <BuildingIcon />
        </span>
        <h3>For Businesses</h3>
        <p>Business agreements, contracts, employment documentation and ongoing legal support for organisations.</p>
        <span className="go">Business services →</span>
      </Link>
    </div>
  );
}

const WHO_TAG: Record<string, [string, string]> = { lawyer: ["For lawyers", ""], individual: ["For individuals", "c"], business: ["For businesses", "b"] };

export function WhoTags({ who }: { who: ServiceInfo["who"] }) {
  return (
    <div className="tags">
      {who.map((w) => (
        <span key={w} className={`tag ${WHO_TAG[w][1]}`}>
          {WHO_TAG[w][0]}
        </span>
      ))}
    </div>
  );
}

export function ServiceCards({ list, hrefFor }: { list: ServiceInfo[]; hrefFor?: (s: ServiceInfo) => string }) {
  return (
    <div className="grid">
      {list.map((s) => (
        <Link className="card" href={hrefFor ? hrefFor(s) : `/services/${s.slug}`} key={s.slug}>
          <WhoTags who={s.who} />
          <h3>{s.name}</h3>
          <p className="muted">{s.short}</p>
          {s.advocate && <span className="note">Handled by a qualified advocate</span>}
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
          <span className="code">{b.state}</span>
          <strong>{b.name}</strong>
          <span className="te">{b.te}</span>
          <span className="more">View location →</span>
        </Link>
      ))}
    </div>
  );
}

export const PROCESS: [string, string][] = [
  ["Submit your request", "Use the online form, with or without an account. Attach whatever papers you have."],
  ["Request received", "You get a reference number straight away. Keep it to track your request."],
  ["Initial screening", "Our team reads your request to understand what is needed."],
  ["Information and document review", "We check the documents and ask for anything missing."],
  ["Professional assignment", "Staff allocate the work to a suitable professional, after a conflict-of-interest check."],
  ["Work in progress", "The drafting, research or documentation work is done."],
  ["Advocate review, where applicable", "Opinions, advice and other legal content are reviewed by a qualified advocate."],
  ["Final quality check", "We check the work for completeness and accuracy before it is released."],
  ["Completion and delivery", "You receive the final documents and can ask for revisions."],
];

export function Steps({ short = false }: { short?: boolean }) {
  const list = short ? [PROCESS[0], PROCESS[2], PROCESS[4], PROCESS[8]] : PROCESS;
  return (
    <ol className={`steps${short ? "" : " long"}`}>
      {list.map(([t, d]) => (
        <li key={t}>
          <b>{t}</b>
          <span>{d}</span>
        </li>
      ))}
    </ol>
  );
}

export function ArticleCards({ list = ARTICLES }: { list?: Article[] }) {
  return (
    <div className="grid">
      {list.map((a) => (
        <Link className="card" href={`/knowledge/${a.slug}`} key={a.slug}>
          <span className="tag c">{a.category}</span>
          <h3>{a.title}</h3>
          <p className="muted">{a.summary}</p>
          <span className="more">Read →</span>
        </Link>
      ))}
    </div>
  );
}

export function Band({ title = "Not sure which service you need?", text = "Describe your situation. Our team will review it and route it to the right service and professional.", href = "/individuals/legal-query", cta = "Describe your situation" }: { title?: string; text?: string; href?: string; cta?: string }) {
  return (
    <section className="blk">
      <div className="wrap">
        <div className="band">
          <div style={{ display: "grid", gap: 6 }}>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <Link className="btn" href={href}>
            {cta}
          </Link>
        </div>
      </div>
    </section>
  );
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  const cls =
    status === "SUBMITTED"
      ? "new"
      : ["INFORMATION_REQUIRED", "ON_HOLD", "REVISION_REQUIRED", "CLIENT_REVIEW"].includes(status)
        ? "wait"
        : status === "COMPLETED"
          ? "done"
          : status === "CANCELLED"
            ? "closed"
            : "";
  return <span className={`pill ${cls}`}>{label}</span>;
}

export function PriorityPill({ priority }: { priority: string }) {
  if (priority === "normal") return null;
  return <span className={`pill p-${priority}`}>{PRIORITY_LABELS[priority] || priority}</span>;
}
