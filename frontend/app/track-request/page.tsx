import { Crumbs } from "@/components/Blocks";
import TrackForm from "@/components/TrackForm";

export const metadata = { title: "Track Request" };

export default function Track() {
  return (
    <>
      <Crumbs items={[["Track Request"]]} />
      <div className="wrap hero page-head" style={{ paddingBottom: 20 }}>
        <span className="label">Track request</span>
        <h1>Where is my request?</h1>
        <p className="lead">Enter your reference number and the mobile number you used. We then send you a one-time code so that only you can see your request.</p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <TrackForm />
        </div>
      </section>
    </>
  );
}
