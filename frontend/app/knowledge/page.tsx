import { Crumbs, GuideCards } from "@/components/Blocks";

export const metadata = { title: "Knowledge Centre" };

export default function Knowledge() {
  return (
    <>
      <Crumbs items={[["Knowledge Centre"]]} />
      <div className="wrap hero">
        <span className="label">Knowledge Centre</span>
        <h1>Legal basics in plain words</h1>
        <p className="lead">Short guides on common problems. They are general information, not advice for your case.</p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <GuideCards />
        </div>
      </section>
    </>
  );
}
