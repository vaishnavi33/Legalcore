import { BranchTiles, Crumbs } from "@/components/Blocks";

export const metadata = { title: "About Us" };

export default function About() {
  return (
    <>
      <Crumbs items={[["About Us"]]} />
      <div className="wrap hero">
        <span className="label">About Legal Core</span>
        <h1>Legal support that people can understand.</h1>
        <p className="lead">
          Legal Core is a legal documentation and support agency with six branches across Andhra Pradesh and Telangana. We work on two sides of the same problem: lawyers
          need well-prepared drafts and research, and people need clear, honest guidance.
        </p>
      </div>
      <section className="blk">
        <div className="wrap grid">
          <div className="card">
            <span className="tag">How we work</span>
            <h3>Drafting support for advocates</h3>
            <p className="muted">Our drafting team prepares pleadings, research and documents. The advocate who instructs us reviews, signs and files the work.</p>
          </div>
          <div className="card">
            <span className="tag c">How we work</span>
            <h3>Advice from qualified advocates</h3>
            <p className="muted">Legal opinions and consultations for individuals are given only by qualified advocates, after a conflict check.</p>
          </div>
          <div className="card">
            <span className="tag">Our promise</span>
            <h3>Your matter stays private</h3>
            <p className="muted">Only the team assigned to your request can see your papers. Branches do not see each other&apos;s matters unless one is transferred to them.</p>
          </div>
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Where we are</span>
            <h2>Our six branches</h2>
          </div>
          <BranchTiles />
        </div>
      </section>
    </>
  );
}
