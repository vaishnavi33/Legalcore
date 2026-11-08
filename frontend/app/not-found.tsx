import Link from "next/link";
import SiteSearch from "@/components/SiteSearch";

export default function NotFound() {
  return (
    <div className="wrap hero">
      <span className="label">Page not found</span>
      <h1>We could not find that page.</h1>
      <p className="lead">Search for what you need, or go back to the home page.</p>
      <div style={{ maxWidth: 640 }}>
        <SiteSearch big />
      </div>
      <div className="btns">
        <Link className="btn alt" href="/">
          Go to home
        </Link>
      </div>
    </div>
  );
}
