import Link from "next/link";
import { Crumbs, ServiceCards } from "@/components/Blocks";
import { SERVICES } from "@/lib/content";

export const metadata = { title: "For Lawyers" };

const CARDS: [string, string, string][] = [
  ["/lawyers/drafting", "Submit Drafting Request", "Plaints, written statements, writs, appeals and bail applications."],
  ["/lawyers/research", "Request Legal Research", "Judgments and statutes on your legal point, with checked citations."],
  ["/lawyers/documents", "Document Preparation", "Affidavits, vakalats, agreements and notices for your clients."],
  ["/track-request", "Track Request", "See where your request is, using your request number."],
];

export default function Lawyers() {
  return (
    <>
      <Crumbs items={[["For Lawyers"]]} />
      <div className="wrap hero">
        <span className="label">For lawyers</span>
        <h1>Spend less time drafting, more time in court.</h1>
        <p className="lead">Send us the facts and your instructions. We return a draft in your court&apos;s format for you to review and file. You stay counsel on record.</p>
        <div className="btns">
          <Link className="btn alt" href="/lawyers/drafting">
            Submit drafting request
          </Link>
          <Link className="btn ghost" href="/dashboard">
            Go to my dashboard
          </Link>
        </div>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap grid">
          {CARDS.map(([h, t, d]) => (
            <Link className="card" href={h} key={h}>
              <h3>{t}</h3>
              <p className="muted">{d}</p>
              <span className="more">Open →</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Services for lawyers</span>
            <h2>Pick a service</h2>
          </div>
          <ServiceCards list={SERVICES.filter((s) => s.who !== "individual")} />
        </div>
      </section>
    </>
  );
}
