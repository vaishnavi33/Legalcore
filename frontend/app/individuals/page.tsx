import Link from "next/link";
import { Crumbs, GuideCards } from "@/components/Blocks";

export const metadata = { title: "For Individuals" };

const CARDS: [string, string, string][] = [
  ["/individuals/legal-query", "Submit Legal Query", "Tell us your problem in your own words. We reply with next steps."],
  ["/individuals/documents", "Document Assistance", "Get papers explained, checked or prepared."],
  ["/individuals/consultation", "Request Advocate Consultation", "Speak to a qualified advocate, in person or on the phone."],
  ["/track-request", "Track Request", "Check the status using your request number."],
];

export default function Individuals() {
  return (
    <>
      <Crumbs items={[["For Individuals"]]} />
      <div className="wrap hero">
        <span className="label">For individuals</span>
        <h1>Have a legal problem? Start here.</h1>
        <p className="lead">You do not need to know legal words. Tell us what happened, and a qualified advocate from your nearest branch will guide you.</p>
        <p className="te">మీ సమస్యను మీ మాటల్లో చెప్పండి. మేము సహాయం చేస్తాము.</p>
        <div className="btns">
          <Link className="btn" href="/individuals/legal-query">
            Ask a legal question
          </Link>
          <Link className="btn ghost" href="/track-request">
            Track a request
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
            <span className="label">Plain-language guides</span>
            <h2>Read before you visit</h2>
          </div>
          <GuideCards />
        </div>
      </section>
    </>
  );
}
