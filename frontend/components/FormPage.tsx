import { Crumbs } from "./Blocks";
import RequestForm from "./RequestForm";

export default function FormPage({
  title,
  lead,
  crumbs,
  audience,
  service,
}: {
  title: string;
  lead: string;
  crumbs: [string, string?][];
  audience: "lawyer" | "individual";
  service: string;
}) {
  return (
    <>
      <Crumbs items={crumbs} />
      <div className="wrap hero" style={{ paddingBottom: 20 }}>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <RequestForm audience={audience} service={service} lockAudience title={title} />
        </div>
      </section>
    </>
  );
}
