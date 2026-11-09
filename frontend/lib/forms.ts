import type { Aud } from "./content";

// Pages under For Lawyers, For Individuals and For Businesses. Each opens the request form with the audience
// and service already chosen. The customer never chooses a branch.
export interface FormPageInfo {
  slug: string;
  title: string;
  lead: string;
  service: string; // "" lets the person choose
}

export const FORM_PAGES: Record<Aud, FormPageInfo[]> = {
  lawyer: [
    { slug: "drafting", title: "Submit Drafting Request", lead: "Share the brief facts, court and document type. Attach existing pleadings or orders if you have them.", service: "case-drafting" },
    { slug: "research", title: "Request Legal Research", lead: "State the legal question, the forum and the relevant facts.", service: "legal-research" },
    { slug: "documents", title: "Document Preparation", lead: "Affidavits, deeds, powers of attorney and other documents prepared to your instructions.", service: "legal-documentation" },
    { slug: "case-preparation", title: "Case Preparation Assistance", lead: "Chronologies, lists of dates, indexes and compilations for your matter.", service: "case-preparation" },
    { slug: "document-review", title: "Document Review", lead: "Send a document for review and tell us what you need checked.", service: "document-review" },
  ],
  individual: [
    { slug: "request", title: "Submit Legal Request", lead: "Tell us what you need. If you are not sure which service fits, choose Legal Consultation Coordination.", service: "" },
    { slug: "legal-opinion", title: "Legal Opinion", lead: "A written professional opinion from a qualified advocate after reviewing your facts and documents.", service: "legal-opinion" },
    { slug: "legal-notice", title: "Legal Notice Assistance", lead: "Send a legal notice, or get help replying to one you received.", service: "legal-notices" },
    { slug: "agreement", title: "Agreement Drafting", lead: "Rental, loan, partnership and other agreements in clear terms.", service: "agreement-drafting" },
    { slug: "property", title: "Property Documentation", lead: "Help gathering and organising land and property papers.", service: "property-documentation" },
    { slug: "document-review", title: "Document Review", lead: "Have a document reviewed before you sign or respond.", service: "document-review" },
    { slug: "consultation", title: "Advocate Consultation", lead: "We arrange a consultation with a qualified advocate suited to your matter.", service: "advocate-consultation" },
    { slug: "legal-query", title: "Legal Consultation Coordination", lead: "Describe your situation and we will route it to the right service and professional.", service: "legal-query" },
    { slug: "documents", title: "Legal Documentation", lead: "Affidavits, deeds, wills and other legal documents.", service: "legal-documentation" },
  ],
  business: [
    { slug: "agreements", title: "Business Agreements", lead: "Vendor, supplier, distribution, service and partnership agreements.", service: "business-agreements" },
    { slug: "contracts", title: "Contract Drafting Assistance", lead: "Drafting and redrafting of commercial contracts to your agreed terms.", service: "contract-drafting" },
    { slug: "documentation", title: "Legal Documentation", lead: "Resolutions, authorisations, affidavits and other documents for your business.", service: "legal-documentation" },
    { slug: "employment", title: "Employment Documentation", lead: "Appointment letters, employment agreements and HR policies.", service: "employment-documentation" },
    { slug: "support", title: "Business Legal Support", lead: "Ongoing documentation and coordination for routine legal work.", service: "business-legal-support" },
    { slug: "legal-notice", title: "Legal Notice Assistance", lead: "Notices for recovery of dues and other disputes, and replies to notices received.", service: "legal-notices" },
    { slug: "other", title: "Other Services", lead: "Tell us what your business needs and our team will review it.", service: "other" },
  ],
};

export const AUD_BASE: Record<Aud, string> = { lawyer: "/lawyers", individual: "/individuals", business: "/businesses" };
