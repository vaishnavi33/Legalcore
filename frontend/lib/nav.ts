import { BRANCHES, SERVICES } from "./content";

type Item = [string, string];
interface NavGroup {
  title: string;
  items: Item[];
  all: Item;
}

export const NAV: NavGroup[] = [
  { title: "Legal Services", items: SERVICES.filter((s) => s.slug !== "advocate-consultation").map((s) => [s.name, `/services/${s.slug}`]), all: ["All services", "/services"] },
  {
    title: "For Lawyers",
    items: [
      ["Submit Drafting Request", "/lawyers/drafting"],
      ["Request Legal Research", "/lawyers/research"],
      ["Document Preparation", "/lawyers/documents"],
      ["Track Request", "/track-request"],
    ],
    all: ["Lawyer services", "/lawyers"],
  },
  {
    title: "For Individuals",
    items: [
      ["Submit Legal Query", "/individuals/legal-query"],
      ["Document Assistance", "/individuals/documents"],
      ["Request Advocate Consultation", "/individuals/consultation"],
      ["Track Request", "/track-request"],
    ],
    all: ["Help for individuals", "/individuals"],
  },
  { title: "Our Locations", items: BRANCHES.map((b) => [b.name, `/locations/${b.slug}`]), all: ["All branches", "/locations"] },
];

