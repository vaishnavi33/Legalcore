import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ArticleCards, Crumbs } from "@/components/Blocks";
import { ARTICLE_ALIASES, ARTICLES, articleBySlug } from "@/lib/articles";
import { fmtDay } from "@/lib/api";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...ARTICLES.map((a) => ({ slug: a.slug })), ...Object.keys(ARTICLE_ALIASES).map((slug) => ({ slug }))];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articleBySlug(slug);
  return { title: a?.title || "Article", description: a?.summary };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (ARTICLE_ALIASES[slug]) permanentRedirect(`/knowledge/${ARTICLE_ALIASES[slug]}`);
  const a = articleBySlug(slug);
  if (!a) notFound();
  const related = a.related.map((r) => articleBySlug(r)).filter((x) => !!x);
  return (
    <>
      <Crumbs items={[["Knowledge Centre", "/knowledge"], [a.category]]} />
      <article className="wrap article">
        <header className="page-head">
          <span className="label">{a.category}</span>
          <h1>{a.title}</h1>
          <p className="lead">{a.summary}</p>
          <p className="meta">
            Last updated {fmtDay(a.updated)} ·{" "}
            {a.reviewedBy ? `Reviewed by ${a.reviewedBy}` : <span className="pending">Awaiting review by a qualified advocate</span>}
          </p>
        </header>
        <div className="article-body">
          <nav className="toc" aria-label="In this article">
            <span className="label">In this article</span>
            <ol>
              {a.sections.map((s, i) => (
                <li key={s.heading}>
                  <a href={`#s${i}`}>{s.heading}</a>
                </li>
              ))}
              <li>
                <a href="#faq">Frequently asked questions</a>
              </li>
              <li>
                <a href="#refs">References</a>
              </li>
            </ol>
          </nav>
          <div className="prose">
            {a.sections.map((s, i) => (
              <section key={s.heading} id={`s${i}`}>
                <h2>{s.heading}</h2>
                {s.paras?.map((p) => (
                  <p key={p}>{p}</p>
                ))}
                {s.points && (
                  <ul>
                    {s.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            <section id="faq">
              <h2>Frequently asked questions</h2>
              {a.faq.map(([q, ans]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{ans}</p>
                </details>
              ))}
            </section>
            <section id="refs">
              <h2>References</h2>
              <ul className="refs">
                {a.references.map((r) => (
                  <li key={r.title}>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        {r.title}
                      </a>
                    ) : (
                      r.title
                    )}
                  </li>
                ))}
              </ul>
              <p className="note">Statutes are available on India Code, the official repository of central legislation. State laws and rules may also apply.</p>
            </section>
            <div className="callout">
              <b>This is general information, not legal advice.</b> The law may have changed, and every situation is different. For advice on your matter, speak to a
              qualified advocate.
              <div className="btns" style={{ marginTop: 12 }}>
                <Link className="btn" href="/individuals/legal-opinion">
                  Ask for a legal opinion
                </Link>
                <Link className="btn ghost" href="/request">
                  Submit a request
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
      {related.length > 0 && (
        <section className="blk">
          <div className="wrap">
            <div className="sec-head">
              <span className="label">Related articles</span>
            </div>
            <ArticleCards list={related} />
          </div>
        </section>
      )}
    </>
  );
}
