import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs } from "@/components/Blocks";
import { BranchContact } from "@/components/Live";
import RequestForm from "@/components/RequestForm";
import { BRANCHES, SERVICES, branchBySlug } from "@/lib/content";

export function generateStaticParams() {
  return BRANCHES.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const b = branchBySlug((await params).slug);
  return { title: b ? `${b.name} branch` : "Branch" };
}

export default async function BranchPage({ params }: { params: Promise<{ slug: string }> }) {
  const b = branchBySlug((await params).slug);
  if (!b) notFound();
  return (
    <>
      <Crumbs items={[["Our Locations", "/locations"], [b.name]]} />
      <div className="wrap hero">
        <span className="label">
          {b.code} · {b.state}
        </span>
        <h1>Legal Core {b.name}</h1>
        <p className="te" style={{ fontSize: "1.2rem" }}>
          {b.te}
        </p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap split">
          <BranchContact slug={b.slug} name={b.name} state={b.state} />
          <div className="card">
            <h3>Services at this branch</h3>
            <ul>
              {SERVICES.map((s) => (
                <li key={s.slug}>
                  <Link href={`/services/${s.slug}?branch=${b.slug}#request`}>{s.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="blk">
        <div className="wrap">
          <RequestForm branch={b.slug} title={`Send a request to ${b.name}`} />
        </div>
      </section>
    </>
  );
}
