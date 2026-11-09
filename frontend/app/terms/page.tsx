import Link from "next/link";
import { Crumbs } from "@/components/Blocks";

export const metadata = { title: "Terms of Service" };

export default function Terms() {
  return (
    <>
      <Crumbs items={[["Terms of Service"]]} />
      <article className="wrap article">
        <header className="page-head">
          <span className="label">Terms</span>
          <h1>Terms of Service</h1>
          <p className="meta">
            Last updated 9 November 2026 · <span className="pending">Draft: to be reviewed by a qualified advocate before launch</span>
          </p>
        </header>
        <div className="prose" style={{ maxWidth: "72ch" }}>
          <h2>Our role</h2>
          <p>
            Legal Core is a legal support and coordination agency. It is not a law firm. It coordinates drafting professionals and qualified advocates for the work
            you request. Professional legal opinions, legal advice and representation are provided only by appropriately qualified advocates, subject to
            applicable Indian law and the rules of the Bar Council of India and the State Bar Councils.
          </p>
          <h2>Submitting a request</h2>
          <ul>
            <li>You can submit a request with or without an account.</li>
            <li>Submitting a request does not by itself create an engagement. Our team reviews each request and tells you whether and how we can help.</li>
            <li>The needed-by date you give is a preference. Timelines are confirmed after screening and are not guaranteed.</li>
            <li>Please give accurate information and only upload documents you are entitled to share.</li>
          </ul>
          <h2>No guaranteed outcomes</h2>
          <p>Legal Core does not guarantee the outcome of any matter, case or negotiation.</p>
          <h2>Lawyer users</h2>
          <p>
            When Legal Core supports a lawyer, the lawyer remains responsible for the matter, for reviewing all work and for anything filed or sent. A Bar Council
            enrolment number given in a request is not treated as verified until Legal Core completes a separate verification.
          </p>
          <h2>Accounts and security</h2>
          <p>Keep your password private. Tell us immediately if you think someone else has used your account.</p>
          <h2>Your data</h2>
          <p>
            Our <Link href="/privacy">Privacy Notice</Link> explains how we handle personal data.
          </p>
        </div>
      </article>
    </>
  );
}
