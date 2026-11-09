import Link from "next/link";
import { Crumbs, PROCESS } from "@/components/Blocks";

export const metadata = { title: "How It Works", description: "The Legal Core process from request to delivery." };

export default function HowItWorks() {
  return (
    <>
      <Crumbs items={[["How It Works"]]} />
      <div className="wrap hero page-head">
        <span className="label">How it works</span>
        <h1>From your request to completed work</h1>
        <p className="lead">
          Legal Core coordinates the service from start to finish. Professional legal advice and representation are provided by qualified advocates where
          applicable.
        </p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <ol className="process">
            {PROCESS.map(([t, d], i) => (
              <li key={t}>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{t}</h2>
                  <p>{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="blk">
        <div className="wrap grid">
          <div className="card">
            <h3>Do I need an account?</h3>
            <p className="muted">No. You can submit a request as a guest and track it with your reference number and a one-time code. An account is optional and keeps all your requests together.</p>
          </div>
          <div className="card">
            <h3>Do I choose a branch?</h3>
            <p className="muted">No. Our team allocates each request internally based on workload, location, the service needed and professional availability.</p>
          </div>
          <div className="card">
            <h3>Will my work be done by the date I choose?</h3>
            <p className="muted">We note the date you need and confirm realistic timelines after screening. If there is an urgent court deadline, say so in your description.</p>
          </div>
        </div>
      </section>
      <section className="blk">
        <div className="wrap btns">
          <Link className="btn" href="/request">
            Submit a request
          </Link>
          <Link className="btn ghost" href="/track-request">
            Track a request
          </Link>
        </div>
      </section>
    </>
  );
}
