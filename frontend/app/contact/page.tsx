import Link from "next/link";
import { BranchTiles, Crumbs } from "@/components/Blocks";
import { SITE } from "@/lib/site";

export const metadata = { title: "Contact Us" };

function V({ v, href }: { v: string; href?: string }) {
  if (!v) return <span className="placeholder">Not yet published</span>;
  return href ? (
    <a href={href} style={{ fontSize: "1.1rem", fontWeight: 600 }}>
      {v}
    </a>
  ) : (
    <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>{v}</span>
  );
}

export default function Contact() {
  return (
    <>
      <Crumbs items={[["Contact Us"]]} />
      <div className="wrap hero page-head">
        <span className="label">Contact us</span>
        <h1>Get in touch</h1>
        <p className="lead">The quickest way to reach the right person is to submit a request. Our team reviews every request and contacts you.</p>
        <div className="btns">
          <Link className="btn" href="/request">
            Submit a request
          </Link>
          <Link className="btn ghost" href="/track-request">
            Track a request
          </Link>
        </div>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap grid">
          <div className="card">
            <span className="label">Phone</span>
            <V v={SITE.phone} href={SITE.phone ? `tel:${SITE.phone.replace(/\s/g, "")}` : undefined} />
            {SITE.hours && <span className="note">{SITE.hours}</span>}
          </div>
          <div className="card">
            <span className="label">Email</span>
            <V v={SITE.email} href={SITE.email ? `mailto:${SITE.email}` : undefined} />
          </div>
          <div className="card">
            <span className="label">WhatsApp</span>
            <V v={SITE.whatsapp} />
          </div>
        </div>
        <p className="wrap note" style={{ marginTop: 14 }}>
          Please do not send confidential documents by email or WhatsApp. Upload them through the request form, which stores them privately.
        </p>
      </section>
      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Locations</span>
            <h2>Where we serve</h2>
          </div>
          <BranchTiles />
        </div>
      </section>
    </>
  );
}
