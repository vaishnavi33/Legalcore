// Knowledge Centre articles. General information only, written from the text of the statutes named in each article.
// Every article carries `reviewedBy`. Until a qualified advocate has checked it, the page shows "awaiting advocate review".
// Do not add citations, deadlines or case law that have not been checked against the official text.

export interface Section {
  heading: string;
  paras?: string[];
  points?: string[];
}

export interface Article {
  slug: string;
  title: string;
  category: Category;
  summary: string;
  updated: string; // ISO date
  reviewedBy: string; // name of the reviewing advocate, or "" while awaiting review
  sections: Section[];
  faq: [string, string][];
  references: { title: string; url?: string }[];
  keywords: string[];
  related: string[];
}

export const CATEGORIES = ["Money and cheques", "Notices", "Property and land", "Police and criminal"] as const;
export type Category = (typeof CATEGORIES)[number];

const INDIA_CODE = "https://www.indiacode.nic.in/";

export const ARTICLES: Article[] = [
  {
    slug: "cheque-bounce",
    title: "Cheque Bounce: Legal Rights and Remedies in India",
    category: "Money and cheques",
    summary: "What happens when a cheque is returned unpaid, the notice you must send, the time limits under the Negotiable Instruments Act, 1881, and the remedies available.",
    updated: "2026-11-09",
    reviewedBy: "",
    sections: [
      {
        heading: "What is cheque bounce?",
        paras: [
          "A cheque 'bounces' when the bank returns it unpaid. The bank gives a return memo stating the reason, such as insufficient funds or the amount exceeding the arrangement with the bank.",
          "Section 138 of the Negotiable Instruments Act, 1881 makes it an offence when a cheque given for a legally enforceable debt or other liability is returned unpaid for these reasons, and the person who issued it does not pay after receiving a proper demand notice.",
        ],
      },
      {
        heading: "Conditions under Section 138",
        points: [
          "The cheque was issued to discharge, in whole or part, a legally enforceable debt or other liability.",
          "It was presented to the bank within six months from its date or within its period of validity, whichever is earlier.",
          "The payee sent a written demand notice to the drawer within 30 days of receiving information from the bank that the cheque was returned unpaid.",
          "The drawer did not pay the amount within 15 days of receiving the notice.",
        ],
      },
      {
        heading: "The demand notice",
        paras: [
          "The notice should state the cheque details, the date and reason of return, the amount due, and a demand that the amount be paid within 15 days of receipt. It is usually sent through an advocate by registered post or speed post, and the postal receipts and tracking records should be kept.",
        ],
      },
      {
        heading: "Filing a complaint",
        points: [
          "If payment is not made within the 15 days, a complaint may be filed before the Magistrate within one month from the date the cause of action arises (Section 142). The court may allow a later complaint if there was sufficient cause for the delay.",
          "Under Section 142(2), where the cheque was deposited for collection through an account, the complaint is generally filed in the court with jurisdiction over the bank branch where the payee maintains that account.",
          "The court presumes, unless the contrary is proved, that the cheque was received for the discharge of a debt or liability (Section 139).",
        ],
      },
      {
        heading: "Possible consequences for the drawer",
        points: [
          "Imprisonment for up to two years, or a fine of up to twice the cheque amount, or both (Section 138).",
          "The trial court may order interim compensation of up to 20% of the cheque amount (Section 143A).",
          "In an appeal against conviction, the appellate court may order a deposit of at least 20% of the fine or compensation (Section 148).",
          "The offence is compoundable, which means the parties can settle it (Section 147).",
        ],
      },
      {
        heading: "Civil recovery",
        paras: [
          "Separately from the criminal complaint, the payee may file a civil suit to recover the money. Suits on negotiable instruments can be filed under the summary procedure in Order XXXVII of the Code of Civil Procedure, 1908.",
        ],
      },
      {
        heading: "What to keep ready",
        points: ["The original returned cheque", "The bank's return memo", "Proof of the debt (agreement, invoices, messages)", "Copy of the demand notice and postal receipts or tracking"],
      },
    ],
    faq: [
      ["I received a cheque bounce notice. What should I do?", "Do not ignore it. Note the date of receipt and get advice quickly, because the 15-day period to pay starts from receipt of the notice."],
      ["Can I send the notice by WhatsApp or email?", "The law requires a notice in writing. Registered post or speed post with proof of delivery is the common practice. Ask your advocate about electronic modes for your case."],
      ["Is a blank signed cheque covered?", "Disputes about blank or security cheques depend on their facts. Take advice from a qualified advocate."],
    ],
    references: [
      { title: "Negotiable Instruments Act, 1881: Sections 138, 139, 142, 143A, 147, 148", url: INDIA_CODE },
      { title: "Code of Civil Procedure, 1908: Order XXXVII (summary procedure)", url: INDIA_CODE },
    ],
    keywords: ["cheque", "check", "bounce", "dishonour", "dishonor", "138", "return memo", "insufficient funds", "check balance"],
    related: ["promissory-note", "legal-notice"],
  },
  {
    slug: "promissory-note",
    title: "Promissory Note: Meaning, Requirements and Recovery",
    category: "Money and cheques",
    summary: "What a promissory note is, what it must contain, stamp duty, signatures, and how money due on one can be recovered.",
    updated: "2026-11-09",
    reviewedBy: "",
    sections: [
      {
        heading: "Meaning",
        paras: [
          "Section 4 of the Negotiable Instruments Act, 1881 defines a promissory note as an instrument in writing (not a bank note or currency note) containing an unconditional undertaking, signed by the maker, to pay a certain sum of money only to, or to the order of, a certain person, or to the bearer of the instrument.",
          "A promissory note is a negotiable instrument under Section 13 of the Act.",
        ],
      },
      {
        heading: "Essential elements",
        points: [
          "It must be in writing.",
          "It must contain a promise to pay. A mere acknowledgement of a debt is not enough.",
          "The promise must be unconditional.",
          "It must be signed by the maker.",
          "The maker and the payee must be certain.",
          "The sum must be certain, and payable in money only.",
        ],
      },
      {
        heading: "Parties",
        points: ["Maker: the person who promises to pay.", "Payee: the person to whom the money is to be paid.", "Holder, endorser and endorsee, if the note is transferred by endorsement."],
      },
      {
        heading: "Legal requirements and a caution about bearer notes",
        paras: [
          "Section 31 of the Reserve Bank of India Act, 1934 restricts anyone other than the Reserve Bank (and the Central Government in certain cases) from making a promissory note payable to bearer on demand. A note made out to a named person, or to their order, avoids this problem.",
        ],
      },
      {
        heading: "Execution and signatures",
        points: [
          "The maker should sign in the presence of witnesses, even though witnesses are not a legal requirement, so that execution can be proved later.",
          "Write the amount in words and figures, and the date and place of execution.",
          "Do not leave blanks. A material alteration made without consent can make the note void (Section 87).",
          "Keep the original safely. Recovery usually requires producing the original.",
        ],
      },
      {
        heading: "Stamp duty",
        paras: [
          "Promissory notes are chargeable with stamp duty under the Indian Stamp Act, 1899, as applied and amended in each state. An instrument that is not duly stamped may not be admissible in evidence, and for promissory notes this defect generally cannot be cured later by paying a penalty. Check the duty that applies in your state before the note is signed.",
        ],
      },
      {
        heading: "Recovery proceedings",
        points: [
          "If the maker does not pay, the holder can file a civil suit for recovery.",
          "Suits on promissory notes may be filed under the summary procedure in Order XXXVII of the Code of Civil Procedure, 1908.",
          "The Act presumes, unless the contrary is proved, that a negotiable instrument was made for consideration (Section 118).",
          "Limitation: under the Limitation Act, 1963, a suit on a promissory note generally has to be filed within three years. When time starts depends on the terms of the note, so take advice early.",
        ],
      },
      {
        heading: "Common mistakes",
        points: [
          "Making the promise conditional (for example, 'if my crop sells').",
          "Not paying the correct stamp duty.",
          "Leaving the amount, date or payee blank.",
          "Making it payable to bearer.",
          "Not keeping proof that the money was actually given.",
          "Waiting too long to start recovery.",
        ],
      },
    ],
    faq: [
      ["Is a promissory note the same as a loan agreement?", "No. A loan agreement can contain many terms. A promissory note is a short unconditional promise to pay a fixed sum. Many lenders use both."],
      ["Does it need to be registered?", "Registration is not generally required for a promissory note. Stamp duty does apply."],
    ],
    references: [
      { title: "Negotiable Instruments Act, 1881: Sections 4, 13, 87, 118", url: INDIA_CODE },
      { title: "Reserve Bank of India Act, 1934: Section 31", url: INDIA_CODE },
      { title: "Indian Stamp Act, 1899, and the stamp law of your state", url: INDIA_CODE },
      { title: "Code of Civil Procedure, 1908: Order XXXVII; Limitation Act, 1963", url: INDIA_CODE },
    ],
    keywords: ["promissory", "pro note", "pronote", "loan", "debt", "lend", "money", "recovery", "stamp"],
    related: ["cheque-bounce", "legal-notice"],
  },
  {
    slug: "legal-notice",
    title: "Legal Notice: What It Is and How to Respond",
    category: "Notices",
    summary: "Why legal notices are sent, what they should contain, how to send one, how to reply, and when a notice is required by law.",
    updated: "2026-11-09",
    reviewedBy: "",
    sections: [
      {
        heading: "What a legal notice means",
        paras: ["A legal notice is a formal written communication that sets out a grievance, the facts relied on, and what the sender wants the other party to do, usually within a stated time."],
      },
      {
        heading: "Why it is sent",
        points: ["To give the other party a chance to settle without going to court.", "To put your version of events on record.", "Because some laws require a notice before you can file a case or prosecution."],
      },
      {
        heading: "When it may be necessary",
        points: [
          "Suits against the Government or a public officer for acts done in official capacity: two months' prior notice under Section 80 of the Code of Civil Procedure, 1908, unless the court permits otherwise for urgent relief.",
          "Cheque dishonour: a written demand within 30 days of the bank's information, under Section 138 of the Negotiable Instruments Act, 1881.",
          "Ending a tenancy: notice under Section 106 of the Transfer of Property Act, 1882, subject to the tenancy agreement and any applicable state rent law.",
          "Many contracts also require notice before termination or before starting proceedings. Read the contract.",
        ],
      },
      {
        heading: "Essential contents",
        points: [
          "Names and addresses of the sender and the recipient.",
          "The facts, in date order.",
          "The legal basis of the claim.",
          "What the recipient must do, and by when.",
          "What the sender may do if the demand is not met.",
          "Signature of the sender or the advocate issuing it, with date.",
        ],
      },
      {
        heading: "How to prepare and send it",
        points: [
          "Collect the documents: agreements, bills, cheques, correspondence.",
          "Have the notice drafted or checked by a qualified advocate, especially where a statutory time limit applies.",
          "Send it by registered post with acknowledgement due or by speed post, and keep the receipts and tracking printouts. Email may be used in addition where appropriate.",
          "Keep a signed copy of exactly what was sent.",
        ],
      },
      {
        heading: "How to respond to a notice you received",
        points: [
          "Note the date you received it and keep the envelope.",
          "Do not admit or deny anything in a hurry.",
          "Get advice from a qualified advocate and reply within the time given, where possible.",
          "A reply should answer each allegation and set out your own version.",
        ],
      },
      {
        heading: "Consequences of not responding",
        paras: [
          "Not replying does not by itself decide a dispute, but the sender may go ahead with a case, and your silence may be pointed to later. Where a notice is a statutory demand, such as under Section 138 of the Negotiable Instruments Act, ignoring it can lead directly to criminal proceedings.",
        ],
      },
    ],
    faq: [
      ["Must a legal notice be sent through an advocate?", "Not always, but notices are usually issued through an advocate so that the facts and the legal basis are stated correctly."],
      ["Is there a fixed time to reply?", "There is no single time limit for every notice. Follow the time given in the notice and get advice quickly."],
    ],
    references: [
      { title: "Code of Civil Procedure, 1908: Section 80", url: INDIA_CODE },
      { title: "Negotiable Instruments Act, 1881: Section 138", url: INDIA_CODE },
      { title: "Transfer of Property Act, 1882: Section 106", url: INDIA_CODE },
    ],
    keywords: ["notice", "legal notice", "received notice", "reply", "demand", "section 80"],
    related: ["cheque-bounce", "promissory-note"],
  },
  {
    slug: "land-documents",
    title: "Land Documents Explained",
    category: "Property and land",
    summary: "The main land and property documents in Andhra Pradesh and Telangana, what each one shows, and what it does not prove.",
    updated: "2026-11-09",
    reviewedBy: "",
    sections: [
      {
        heading: "Title deeds and sale deeds",
        paras: [
          "A title deed is any document through which a person acquired ownership, such as a sale deed, gift deed, settlement deed, partition deed or will (with probate where required). A sale deed records the transfer of ownership for a price.",
          "A sale of immovable property of value one hundred rupees or more must be made by a registered instrument (Section 54, Transfer of Property Act, 1882), and such documents are compulsorily registrable under Section 17 of the Registration Act, 1908.",
        ],
      },
      {
        heading: "Encumbrance certificate (EC)",
        paras: [
          "An EC is issued by the Registration and Stamps Department and lists registered transactions affecting a property for the period searched, such as sales, mortgages and leases. It shows only registered documents. Unregistered agreements, many court cases and some charges will not appear.",
        ],
      },
      {
        heading: "Mutation records",
        paras: [
          "Mutation is the change of the owner's name in the revenue records after a transfer or succession. Mutation helps with tax and revenue purposes, but it does not by itself create or prove ownership.",
        ],
      },
      {
        heading: "Revenue records",
        points: [
          "Andhra Pradesh: land records such as the Record of Rights (1-B), Adangal (village account) and the pattadar passbook, available through the state's official land records services.",
          "Telangana: land records are maintained on the state's official land records portal (Bhu Bharati, which replaced Dharani).",
          "Match the survey number, extent and owner name across all papers.",
        ],
      },
      {
        heading: "Survey documents",
        paras: ["Survey records and field sketches show the survey number, sub-division, extent and boundaries. Compare them with the actual boundaries on the ground."],
      },
      {
        heading: "Land-use classification",
        paras: [
          "Land is classified for uses such as agricultural, residential or commercial. Using agricultural land for other purposes generally needs conversion permission under the applicable state law (in Andhra Pradesh, the Agricultural Land (Conversion for Non-Agricultural Purposes) Act, 2006).",
        ],
      },
      {
        heading: "Registration documents",
        points: ["Registered copies of all transactions in the chain of title.", "Stamp duty and registration fee receipts.", "Certified copies can be obtained from the Sub-Registrar office."],
      },
      {
        heading: "Relevant permissions",
        points: [
          "Layout or building approval from the competent planning authority or local body.",
          "Registration with the Real Estate Regulatory Authority for real estate projects that require it under the Real Estate (Regulation and Development) Act, 2016.",
          "No-objection certificates where the land is subject to special rules.",
        ],
      },
      {
        heading: "Property verification",
        paras: ["Reading documents is not the same as verifying title. A title verification compares the chain of documents, revenue records, encumbrances and litigation, and should be done by a qualified advocate before you pay money."],
      },
    ],
    faq: [
      ["Does a pattadar passbook prove ownership?", "It is an important revenue record, but ownership disputes are decided on all the evidence. Do not rely on one document alone."],
      ["How many years of EC should I check?", "Ask your advocate. Many lenders and advocates look at a long period, often 30 years or more."],
    ],
    references: [
      { title: "Transfer of Property Act, 1882: Section 54", url: INDIA_CODE },
      { title: "Registration Act, 1908: Section 17", url: INDIA_CODE },
      { title: "Real Estate (Regulation and Development) Act, 2016", url: INDIA_CODE },
      { title: "State land records and Registration and Stamps Department portals (AP and Telangana)" },
    ],
    keywords: ["land", "plot", "property", "encumbrance", "ec", "survey", "title", "patta", "passbook", "mutation", "adangal", "1b", "sale deed", "registration"],
    related: ["land-buying-checklist"],
  },
  {
    slug: "land-buying-checklist",
    title: "Land-Buying Papers: A Practical Checklist",
    category: "Property and land",
    summary: "A checklist of documents to see and verify before you buy land in India, and why a title investigation by an advocate is still needed.",
    updated: "2026-11-09",
    reviewedBy: "",
    sections: [
      {
        heading: "Before you begin",
        paras: [
          "This checklist is general information to help you collect the right papers. It is not a title investigation. Only a qualified advocate can examine the documents and give a title opinion. Do not pay an advance until that is done.",
        ],
      },
      {
        heading: "The checklist",
        points: [
          "Parent documents and title history: every document in the chain of ownership, for a long period (ask your advocate how far back).",
          "Current title deed in the seller's name.",
          "Encumbrance certificate covering the full period.",
          "Revenue records showing the seller as owner, with matching survey number and extent.",
          "Mutation records reflecting earlier transfers.",
          "Survey and boundary details, checked on the ground.",
          "Land-use classification, and conversion permission where applicable.",
          "Layout and planning approvals where applicable, and RERA registration for projects that require it.",
          "Property and land tax receipts, up to date.",
          "Pending litigation checks: court records, any attachment, and a public notice inviting objections if your advocate advises it.",
          "Seller identity and authority: identity documents of every owner; if anyone signs under a power of attorney, check the power of attorney is valid and still in force; consent of all co-owners or legal heirs; court permission where a minor's share is involved.",
          "Registration requirements: stamp duty and registration fees as applicable in the state, and registration at the Sub-Registrar office.",
        ],
      },
      {
        heading: "Common warning signs",
        points: ["Gaps in the chain of title", "Names or extents that do not match", "Seller unwilling to share originals", "Land under a mortgage, attachment or court case", "Price far below the market"],
      },
    ],
    faq: [
      ["Can Legal Core do the title check?", "Legal Core can coordinate a title verification by a qualified advocate. Choose Legal Opinion when you submit your request."],
      ["Is a bank-approved property safe?", "A bank's approval helps, but it is not a guarantee. Get your own advocate's opinion."],
    ],
    references: [
      { title: "Transfer of Property Act, 1882", url: INDIA_CODE },
      { title: "Registration Act, 1908", url: INDIA_CODE },
      { title: "Real Estate (Regulation and Development) Act, 2016", url: INDIA_CODE },
    ],
    keywords: ["buy land", "buying", "plot", "purchase", "property", "checklist", "title", "verification"],
    related: ["land-documents"],
  },
  {
    slug: "zero-fir",
    title: "How to File a Zero FIR",
    category: "Police and criminal",
    summary: "What a Zero FIR is, how it differs from a regular FIR, and your rights under Section 173 of the Bharatiya Nagarik Suraksha Sanhita, 2023.",
    updated: "2026-11-09",
    reviewedBy: "",
    sections: [
      {
        heading: "Meaning of Zero FIR",
        paras: [
          "A Zero FIR is a first information report recorded by a police station for a cognizable offence even though the offence took place outside its area. It is registered without a regular number (hence 'zero') and then transferred to the police station that has jurisdiction.",
          "Section 173(1) of the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS), which replaced the Code of Criminal Procedure from 1 July 2024, provides that information about a cognizable offence may be given to the officer in charge of a police station irrespective of the area where the offence was committed.",
        ],
      },
      {
        heading: "Regular FIR and Zero FIR",
        points: [
          "A regular FIR is registered at the police station with jurisdiction over the place of the offence and is numbered in that station's records.",
          "A Zero FIR is recorded where you approach, and is transferred for investigation.",
          "Both are FIRs for cognizable offences. A Zero FIR helps when delay could cause harm, for example in offences against women, accidents or offences that happened while travelling.",
        ],
      },
      {
        heading: "Where you can approach the police",
        paras: ["Any police station. You do not have to find the 'correct' station first for a cognizable offence."],
      },
      {
        heading: "How to provide information",
        points: [
          "Orally: the officer must reduce it to writing, read it over to you, and you sign it (Section 173(1)).",
          "By electronic communication: it is taken on record once you sign it within three days (Section 173(1)).",
          "Where the information is given by a woman against whom certain offences are alleged, it is to be recorded by a woman police officer or woman officer, as set out in the proviso to Section 173(1).",
        ],
      },
      {
        heading: "What details to include",
        points: ["Your name and contact details", "Date, time and place of the incident", "What happened, in your own words", "Names or descriptions of the persons involved", "Names of witnesses", "Details of any property lost or damaged, and any injuries"],
      },
      {
        heading: "Acknowledgement and copy",
        paras: ["You are entitled to a copy of the information as recorded, free of cost (Section 173(2)). Check the details before you sign, and keep the copy safely."],
      },
      {
        heading: "Transfer and what happens next",
        points: [
          "The Zero FIR is sent to the police station with jurisdiction, which registers it and investigates.",
          "For offences punishable with three years or more but less than seven years, the officer may, with the permission of a senior officer, hold a preliminary enquiry within fourteen days to decide whether there is a prima facie case (Section 173(3)).",
          "If the officer refuses to record your information, you may send the substance of it in writing, including by post, to the Superintendent of Police (Section 173(4)). You may also approach the Magistrate under the BNSS.",
        ],
      },
    ],
    faq: [
      ["Can the police refuse to register a Zero FIR?", "For information disclosing a cognizable offence, registration is the rule. The Supreme Court in Lalita Kumari v. Government of Uttar Pradesh (2014) held that registration of an FIR is mandatory where the information discloses a cognizable offence, subject to limited preliminary enquiry. Use Section 173(4) if you face refusal."],
      ["Is there a fee?", "No. The copy of the FIR is free."],
    ],
    references: [
      { title: "Bharatiya Nagarik Suraksha Sanhita, 2023: Section 173", url: INDIA_CODE },
      { title: "Lalita Kumari v. Government of Uttar Pradesh, Supreme Court of India (2014)" },
    ],
    keywords: ["police", "fir", "zero fir", "complaint", "station", "bnss", "173", "theft", "cheating", "harassment"],
    related: ["legal-notice"],
  },
];

export function articleBySlug(slug: string) {
  return ARTICLES.find((a) => a.slug === slug);
}

// Older links used these slugs.
export const ARTICLE_ALIASES: Record<string, string> = { "land-check": "land-buying-checklist", "police-complaint": "zero-fir" };
