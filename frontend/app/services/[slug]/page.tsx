import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs, Steps } from "@/components/Blocks";
import { FeeText } from "@/components/Live";
import RequestForm from "@/components/RequestForm";
import { SERVICES, serviceBySlug } from "@/lib/content";

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
  const audience = s.who === "lawyer" ? "lawyer" : "individual";
  return (
    <>
      <Crumbs items={[["Legal Services", "/services"], [s.name]]} />
      <div className="wrap hero">
        <span className="label">{s.who === "lawyer" ? "For lawyers" : s.who === "individual" ? "For individuals" : "For lawyers and individuals"}</span>
        <h1>{s.name}</h1>
        <p className="lead">{s.short}</p>
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
              <Steps />
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
              <span className="label">Usual time</span>
              <span>{s.time}</span>
            </div>
            <div>
              <span className="label">Fees</span>
              <FeeText slug={s.slug} />
            </div>
            <Link className="btn" href="#request">
              Request this service
            </Link>
          </div>
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <RequestForm audience={audience} service={s.slug} title={`Request ${s.name}`} lockAudience={s.who !== "both"} />
        </div>
      </section>
    </>
  );
}
