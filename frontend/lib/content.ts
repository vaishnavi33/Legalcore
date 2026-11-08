// Website text that does not change often. Fees, branch addresses and phone numbers come from the API,
// so branch managers and admins can update them from the dashboard without a code change.

export type Who = "lawyer" | "individual" | "both";

export interface ServiceInfo {
  slug: string;
  name: string;
  who: Who;
  short: string;
  includes: string[];
  eligibility: string;
  keepReady: string[];
  time: string;
  faq: [string, string][];
  keywords: string[];
}

export const SERVICES: ServiceInfo[] = [
  {
    slug: "case-drafting",
    name: "Case Drafting",
    who: "lawyer",
    short: "Plaints, written statements, writ petitions, appeals and bail applications, drafted to court format.",
    includes: ["Plaints and suits", "Written statements and counter affidavits", "Writ petitions and appeals", "Bail and anticipatory bail applications", "Interlocutory applications"],
    eligibility: "Enrolled advocates and law firms. You remain counsel on record and file the final draft.",
    keepReady: ["Brief facts and chronology", "Copies of existing pleadings or orders", "Court and case number, if filed", "Your deadline"],
    time: "2 to 5 working days, depending on length",
    faq: [
      ["Who signs the draft?", "You do. We prepare it; you review, edit and sign as counsel on record."],
      ["Can you match my court's format?", "Yes. Tell us the court and we follow its filing format and page rules."],
      ["Is my client's information safe?", "Case papers are seen only by the team assigned to your request."],
    ],
    keywords: ["draft", "drafting", "plaint", "suit", "written statement", "counter", "writ", "petition", "appeal", "bail", "anticipatory", "pleading", "interlocutory", "ia", "revision"],
  },
  {
    slug: "legal-research",
    name: "Legal Research",
    who: "lawyer",
    short: "Case-law and statute research with citations you can check, summarised for your issue.",
    includes: ["Judgments on a specific legal point", "Statute and amendment history", "Research memo with citations", "Comparison of conflicting rulings"],
    eligibility: "Enrolled advocates, law firms and in-house legal teams.",
    keepReady: ["The exact legal question", "Relevant facts", "Court or jurisdiction"],
    time: "2 to 4 working days",
    faq: [
      ["Are citations verified?", "Every citation is checked against the reported judgment before it reaches you."],
      ["Do you cover both AP and Telangana High Courts?", "Yes, along with Supreme Court rulings that apply."],
    ],
    keywords: ["research", "case law", "judgment", "judgement", "citation", "precedent", "statute", "memo", "ruling"],
  },
  {
    slug: "legal-documentation",
    name: "Legal Documentation",
    who: "both",
    short: "Affidavits, vakalats, sale deeds, wills, gift deeds and other everyday legal papers.",
    includes: ["Affidavits and declarations", "Sale, gift and settlement deeds", "Wills", "Power of attorney", "Vakalat and court forms"],
    eligibility: "Anyone. Lawyers and individuals can both request documents.",
    keepReady: ["ID proof of the people involved", "Property or account details, if any", "Any old documents linked to this one"],
    time: "1 to 3 working days",
    faq: [
      ["Do you register documents?", "We prepare them and tell you exactly what to take to the Sub-Registrar office."],
      ["Can I get it in Telugu?", "Yes, documents can be prepared in English or Telugu."],
    ],
    keywords: ["affidavit", "vakalat", "sale deed", "deed", "will", "gift", "settlement", "power of attorney", "gpa", "spa", "documentation", "document"],
  },
  {
    slug: "agreement-drafting",
    name: "Agreement Drafting",
    who: "both",
    short: "Rental, partnership, employment, business and loan agreements, written in clear terms.",
    includes: ["Rental and lease agreements", "Partnership deeds", "Employment and service contracts", "Business and vendor agreements", "Loan and settlement agreements"],
    eligibility: "Individuals, businesses and lawyers.",
    keepReady: ["Names and addresses of all parties", "Key terms: amount, period, conditions", "Any draft you already have"],
    time: "1 to 3 working days",
    faq: [
      ["Is stamp duty included?", "No. We tell you the stamp duty that applies; you pay it when the agreement is signed."],
      ["Can you review an agreement someone gave me?", "Yes. Choose this service and attach the agreement."],
    ],
    keywords: ["agreement", "contract", "rent", "rental", "lease", "partnership", "employment", "loan", "mou", "vendor", "business"],
  },
  {
    slug: "legal-notices",
    name: "Legal Notices",
    who: "both",
    short: "Legal notices and replies for cheque bounce, money recovery, property, tenancy and more.",
    includes: ["Cheque bounce notices", "Money recovery notices", "Property and tenancy notices", "Consumer complaint notices", "Replies to notices you received"],
    eligibility: "Anyone. Notices for individuals are sent through an advocate.",
    keepReady: ["Copy of the cheque, bill or agreement", "Dates of key events", "Full address of the other party"],
    time: "1 to 2 working days",
    faq: [
      ["I received a notice. What now?", "Do not ignore it. Note the date you received it and send us a copy. Most notices give a fixed time to reply."],
      ["Is there a time limit for cheque bounce?", "Yes. The notice must be sent within 30 days of the bank's return memo. Contact us quickly."],
    ],
    keywords: ["notice", "legal notice", "cheque", "check", "bounce", "recovery", "money", "dues", "tenant", "eviction", "reply"],
  },
  {
    slug: "document-assistance",
    name: "Document Assistance",
    who: "individual",
    short: "Help reading, checking and organising your legal papers before you sign or submit them.",
    includes: ["Explaining a document in simple words", "Checking land papers before buying", "Organising papers for a court case", "Filling government and court forms"],
    eligibility: "Individuals and families.",
    keepReady: ["The documents you want checked", "What you plan to do (buy, sign, submit)"],
    time: "1 to 2 working days",
    faq: [
      ["Can you explain in Telugu?", "Yes. Ask for Telugu when we call you."],
      ["Do I need to visit the branch?", "No. You can upload photos of the papers and talk on the phone."],
    ],
    keywords: ["check papers", "verify", "explain", "form", "fill", "land papers", "title", "encumbrance", "ec", "passbook", "patta"],
  },
  {
    slug: "advocate-consultation",
    name: "Advocate Consultation",
    who: "individual",
    short: "Speak to a qualified advocate about your problem, in person or on a phone call.",
    includes: ["Land and property disputes", "Marriage, divorce and maintenance", "Police complaints and FIRs", "Cheque bounce and money recovery", "Job and consumer problems"],
    eligibility: "Anyone who needs advice on a legal problem.",
    keepReady: ["A short note on what happened", "Any papers you have, even photos"],
    time: "Call back within 1 working day",
    faq: [
      ["Who will I speak to?", "A qualified advocate who handles your type of problem."],
      ["Can I bring a family member?", "Yes. You can bring anyone you trust."],
    ],
    keywords: ["advocate", "lawyer", "consult", "consultation", "advice", "meet", "appointment", "divorce", "marriage", "maintenance", "custody", "property", "land", "dispute", "police", "fir", "arrest", "job", "consumer"],
  },
];

export const LEGAL_QUERY = {
  slug: "legal-query",
  name: "Legal Query",
};

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

export interface Guide {
  slug: string;
  title: string;
  tag: string;
  steps: string[];
  keywords: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: "cheque-bounce",
    title: "My cheque bounced. What should I do?",
    tag: "Money",
    steps: [
      "Keep the bounced cheque and the bank's return memo safely.",
      "Send a legal notice to the person who gave the cheque within 30 days of getting the bank memo.",
      "They then have 15 days from receiving the notice to pay.",
      "If they do not pay, a complaint can be filed in court within one month after those 15 days end.",
      "These time limits are strict, so act quickly.",
    ],
    keywords: ["cheque", "check", "bounce", "dishonour", "138"],
  },
  {
    slug: "legal-notice",
    title: "What is a legal notice?",
    tag: "Basics",
    steps: [
      "A legal notice is a formal letter that tells the other side what your complaint is and what you want them to do.",
      "It is usually sent by an advocate before a case is filed.",
      "It gives the other side a chance to settle without going to court.",
      "If you receive one, note the date, keep the envelope, and get advice before replying.",
    ],
    keywords: ["notice", "legal notice", "received notice"],
  },
  {
    slug: "land-check",
    title: "Papers to check before buying land",
    tag: "Property",
    steps: [
      "Ask for the full chain of title documents (link documents) going back several years.",
      "Get an Encumbrance Certificate to see loans or other claims on the property.",
      "Check the land records on your state's official land records portal and match the survey number and owner name.",
      "For plots, check layout approval from the local authority.",
      "Get the papers checked by an advocate before you pay any advance.",
    ],
    keywords: ["land", "plot", "buy", "property", "encumbrance", "ec", "survey", "title"],
  },
  {
    slug: "police-complaint",
    title: "How to file a police complaint (FIR)",
    tag: "Police",
    steps: [
      "Go to the police station and give your complaint in writing or orally. It should be written down and read back to you.",
      "For a serious offence you can file at any police station, and it will be transferred to the right one (Zero FIR).",
      "You are entitled to a free copy of the FIR.",
      "If the police refuse to register it, you can send your complaint in writing to the Superintendent of Police.",
    ],
    keywords: ["police", "fir", "complaint", "zero fir", "station", "theft", "cheating", "harassment"],
  },
];

export interface SearchEntry {
  title: string;
  href: string;
  hint: string;
  keywords: string[];
}

export const QUICK_LINKS: SearchEntry[] = [
  { title: "Submit a drafting request", href: "/lawyers/drafting", hint: "For lawyers", keywords: ["submit draft", "drafting request", "lawyer", "advocate", "counsel"] },
  { title: "Request legal research", href: "/lawyers/research", hint: "For lawyers", keywords: ["research request"] },
  { title: "Ask a legal question", href: "/individuals/legal-query", hint: "For individuals", keywords: ["question", "query", "ask", "help", "problem", "doubt", "సహాయం", "సలహా"] },
  { title: "Book an advocate consultation", href: "/individuals/consultation", hint: "For individuals", keywords: ["book", "appointment", "meet", "talk", "consult"] },
  { title: "Track my request", href: "/track-request", hint: "Check status", keywords: ["track", "status", "where", "request number", "progress"] },
  { title: "Sign in or create account", href: "/login", hint: "One account for everyone", keywords: ["login", "log in", "sign in", "account", "register", "sign up", "password"] },
  { title: "Contact us", href: "/contact", hint: "Phone, email, WhatsApp", keywords: ["contact", "phone", "call", "email", "whatsapp", "number"] },
];

export function searchIndex(): SearchEntry[] {
  return [
    ...QUICK_LINKS,
    ...SERVICES.map((s) => ({
      title: s.name,
      href: `/services/${s.slug}`,
      hint: s.who === "lawyer" ? "Service for lawyers" : s.who === "individual" ? "Service for individuals" : "Service",
      keywords: [s.name.toLowerCase(), ...s.keywords],
    })),
    ...BRANCHES.map((b) => ({ title: `${b.name} branch`, href: `/locations/${b.slug}`, hint: b.state, keywords: [b.name.toLowerCase(), b.te, b.code.toLowerCase(), "branch", "office", "near", "address", "location"] })),
    ...GUIDES.map((g) => ({ title: g.title, href: `/knowledge/${g.slug}`, hint: `Guide · ${g.tag}`, keywords: g.keywords })),
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
  SUBMITTED: "Request received",
  UNDER_REVIEW: "Being reviewed",
  AWAITING_INFORMATION: "Waiting for your information",
  ACCEPTED: "Accepted",
  PAYMENT_PENDING: "Waiting for payment",
  ASSIGNED: "Team assigned",
  IN_PROGRESS: "Work in progress",
  QUALITY_REVIEW: "Quality check by advocate",
  REVISION_REQUESTED: "Changes being made",
  APPROVED: "Approved",
  COMPLETED: "Ready for you",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
  REJECTED: "Not accepted",
  REFUND_PENDING: "Refund in process",
};

export const ROLE_LABELS: Record<string, string> = {
  client: "Client",
  lawyer: "Lawyer",
  drafting_staff: "Drafting staff",
  advocate_reviewer: "Advocate reviewer",
  branch_manager: "Branch manager",
  admin: "Admin",
  super_admin: "Super admin",
};
