import { BRANCHES } from "./content";
import { AUD_BASE, FORM_PAGES } from "./forms";

type Item = [string, string];
export interface NavGroup {
  title: string;
  items: Item[];
  all: Item;
}

const pick = (aud: "lawyer" | "individual" | "business", slugs: string[]): Item[] =>
  slugs.map((s) => {
    const p = FORM_PAGES[aud].find((x) => x.slug === s)!;
    return [p.title, `${AUD_BASE[aud]}/${p.slug}`];
  });

// Purpose-based menus, in the order the business asked for.
export const NAV: NavGroup[] = [
  {
    title: "Legal Services",
    items: [
      ["Case Drafting", "/services/case-drafting"],
      ["Legal Research", "/services/legal-research"],
      ["Legal Documentation", "/services/legal-documentation"],
      ["Agreement Drafting", "/services/agreement-drafting"],
      ["Legal Notices", "/services/legal-notices"],
      ["Document Assistance", "/services/document-assistance"],
      ["Advocate Consultation", "/services/advocate-consultation"],
      ["Other Services", "/services/other"],
    ],
    all: ["All services", "/services"],
  },
  {
    title: "For Lawyers",
    items: [...pick("lawyer", ["drafting", "research", "documents", "case-preparation", "document-review"]), ["Track Request", "/track-request"]],
    all: ["Lawyer services", "/lawyers"],
  },
  {
    title: "For Individuals",
    items: [...pick("individual", ["request", "legal-opinion", "legal-notice", "agreement", "property", "document-review", "consultation"]), ["Track Request", "/track-request"]],
    all: ["Help for individuals", "/individuals"],
  },
  {
    title: "For Businesses",
    items: pick("business", ["agreements", "contracts", "documentation", "employment", "support", "legal-notice", "other"]),
    all: ["Business services", "/businesses"],
  },
  { title: "Our Locations", items: BRANCHES.map((b) => [b.name, `/locations/${b.slug}`]), all: ["All locations", "/locations"] },
];

// Plain links, shown in the top bar on wide screens and inside the menu on small screens.
export const UTILITY: Item[] = [
  ["Home", "/"],
  ["About Us", "/about"],
  ["How It Works", "/how-it-works"],
  ["Knowledge Centre", "/knowledge"],
  ["Contact Us", "/contact"],
];
