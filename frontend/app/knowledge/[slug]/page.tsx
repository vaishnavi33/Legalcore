import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs } from "@/components/Blocks";
import { GUIDES } from "@/lib/content";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  return { title: g?.title || "Guide" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) notFound();
  return (
    <>
      <Crumbs items={[["Knowledge Centre", "/knowledge"], [g.tag]]} />
      <article className="wrap hero" style={{ maxWidth: 820 }}>
        <span className="label">{g.tag} guide</span>
        <h1>{g.title}</h1>
        <ol style={{ display: "grid", gap: 12, paddingLeft: "1.3em", fontSize: "1.08rem" }}>
          {g.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="note">General information only. Every case is different, so speak to an advocate about yours.</p>
        <div className="btns">
          <Link className="btn" href="/individuals/legal-query">
            Ask about my case
          </Link>
          <Link className="btn ghost" href="/knowledge">
            More guides
          </Link>
        </div>
      </article>
    </>
  );
}
