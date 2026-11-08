import Link from "next/link";
import { Crumbs } from "@/components/Blocks";
import SiteSearch from "@/components/SiteSearch";
import { search } from "@/lib/content";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q || "").slice(0, 80);
  const results = search(q, 20);
  return (
    <>
      <Crumbs items={[["Search"]]} />
      <div className="wrap hero" style={{ paddingBottom: 16 }}>
        <h1>{q ? <>Results for “{q}”</> : "Search Legal Core"}</h1>
        <div style={{ maxWidth: 640 }}>
          <SiteSearch big />
        </div>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap grid">
          {results.map((r) => (
            <Link className="card" href={r.href} key={r.href + r.title}>
              <span className="note">{r.hint}</span>
              <h3>{r.title}</h3>
              <span className="more">Open →</span>
            </Link>
          ))}
          {q && results.length === 0 && (
            <div className="card">
              <h3>We could not find a page for that.</h3>
              <p className="muted">Tell us your problem in your own words and we will guide you.</p>
              <Link className="btn" href="/individuals/legal-query">
                Ask a legal question
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
