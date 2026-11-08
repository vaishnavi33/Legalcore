import { Band, BranchTiles, Fork, ServiceCards, Steps } from "@/components/Blocks";
import Builder from "@/components/Builder";
import SiteSearch from "@/components/SiteSearch";
import { SERVICES } from "@/lib/content";

export default function Home() {
  return (
    <>
      <div className="wrap hero">
        <span className="label">Andhra Pradesh &amp; Telangana · 6 branches</span>
        <h1>Your legal work. Simplified.</h1>
        <p className="lead">
          Professional legal documentation and support. We help lawyers prepare strong drafts and research, and we help people understand their legal problem and get advice
          from a qualified advocate.
        </p>
        <Builder />
        <div style={{ display: "grid", gap: 8, maxWidth: 640 }}>
          <span className="flabel">Or search for what you need</span>
          <SiteSearch big placeholder="Try: bail, land problem, rent agreement, cheque bounce, Kurnool" />
        </div>
      </div>
      <section className="blk" style={{ paddingTop: 8 }}>
        <div className="wrap">
          <Fork />
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Our services</span>
            <h2>One platform. Many legal services.</h2>
          </div>
          <ServiceCards list={SERVICES} />
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">How it works</span>
            <h2>Four steps, no legal jargon</h2>
          </div>
          <Steps />
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Our branch network</span>
            <h2>Six offices, one team</h2>
            <p className="muted">Every branch works on the same system, so your request is handled the same way wherever you start.</p>
          </div>
          <BranchTiles />
        </div>
      </section>
      <Band />
    </>
  );
}
