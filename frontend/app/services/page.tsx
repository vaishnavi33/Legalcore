import { Band, Crumbs, ServiceCards } from "@/components/Blocks";
import { SERVICES } from "@/lib/content";

export const metadata = { title: "Legal Services" };

export default function Services() {
  return (
    <>
      <Crumbs items={[["Legal Services"]]} />
      <div className="wrap hero">
        <span className="label">Legal services</span>
        <h1>What we can help with</h1>
        <p className="lead">Choose a service to see what is included, what to keep ready, how long it takes and common questions.</p>
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
