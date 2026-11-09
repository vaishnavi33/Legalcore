import Link from "next/link";
import { ArticleCards, Band, BranchTiles, Fork, Steps } from "@/components/Blocks";
import Builder from "@/components/Builder";
import { ClockIcon, FileIcon, ShieldIcon } from "@/components/Icons";
import SiteSearch from "@/components/SiteSearch";
import { ARTICLES } from "@/lib/articles";

export default function Home() {
  return (
    <>
      <section className="masthead">
        <div className="wrap masthead-in">
          <div className="mh-copy">
            <span className="label">Legal support &amp; coordination · Andhra Pradesh and Telangana</span>
            <h1>
              Your legal work.
              <br />
              <em>Simplified.</em>
            </h1>
            <p className="lead">Professional legal support, documentation and coordination for lawyers, individuals and businesses.</p>
            <div className="btns">
              <Link className="btn" href="/request">
                Submit a request
              </Link>
              <Link className="btn ghost" href="/how-it-works">
                How it works
              </Link>
            </div>
            <p className="note">No account needed. Track your request with your reference number and a one-time code.</p>
          </div>
          <div className="mh-side">
            <Builder />
            <div style={{ display: "grid", gap: 8 }}>
              <span className="flabel">Or search</span>
              <SiteSearch big placeholder="Try: legal opinion, rent agreement, cheque bounce" />
            </div>
          </div>
        </div>
      </section>

      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Who we serve</span>
            <h2>One platform for three kinds of legal work</h2>
          </div>
          <Fork />
        </div>
      </section>

      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">How Legal Core works</span>
            <h2>A managed service, not a marketplace</h2>
            <p className="muted">
              You do not browse or hire lawyers here. You tell us what you need; we understand the requirement, coordinate the right drafting professional or qualified
              advocate, manage the documents, and keep you informed until the work is complete.
            </p>
          </div>
          <div className="pillars">
            <div>
              <FileIcon />
              <h3>One request, one record</h3>
              <p>Every message, document and status change is kept against your request reference.</p>
            </div>
            <div>
              <ShieldIcon />
              <h3>Qualified advocates for advice</h3>
              <p>Legal opinions, advice and representation are provided only by appropriately qualified advocates.</p>
            </div>
            <div>
              <ClockIcon />
              <h3>Clear progress</h3>
              <p>See where your request stands at each step, from screening to delivery.</p>
            </div>
          </div>
          <div style={{ marginTop: 36 }}>
            <Steps short />
          </div>
          <p style={{ marginTop: 20 }}>
            <Link href="/how-it-works">See all nine steps →</Link>
          </p>
        </div>
      </section>

      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Knowledge Centre</span>
            <h2>Understand the basics</h2>
          </div>
          <ArticleCards list={ARTICLES.slice(0, 3)} />
          <p style={{ marginTop: 18 }}>
            <Link href="/knowledge">All articles →</Link>
          </p>
        </div>
      </section>

      <section className="blk">
        <div className="wrap">
          <div className="sec-head">
            <span className="label">Our locations</span>
            <h2>Serving six cities from one platform</h2>
            <p className="muted">You never need to choose a branch. Our team allocates each request internally.</p>
          </div>
          <BranchTiles />
        </div>
      </section>
      <Band />
    </>
  );
}
