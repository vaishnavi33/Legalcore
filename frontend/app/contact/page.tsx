import { BranchTiles, Crumbs } from "@/components/Blocks";
import RequestForm from "@/components/RequestForm";
import { SITE } from "@/lib/site";

export const metadata = { title: "Contact" };

function V({ v, f }: { v: string; f: string }) {
  return <span style={{ fontSize: "1.15rem", fontWeight: 600, userSelect: "all" }}>{v || <span className="placeholder">{f}</span>}</span>;
}

export default function Contact() {
  return (
    <>
      <Crumbs items={[["Contact"]]} />
      <div className="wrap hero">
        <span className="label">Contact</span>
        <h1>Talk to us</h1>
        <p className="lead">Call, message or visit any branch. Or send a request and we will call you.</p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap grid">
          <div className="card">
            <span className="label">Phone</span>
            <V v={SITE.phone} f="+91 00000 00000" />
            <span className="note">{SITE.hours}</span>
          </div>
          <div className="card">
            <span className="label">Email</span>
            <V v={SITE.email} f="hello@legalcore.in" />
            <span className="note">We reply within one working day</span>
          </div>
          <div className="card">
            <span className="label">WhatsApp</span>
            <V v={SITE.whatsapp} f="+91 00000 00000" />
            <span className="note">Send a message any time</span>
          </div>
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Branches</span>
            <h2>Visit a branch</h2>
          </div>
          <BranchTiles />
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <RequestForm service="legal-query" title="Send us a message" />
        </div>
      </section>
    </>
  );
}
