import type { Aud } from "@/lib/content";
import { Crumbs } from "./Blocks";
import RequestForm from "./RequestForm";

export default function FormPage({
  title,
  lead,
  crumbs,
  audience,
  service,
  aside,
}: {
  title: string;
  lead: string;
  crumbs: [string, string?][];
  audience: Aud;
  service: string;
  aside?: React.ReactNode;
}) {
  return (
    <>
      <Crumbs items={crumbs} />
      <div className="wrap hero page-head">
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
        {aside}
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <RequestForm audience={audience} service={service} lockAudience title="Your request" />
        </div>
      </section>
    </>
  );
}
