import { ARTICLES } from "./articles";

// Website text that does not change often. Branch addresses and phone numbers come from the API, so administrators
// can update them without a code change. Nothing here promises timelines or outcomes: those are confirmed after screening.

export type Aud = "lawyer" | "individual" | "business";

export const AUDIENCES: { key: Aud; label: string; short: string; path: string }[] = [
  { key: "individual", label: "Individual", short: "I need legal help for myself or my family", path: "/individuals" },
  { key: "lawyer", label: "Lawyer or advocate", short: "I am a lawyer and need support on a matter", path: "/lawyers" },
  { key: "business", label: "Business or organisation", short: "I need legal support for a business", path: "/businesses" },
];

export interface ServiceInfo {
  slug: string;
  name: string;
  who: Aud[];
  short: string;
  includes: string[];
  eligibility: string;
  keepReady: string[];
  faq: [string, string][];
  keywords: string[];
  advocate?: boolean; // handled by a qualified advocate
}

const L: Aud = "lawyer";
const I: Aud = "individual";
const B: Aud = "business";

export const SERVICES: ServiceInfo[] = [
  {
    slug: "case-drafting",
    name: "Case Drafting",
    who: [L],
    short: "Drafting support for plaints, written statements, petitions, appeals and applications, prepared to your instructions.",
    includes: ["Plaints and suits", "Written statements and counters", "Writ petitions and appeals", "Bail and anticipatory bail applications", "Interlocutory applications"],
    eligibility: "Advocates and law firms. You remain counsel on record and settle, sign and file the final draft.",
    keepReady: ["Brief facts and chronology", "Existing pleadings, orders or notices", "Court and case number, if filed", "Any deadline, mentioned in the description"],
    faq: [
      ["Who signs the draft?", "You do. Legal Core prepares a draft to your instructions; you review, edit and sign it as counsel on record."],
      ["Can the draft follow my court's format?", "Yes. Tell us the court and any local practice requirements in your request."],
      ["Who sees my client's papers?", "Only the Legal Core team members assigned to your request."],
    ],
    keywords: ["draft", "drafting", "plaint", "suit", "written statement", "counter", "writ", "petition", "appeal", "bail", "anticipatory", "pleading", "interlocutory", "ia", "revision"],
  },
  {
    slug: "legal-research",
    name: "Legal Research",
    who: [L],
    short: "Research on statutes and case law for a specific legal question, with sources you can check.",
    includes: ["Judgments on a specific legal point", "Statute and amendment history", "Research note with sources", "Comparison of differing rulings"],
    eligibility: "Advocates, law firms and in-house legal teams.",
    keepReady: ["The exact legal question", "Relevant facts", "Court or jurisdiction"],
    faq: [
      ["Will I get the sources?", "Yes. Research notes list the judgments and provisions relied on, so you can verify them yourself before use."],
      ["Which courts are covered?", "Tell us the forum. Research can cover the Supreme Court and the High Courts relevant to your matter."],
    ],
    keywords: ["research", "case law", "judgment", "judgement", "citation", "precedent", "statute", "memo", "ruling"],
  },
  {
    slug: "case-preparation",
    name: "Case Preparation Assistance",
    who: [L],
    short: "Help organising case papers: chronologies, lists of dates, document indexes and compilations.",
    includes: ["Chronology and list of dates", "Document index and paginated compilations", "Summaries of evidence or depositions", "Checklists for filing"],
    eligibility: "Advocates and law firms.",
    keepReady: ["Case papers you want organised", "Court and next hearing date, if any", "What you need prepared"],
    faq: [["Do you appear in court?", "No. Legal Core provides preparation support only. Appearance and representation remain with the advocate on record."]],
    keywords: ["chronology", "list of dates", "compilation", "index", "paper book", "preparation", "brief"],
  },
  {
    slug: "legal-documentation",
    name: "Legal Documentation",
    who: [L, I, B],
    short: "Affidavits, deeds, powers of attorney and other legal documents, prepared from your details.",
    includes: ["Affidavits and declarations", "Sale, gift and settlement deeds", "Wills", "Powers of attorney", "Board resolutions and authorisations"],
    eligibility: "Lawyers, individuals and businesses.",
    keepReady: ["Identity details of the people involved", "Property or account details, if any", "Earlier documents linked to this one"],
    faq: [
      ["Do you register documents?", "Legal Core prepares documents. Where registration is needed, we explain what the Sub-Registrar office will ask for."],
      ["Can documents be prepared in Telugu?", "Yes, documents can be prepared in English or Telugu."],
    ],
    keywords: ["affidavit", "vakalat", "sale deed", "deed", "will", "gift", "settlement", "power of attorney", "gpa", "spa", "documentation", "document", "resolution"],
  },
  {
    slug: "agreement-drafting",
    name: "Agreement Drafting",
    who: [L, I, B],
    short: "Rental, partnership, service, loan and settlement agreements written in clear terms.",
    includes: ["Rental and lease agreements", "Partnership deeds", "Service agreements", "Loan and settlement agreements", "Memorandums of understanding"],
    eligibility: "Individuals, businesses and lawyers.",
    keepReady: ["Names and addresses of all parties", "Key terms: amount, period, conditions", "Any draft you already have"],
    faq: [
      ["Is stamp duty included?", "No. Stamp duty depends on the document and the state. We tell you what applies; it is paid when the document is executed."],
      ["Can you review an agreement someone gave me?", "Yes. Choose Document Review and attach the agreement."],
    ],
    keywords: ["agreement", "contract", "rent", "rental", "lease", "partnership", "loan", "mou", "settlement"],
  },
  {
    slug: "legal-notices",
    name: "Legal Notice Assistance",
    who: [L, I, B],
    short: "Legal notices and replies for money recovery, cheque dishonour, property, tenancy and other disputes.",
    includes: ["Cheque dishonour notices", "Money recovery notices", "Property and tenancy notices", "Consumer notices", "Replies to notices you have received"],
    eligibility: "Anyone. Notices for individuals and businesses are issued through a qualified advocate.",
    keepReady: ["Copy of the cheque, bill or agreement", "Dates of key events", "Full address of the other party", "Any notice you received, with the envelope"],
    advocate: true,
    faq: [
      ["I received a notice. What now?", "Do not ignore it. Note the date you received it, keep the envelope and send us a copy. Many notices give a fixed time to reply."],
      ["Are there time limits?", "Some notices have strict statutory time limits, for example in cheque dishonour cases. Mention any dates clearly in your request."],
    ],
    keywords: ["notice", "legal notice", "cheque", "check", "bounce", "recovery", "money", "dues", "tenant", "eviction", "reply"],
  },
  {
    slug: "document-assistance",
    name: "Document Assistance",
    who: [I],
    short: "Help reading, organising and completing legal and government papers.",
    includes: ["Explaining a document in simple words", "Organising papers for a matter", "Filling government and court forms"],
    eligibility: "Individuals and families.",
    keepReady: ["The documents you need help with", "What you plan to do (sign, submit, file)"],
    faq: [["Do I need to visit an office?", "No. You can upload clear photos or scans of your papers and speak to us by phone."]],
    keywords: ["explain", "form", "fill", "papers", "help with documents"],
  },
  {
    slug: "legal-opinion",
    name: "Legal Opinion",
    who: [I, B],
    short: "A written professional opinion from a qualified advocate, after the advocate has reviewed your facts and documents.",
    includes: ["Opinion on rights and options in a dispute", "Opinion on a property's papers", "Opinion on an agreement or proposed transaction", "Opinion on a notice you received"],
    eligibility: "Individuals and businesses. Opinions are given only by qualified advocates.",
    keepReady: ["A clear description of the facts", "All related documents", "The specific questions you want answered"],
    advocate: true,
    faq: [
      ["Who gives the opinion?", "A qualified advocate who reviews your facts and documents. Legal Core coordinates the request; it does not give the opinion itself."],
      ["Is the opinion generated by a computer?", "No. Legal Core does not present automated or AI-generated text as an advocate's opinion."],
      ["Does an opinion guarantee a result?", "No. An opinion is a professional view based on the facts and documents provided. It is not a guarantee of any outcome."],
    ],
    keywords: ["opinion", "legal opinion", "advice", "view", "rights", "title opinion"],
  },
  {
    slug: "advocate-consultation",
    name: "Advocate Consultation",
    who: [I, B],
    short: "We arrange a consultation with a qualified advocate suited to your matter, in person or by phone.",
    includes: ["Land and property disputes", "Family matters", "Police complaints and criminal matters", "Money recovery", "Employment and consumer problems"],
    eligibility: "Anyone who needs advice on a legal problem.",
    keepReady: ["A short note on what happened", "Any papers you have, even photos"],
    advocate: true,
    faq: [
      ["Who will I speak to?", "A qualified advocate. Legal Core arranges the consultation; the advice is the advocate's."],
      ["Can I bring a family member?", "Yes, you can bring someone you trust."],
    ],
    keywords: ["advocate", "lawyer", "consult", "consultation", "advice", "meet", "appointment", "divorce", "marriage", "maintenance", "custody", "property", "land", "dispute", "police", "fir", "arrest", "job", "consumer"],
  },
  {
    slug: "legal-query",
    name: "Legal Consultation Coordination",
    who: [I, B],
    short: "Not sure what you need? Describe your situation and we will work out the right service and professional.",
    includes: ["Understanding your requirement", "Identifying the documents needed", "Arranging the right professional or advocate"],
    eligibility: "Anyone.",
    keepReady: ["A short description of your situation", "Any papers you have"],
    advocate: true,
    faq: [["Will you give me legal advice?", "Legal advice is given only by qualified advocates. Our team helps route your matter to the right person."]],
    keywords: ["question", "query", "ask", "help", "problem", "doubt", "not sure", "సహాయం", "సలహా"],
  },
  {
    slug: "property-documentation",
    name: "Property Documentation Assistance",
    who: [I],
    short: "Help gathering and organising land and property papers, and preparing property-related documents.",
    includes: ["Collecting and organising title papers", "Preparing applications for records", "Drafting property-related documents", "Arranging title verification by an advocate"],
    eligibility: "Individuals and families.",
    keepReady: ["Sale deeds and earlier title documents", "Encumbrance certificate, if available", "Revenue records and tax receipts", "Survey and boundary details"],
    faq: [["Is this a title investigation?", "No. A title investigation and opinion must be done by a qualified advocate. Choose Legal Opinion if you need one."]],
    keywords: ["land", "plot", "property", "encumbrance", "ec", "survey", "title", "patta", "passbook", "mutation", "registration"],
  },
  {
    slug: "case-documentation",
    name: "Case-related Documentation",
    who: [I],
    short: "Help organising the papers for a case you are part of, so your advocate has what they need.",
    includes: ["Collecting and indexing case papers", "Preparing a list of dates", "Copies and translations of documents"],
    eligibility: "Individuals who are part of a court case or proceeding.",
    keepReady: ["Court papers you have", "Name of your advocate, if any", "Next hearing date, if any"],
    faq: [["Will Legal Core represent me?", "No. Representation in court is by an advocate. Legal Core can help coordinate."]],
    keywords: ["case papers", "court case", "hearing", "summons", "court documents"],
  },
  {
    slug: "document-review",
    name: "Document Review",
    who: [L, I, B],
    short: "Review of an agreement, notice or other document, with points to consider before you sign or respond.",
    includes: ["Agreements and contracts", "Notices received", "Draft deeds", "Policies and terms"],
    eligibility: "Lawyers, individuals and businesses.",
    keepReady: ["The document to be reviewed", "What you plan to do with it", "Any concerns you already have"],
    faq: [["Is a review the same as a legal opinion?", "No. For a professional legal opinion, choose Legal Opinion, which is given by a qualified advocate."]],
    keywords: ["review", "check", "vet", "verify", "read", "before signing"],
  },
  {
    slug: "business-agreements",
    name: "Business Agreements",
    who: [B],
    short: "Vendor, supplier, distribution, service and partnership agreements for your business.",
    includes: ["Vendor and supplier agreements", "Distribution and agency agreements", "Service agreements", "Partnership and LLP agreements", "Non-disclosure agreements"],
    eligibility: "Businesses, firms, companies and organisations.",
    keepReady: ["Names and registration details of the parties", "Commercial terms agreed", "Any existing draft or earlier agreement"],
    faq: [["Can you work from our template?", "Yes. Attach your template and tell us what needs to change."]],
    keywords: ["vendor", "supplier", "distribution", "agency", "nda", "business agreement", "llp"],
  },
  {
    slug: "contract-drafting",
    name: "Contract Drafting Assistance",
    who: [B],
    short: "Drafting and redrafting of commercial contracts to your agreed terms.",
    includes: ["New contracts from agreed terms", "Redrafting and clean-up of existing contracts", "Schedules and annexures", "Amendment agreements"],
    eligibility: "Businesses and organisations.",
    keepReady: ["Term sheet or summary of agreed terms", "Existing contract, if any", "Deadline, mentioned in the description"],
    faq: [["Do you negotiate with the other side?", "No. Legal Core supports drafting. Negotiation and advice are for your team or your advocate."]],
    keywords: ["contract", "commercial", "drafting", "amendment", "terms"],
  },
  {
    slug: "employment-documentation",
    name: "Employment Documentation",
    who: [B],
    short: "Appointment letters, employment agreements, policies and other HR documents.",
    includes: ["Appointment letters and employment agreements", "Confidentiality and non-solicitation terms", "HR policies", "Relieving and experience letters"],
    eligibility: "Employers of any size.",
    keepReady: ["Company details", "Roles and terms of employment", "Existing letters or policies"],
    faq: [["Will the documents cover labour law compliance?", "Tell us your state and industry. Compliance questions are referred to a qualified advocate."]],
    keywords: ["employment", "appointment letter", "offer letter", "hr", "policy", "employee", "staff"],
  },
  {
    slug: "business-legal-support",
    name: "Business Legal Support",
    who: [B],
    short: "Ongoing documentation and coordination support for a business's routine legal work.",
    includes: ["Routine documentation", "Organising legal records", "Coordinating with your advocates", "Tracking notices and replies"],
    eligibility: "Businesses and organisations.",
    keepReady: ["A description of the support you need", "Any documents involved"],
    faq: [["Is this a retainer?", "Tell us what you need. Scope and arrangements are discussed after screening."]],
    keywords: ["business support", "company", "firm", "startup", "msme", "routine", "compliance"],
  },
  {
    slug: "other",
    name: "Other",
    who: [L, I, B],
    short: "Need something not listed? Tell us what you require and our team will review it.",
    includes: ["Any legal support or documentation requirement not listed elsewhere"],
    eligibility: "Lawyers, individuals and businesses.",
    keepReady: ["A clear description of what you need", "Any documents you have"],
    faq: [["Will you accept every request?", "Our team reviews each request and will tell you whether and how we can help."]],
    keywords: ["other", "something else", "not listed"],
  },
];

export const LEGAL_QUERY = { slug: "legal-query", name: "Legal Consultation Coordination" };

export function servicesFor(aud: Aud): ServiceInfo[] {
  return SERVICES.filter((s) => s.who.includes(aud));
}

export interface BranchInfo {
  slug: string;
  code: string;
  name: string;
  te: string;
  state: string;
}

export const BRANCHES: BranchInfo[] = [
  { slug: "anantapur", code: "ATP", name: "Anantapur", te: "అనంతపురం", state: "Andhra Pradesh" },
  { slug: "puttaparthi", code: "PTP", name: "Puttaparthi", te: "పుట్టపర్తి", state: "Andhra Pradesh" },
  { slug: "vijayawada", code: "VJA", name: "Vijayawada", te: "విజయవాడ", state: "Andhra Pradesh" },
  { slug: "visakhapatnam", code: "VSP", name: "Visakhapatnam", te: "విశాఖపట్నం", state: "Andhra Pradesh" },
  { slug: "kurnool", code: "KNL", name: "Kurnool", te: "కర్నూలు", state: "Andhra Pradesh" },
  { slug: "hyderabad", code: "HYD", name: "Hyderabad", te: "హైదరాబాద్", state: "Telangana" },
];

export const TOPICS = ["Land / property", "Family / marriage", "Money / cheque", "Police / criminal", "Job / consumer", "Something else"];

export interface SearchEntry {
  title: string;
  href: string;
  hint: string;
  keywords: string[];
}

export const QUICK_LINKS: SearchEntry[] = [
  { title: "Submit a legal request", href: "/request", hint: "No account needed", keywords: ["submit", "request", "help", "start", "new", "form"] },
  { title: "Submit a drafting request", href: "/lawyers/drafting", hint: "For lawyers", keywords: ["submit draft", "drafting request", "lawyer", "advocate", "counsel"] },
  { title: "Request legal research", href: "/lawyers/research", hint: "For lawyers", keywords: ["research request"] },
  { title: "Ask for a legal opinion", href: "/individuals/legal-opinion", hint: "From a qualified advocate", keywords: ["opinion", "advice"] },
  { title: "Business legal request", href: "/businesses", hint: "For businesses", keywords: ["business", "company", "firm", "employer", "msme", "startup"] },
  { title: "Book an advocate consultation", href: "/individuals/consultation", hint: "For individuals", keywords: ["book", "appointment", "meet", "talk", "consult"] },
  { title: "Track my request", href: "/track-request", hint: "Reference number and one-time code", keywords: ["track", "status", "where", "request number", "reference", "progress", "otp"] },
  { title: "How it works", href: "/how-it-works", hint: "Our process", keywords: ["how", "process", "steps", "works"] },
  { title: "Sign in or create account", href: "/login", hint: "Optional. One account for everyone", keywords: ["login", "log in", "sign in", "account", "register", "sign up", "password"] },
  { title: "Contact us", href: "/contact", hint: "Get in touch", keywords: ["contact", "phone", "call", "email", "whatsapp", "number"] },
  { title: "Privacy notice", href: "/privacy", hint: "How we handle your data", keywords: ["privacy", "data", "dpdp", "delete", "consent", "grievance"] },
];

export function searchIndex(): SearchEntry[] {
  return [
    ...QUICK_LINKS,
    ...SERVICES.map((s) => ({
      title: s.name,
      href: `/services/${s.slug}`,
      hint: s.who.length === 1 ? `Service for ${s.who[0] === "lawyer" ? "lawyers" : s.who[0] === "individual" ? "individuals" : "businesses"}` : "Service",
      keywords: [s.name.toLowerCase(), ...s.keywords],
    })),
    ...BRANCHES.map((b) => ({ title: `${b.name} branch`, href: `/locations/${b.slug}`, hint: b.state, keywords: [b.name.toLowerCase(), b.te, b.code.toLowerCase(), "branch", "office", "near", "address", "location"] })),
    ...ARTICLES.map((a) => ({ title: a.title, href: `/knowledge/${a.slug}`, hint: `Knowledge Centre · ${a.category}`, keywords: a.keywords })),
  ];
}

export function search(q: string, limit = 8): SearchEntry[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const words = query.split(/\s+/).filter(Boolean);
  const scored = searchIndex()
    .map((e) => {
      const title = e.title.toLowerCase();
      let score = 0;
      if (title.includes(query)) score += 6;
      for (const w of words) {
        if (title.includes(w)) score += 3;
        for (const k of e.keywords) {
          if (k === w || k === query) score += 5;
          else if (k.startsWith(w) || w.startsWith(k)) score += w.length >= 3 ? 3 : 0;
          else if (k.includes(w) && w.length >= 3) score += 1;
        }
      }
      return { e, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.e);
}

export function serviceBySlug(slug: string) {
  return SERVICES.find((s) => s.slug === slug);
}
export function branchBySlug(slug: string) {
  return BRANCHES.find((b) => b.slug === slug);
}

export const STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_SCREENING: "Under screening",
  INFORMATION_REQUIRED: "Information required",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  ADVOCATE_REVIEW: "Advocate review",
  QUALITY_REVIEW: "Quality review",
  CLIENT_REVIEW: "Client review",
  REVISION_REQUIRED: "Revision required",
  COMPLETED: "Completed",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

export const PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
  deadline_sensitive: "Deadline-sensitive",
};

export const DOC_KIND_LABELS: Record<string, string> = {
  original: "Original",
  under_review: "Under review",
  draft: "Draft",
  revised_draft: "Revised draft",
  advocate_reviewed: "Advocate reviewed",
  final: "Final",
  superseded: "Superseded",
};

export const ROLE_LABELS: Record<string, string> = {
  client: "Individual client",
  lawyer: "Lawyer",
  business_client: "Business client",
  drafting_staff: "Drafting staff",
  support_staff: "Support staff",
  advocate_reviewer: "Advocate reviewer",
  branch_manager: "Branch manager",
  admin: "Administrator",
  super_admin: "Super administrator",
};
