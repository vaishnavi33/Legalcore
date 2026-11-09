import { Crumbs } from "@/components/Blocks";
import KnowledgeList from "@/components/KnowledgeList";

export const metadata = { title: "Knowledge Centre", description: "General legal information on cheques, promissory notes, legal notices, land documents and Zero FIRs in India." };

export default function Knowledge() {
  return (
    <>
      <Crumbs items={[["Knowledge Centre"]]} />
      <div className="wrap hero page-head">
        <span className="label">Knowledge Centre</span>
        <h1>Legal information in plain language</h1>
        <p className="lead">Practical articles on common legal topics in India, with references to the law. They are general information, not legal advice for your situation.</p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <KnowledgeList />
        </div>
      </section>
    </>
  );
}
