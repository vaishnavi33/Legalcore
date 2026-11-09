import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs } from "@/components/Blocks";
import { BranchContact } from "@/components/Live";
import { BRANCHES, branchBySlug } from "@/lib/content";
import { NAV } from "@/lib/nav";

export const dynamicParams = false;

export function generateStaticParams() {
  return BRANCHES.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const b = branchBySlug((await params).slug);
  return { title: b ? `${b.name}, ${b.state}` : "Location" };
}

export default async function BranchPage({ params }: { params: Promise<{ slug: string }> }) {
  const b = branchBySlug((await params).slug);
  if (!b) notFound();
  const services = NAV[0].items;
  return (
    <>
      <Crumbs items={[["Our Locations", "/locations"], [b.name]]} />
      <div className="wrap hero page-head">
        <span className="label">{b.state}</span>
        <h1>Legal Core, {b.name}</h1>
        <p className="te" style={{ fontSize: "1.15rem" }}>
          {b.te}
        </p>
        <p className="lead">
          All Legal Core locations use the same central platform and one common sign-in. You do not need to choose a branch: send your request online and our
          team allocates it internally.
        </p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap split">
          <BranchContact slug={b.slug} name={b.name} state={b.state} />
          <div className="card">
            <h3>Services</h3>
            <p className="muted">Every Legal Core service is available to people in {b.name}.</p>
            <ul>
              {services.map(([t, h]) => (
                <li key={h}>
                  <Link href={h}>{t}</Link>
                </li>
              ))}
            </ul>
            <Link className="btn" href="/request">
              Submit a request
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
