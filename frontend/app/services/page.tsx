import { Band, Crumbs, ServiceCards } from "@/components/Blocks";
import { SERVICES } from "@/lib/content";

export const metadata = { title: "Legal Services" };

export default function Services() {
  return (
    <>
      <Crumbs items={[["Legal Services"]]} />
      <div className="wrap hero page-head">
        <span className="label">Legal services</span>
        <h1>What we can help with</h1>
        <p className="lead">Choose a service to see what is included, who it is for, what to keep ready and common questions. Legal Core coordinates each request; legal advice and opinions come only from qualified advocates.</p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <ServiceCards list={SERVICES} />
        </div>
      </section>
      <Band />
    </>
  );
}
