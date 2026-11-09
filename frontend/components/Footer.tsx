import Link from "next/link";
import { NAV } from "@/lib/nav";
import { Logo } from "./Icons";

export default function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot-brand">
          <Link className="brand" href="/" aria-label="Legal Core home">
            <Logo size={36} />
            <span>
              <b>Legal Core</b>
            </span>
          </Link>
          <p>Professional legal support, documentation and coordination for lawyers, individuals and businesses.</p>
        </div>
        <div className="cols">
          {NAV.slice(0, 4).map((g) => (
            <div key={g.title}>
              <h4>{g.title}</h4>
              {g.items
                .filter(([, h]) => h !== "/track-request")
                .slice(0, 6)
                .map(([t, h]) => (
                  <Link key={t} href={h}>
                    {t}
                  </Link>
                ))}
            </div>
          ))}
          <div>
            <h4>Legal Core</h4>
            <Link href="/about">About Us</Link>
            <Link href="/how-it-works">How It Works</Link>
            <Link href="/locations">Our Locations</Link>
            <Link href="/knowledge">Knowledge Centre</Link>
            <Link href="/track-request">Track Request</Link>
            <Link href="/contact">Contact Us</Link>
          </div>
          <div>
            <h4>Your data</h4>
            <Link href="/privacy">Privacy Notice</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy#rights">Access, correction and deletion</Link>
            <Link href="/privacy#grievance">Grievances</Link>
          </div>
        </div>
        <div className="disclaimer">
          <span>© {new Date().getFullYear()} Legal Core. Serving Anantapur, Puttaparthi, Vijayawada, Visakhapatnam, Kurnool and Hyderabad.</span>
          <span>
            Legal Core is a legal support and coordination agency. It is not a law firm and does not advertise or solicit work for advocates. Legal
            opinions, legal advice and representation are provided only by appropriately qualified advocates, subject to applicable Indian law and
            professional rules. Information on this website is general and is not legal advice. No outcome is guaranteed.
          </span>
        </div>
      </div>
    </footer>
  );
}
