import { Crumbs } from "@/components/Blocks";
import RequestForm from "@/components/RequestForm";

export const metadata = { title: "Submit a Legal Request", description: "Send a request to Legal Core without creating an account." };

export default function Page() {
  return (
    <>
      <Crumbs items={[["Submit a request"]]} />
      <div className="wrap hero page-head">
        <span className="label">No account needed</span>
        <h1>Submit a legal request</h1>
        <p className="lead">Tell us who you are and what you need. Our team reviews every request and allocates it to the right professional.</p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <RequestForm title="Your request" />
        </div>
      </section>
    </>
  );
}
