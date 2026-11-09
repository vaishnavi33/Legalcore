import Link from "next/link";
import { notFound } from "next/navigation";
import { type Aud, servicesFor } from "@/lib/content";
import { AUD_BASE, FORM_PAGES } from "@/lib/forms";
import { Band, Crumbs, ServiceCards, Steps } from "./Blocks";
import FormPage from "./FormPage";

const TITLES: Record<Aud, string> = { lawyer: "For Lawyers", individual: "For Individuals", business: "For Businesses" };

const COPY: Record<Aud, { label: string; h1: string; lead: string; points: string[] }> = {
  lawyer: {
    label: "For lawyers and advocates",
    h1: "Dependable support for your practice.",
    lead: "Send your instructions and papers. Legal Core coordinates drafting, research and preparation, and returns the work for you to review, settle and file. You remain counsel on record.",
    points: ["Your instructions drive the work", "Papers seen only by the assigned team", "Draft versions and comments in one place", "Track every request and deadline"],
  },
  individual: {
    label: "For individuals and families",
    h1: "Clear help with a legal matter.",
    lead: "Tell us what is happening. We work out what you need and coordinate the right professional. Legal opinions and advice are given only by qualified advocates.",
    points: ["No account needed to start", "Write in English or Telugu", "Opinions only from qualified advocates", "Track your request securely"],
  },
  business: {
    label: "For businesses and organisations",
    h1: "Legal documentation that keeps pace with your business.",
    lead: "Agreements, contracts, employment documents and routine legal support, coordinated by one team with a clear record of every request.",
    points: ["One place for all requests", "Version history for every document", "Advocate review where needed", "Status updates as work moves"],
  },
};

export function AudienceLanding({ aud }: { aud: Aud }) {
  const c = COPY[aud];
  const pages = FORM_PAGES[aud];
  const base = AUD_BASE[aud];
  return (
    <>
      <Crumbs items={[[TITLES[aud]]]} />
      <div className="wrap hero page-head">
        <span className="label">{c.label}</span>
        <h1>{c.h1}</h1>
        <p className="lead">{c.lead}</p>
        <ul className="ticks inline">
          {c.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <div className="btns">
          <Link className="btn" href={`${base}/${pages[0].slug}`}>
            {pages[0].title}
          </Link>
          <Link className="btn ghost" href="/track-request">
            Track a request
          </Link>
        </div>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Start a request</span>
            <h2>What do you need?</h2>
          </div>
          <div className="grid">
            {pages.map((p) => (
              <Link className="card" href={`${base}/${p.slug}`} key={p.slug}>
                <h3>{p.title}</h3>
                <p className="muted">{p.lead}</p>
                <span className="more">Open form →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Services</span>
            <h2>About each service</h2>
          </div>
          <ServiceCards list={servicesFor(aud)} />
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">How it works</span>
            <h2>From request to delivery</h2>
            <p className="muted">
              <Link href="/how-it-works">See the full process</Link>
            </p>
          </div>
          <Steps short />
        </div>
      </section>
      {aud !== "lawyer" && <Band href={`${base}/${aud === "business" ? "other" : "legal-query"}`} />}
    </>
  );
}

export function audienceParams(aud: Aud) {
  return FORM_PAGES[aud].map((p) => ({ slug: p.slug }));
}

export function audienceMeta(aud: Aud, slug: string) {
  const p = FORM_PAGES[aud].find((x) => x.slug === slug);
  return { title: p?.title || TITLES[aud], description: p?.lead };
}

export function AudienceForm({ aud, slug }: { aud: Aud; slug: string }) {
  const p = FORM_PAGES[aud].find((x) => x.slug === slug);
  if (!p) notFound();
  return <FormPage title={p.title} lead={p.lead} crumbs={[[TITLES[aud], AUD_BASE[aud]], [p.title]]} audience={aud} service={p.service} />;
}
