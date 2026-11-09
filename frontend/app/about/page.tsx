import Link from "next/link";
import { BranchTiles, Crumbs } from "@/components/Blocks";

export const metadata = { title: "About Us" };

export default function About() {
  return (
    <>
      <Crumbs items={[["About Us"]]} />
      <div className="wrap hero page-head">
        <span className="label">About Legal Core</span>
        <h1>A legal support and coordination agency.</h1>
        <p className="lead">
          Legal Core solutions is a legal support and coordination agency operating in India. We serve lawyers and advocates, individuals and members of the public,
          and businesses and organisations.
        </p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap split">
          <div className="prose" style={{ maxWidth: "68ch" }}>
            <h2>What we do</h2>
            <p>
              Legal Core receives requests for legal assistance, understands the requirement, coordinates the appropriate drafting professionals or qualified
              advocates, manages the documents, monitors progress and communicates with the customer until the requested work is completed.
            </p>
            <h2>What we are not</h2>
            <p>
              Legal Core is not a law firm, and it is not a marketplace where customers browse and hire lawyers. Not everyone who works at Legal Core is an advocate.
              Professional legal opinions, legal advice and representation are provided only by appropriately qualified advocates, subject to applicable Indian law
              and professional rules. We do not promise or guarantee outcomes.
            </p>
            <h2>How we protect your matter</h2>
            <ul>
              <li>Only staff assigned to your request can see its papers. Access to another branch&apos;s matters must be authorised and is recorded.</li>
              <li>Before a matter is assigned, staff carry out a conflict-of-interest check.</li>
              <li>Documents are stored privately and opened only through short-lived, permission-checked links.</li>
              <li>Internal notes are never shown to customers.</li>
            </ul>
          </div>
          <div className="card">
            <span className="label">Start here</span>
            <h3>Have a legal requirement?</h3>
            <p className="muted">Submit a request online. You do not need an account.</p>
            <Link className="btn" href="/request">
              Submit a request
            </Link>
            <Link href="/how-it-works">How it works →</Link>
          </div>
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Where we serve</span>
            <h2>Our locations</h2>
          </div>
          <BranchTiles />
        </div>
      </section>
    </>
  );
}
