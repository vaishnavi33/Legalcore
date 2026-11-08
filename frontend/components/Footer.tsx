import Link from "next/link";
import { NAV } from "@/lib/nav";

export default function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="cols">
          {NAV.map((g) => (
            <div key={g.title}>
              <h4>{g.title}</h4>
              {g.items
                .filter(([, h]) => h !== "/track-request")
                .map(([t, h]) => (
                  <Link key={t} href={h}>
                    {t}
                  </Link>
                ))}
            </div>
          ))}
          <div>
            <h4>Help</h4>
            <Link href="/track-request">Track Request</Link>
            <Link href="/knowledge">Knowledge Centre</Link>
            <Link href="/about">About Us</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/login">Sign In</Link>
          </div>
        </div>
        <div className="disclaimer">
          <span>© {new Date().getFullYear()} Legal Core. Anantapur · Puttaparthi · Vijayawada · Visakhapatnam · Kurnool · Hyderabad</span>
          <span>
            Disclaimer: this website shares general information about our services. It is not an advertisement or solicitation, and nothing here is legal
            advice. Legal opinions are given only by qualified advocates after reviewing your matter.
          </span>
        </div>
      </div>
    </footer>
  );
}
