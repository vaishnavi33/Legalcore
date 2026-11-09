import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs, Steps } from "@/components/Blocks";
import RequestForm from "@/components/RequestForm";
import { SERVICES, serviceBySlug } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const s = serviceBySlug((await params).slug);
  return { title: s?.name || "Service", description: s?.short };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const s = serviceBySlug((await params).slug);
  if (!s) notFound();
  const audience = s.who.includes("individual") ? "individual" : s.who[0];
  const whoText = s.who.map((w) => (w === "lawyer" ? "lawyers" : w === "individual" ? "individuals" : "businesses")).join(", ").replace(/, ([^,]*)$/, " and $1");
  return (
    <>
      <Crumbs items={[["Legal Services", "/services"], [s.name]]} />
      <div className="wrap hero page-head">
        <span className="label">For {whoText}</span>
        <h1>{s.name === "Other" ? "Other Services" : s.name}</h1>
        <p className="lead">{s.short}</p>
        {s.advocate && (
          <p className="callout">
            This service is handled by an appropriately qualified advocate. Legal Core coordinates the request and does not itself give legal advice.
          </p>
        )}
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap split">
          <div style={{ display: "grid", gap: 28, minWidth: 0 }}>
            <div className="card">
              <h3>What is included</h3>
              <ul>
                {s.includes.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={{ marginBottom: 14 }}>How it works</h3>
              <Steps short />
            </div>
            <div>
              <h3 style={{ marginBottom: 6 }}>Common questions</h3>
              {s.faq.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="card facts">
            <div>
              <span className="label">Who it is for</span>
              <span>{s.eligibility}</span>
            </div>
            <div>
              <span className="label">What to keep ready</span>
              <ul style={{ paddingLeft: "1.1em" }}>
                {s.keepReady.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="label">Timing</span>
              <span>Confirmed by our team after your request is screened.</span>
            </div>
            <Link className="btn" href="#request">
              Request this service
            </Link>
          </div>
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <RequestForm audience={audience} service={s.slug} title={s.slug === "other" ? "Tell us what you need" : `Request ${s.name}`} lockAudience={s.who.length === 1} />
        </div>
      </section>
    </>
  );
}
