import { BranchTiles, Crumbs } from "@/components/Blocks";

export const metadata = { title: "Our Locations" };

export default function Locations() {
  return (
    <>
      <Crumbs items={[["Our Locations"]]} />
      <div className="wrap hero page-head">
        <span className="label">Our locations</span>
        <h1>Six locations. One platform.</h1>
        <p className="lead">
          Legal Core serves Anantapur, Puttaparthi, Vijayawada, Visakhapatnam and Kurnool in Andhra Pradesh, and Hyderabad in Telangana. Each location page
          shows whether it is an operational office, a service area or a planned location.
        </p>
        <p className="muted">You never need to pick a branch. Requests are allocated internally based on workload, location and the expertise required.</p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <BranchTiles />
        </div>
      </section>
    </>
  );
}
