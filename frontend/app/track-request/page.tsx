import { Crumbs } from "@/components/Blocks";
import TrackForm from "@/components/TrackForm";

export const metadata = { title: "Track Request" };

export default function Track() {
  return (
    <>
      <Crumbs items={[["Track Request"]]} />
      <div className="wrap hero" style={{ paddingBottom: 20 }}>
        <span className="label">Track request</span>
        <h1>Where is my request?</h1>
        <p className="lead">Enter the request number you received and the mobile number you used. It works from any phone or computer.</p>
      </div>
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <TrackForm />
        </div>
      </section>
    </>
  );
}
