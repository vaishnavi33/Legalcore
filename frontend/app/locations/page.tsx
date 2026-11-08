import { BranchTiles, Crumbs } from "@/components/Blocks";

export const metadata = { title: "Our Locations" };

export default function Locations() {
  return (
    <>
      <Crumbs items={[["Our Locations"]]} />
      <div className="wrap hero">
        <span className="label">Our locations</span>
        <h1>Six branches. One team.</h1>
        <p className="lead">Visit any branch or send a request online. All branches share one system, so your request can move to another branch if that helps you.</p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <BranchTiles />
        </div>
      </section>
    </>
  );
}
