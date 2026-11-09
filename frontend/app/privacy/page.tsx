import Link from "next/link";
import { Crumbs } from "@/components/Blocks";
import { SITE } from "@/lib/site";

export const metadata = { title: "Privacy Notice" };

export default function Privacy() {
  return (
    <>
      <Crumbs items={[["Privacy Notice"]]} />
      <article className="wrap article">
        <header className="page-head">
          <span className="label">Your data</span>
          <h1>Privacy Notice</h1>
          <p className="lead">How Legal Core collects, uses, stores and protects your personal data, and how you can exercise your rights.</p>
          <p className="meta">
            Last updated 9 November 2026 · <span className="pending">Draft: to be reviewed by a qualified advocate before launch</span>
          </p>
        </header>
        <div className="prose" style={{ maxWidth: "72ch" }}>
          <h2>Who we are</h2>
          <p>
            Legal Core is a legal support and coordination agency. For the personal data you give us to handle your request, Legal Core decides why and how it is
            processed, which makes it the data fiduciary under the Digital Personal Data Protection Act, 2023 (DPDP Act).
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>Contact details: name, mobile number, email address and, for businesses, the organisation name.</li>
            <li>Details of your requirement: the service, description, case details, the other party&apos;s name, and the date you need the work by.</li>
            <li>Documents you upload, which may include sensitive information about you and others.</li>
            <li>For lawyers: your Bar Council enrolment number, if you choose to give it.</li>
            <li>Account and security records: sign-in times, request activity and audit logs.</li>
          </ul>

          <h2>Why we use it</h2>
          <ul>
            <li>To review, allocate and carry out your request, and to contact you about it.</li>
            <li>To check for conflicts of interest before assigning your matter.</li>
            <li>To verify the professional status of lawyers and advocates.</li>
            <li>To keep your information secure and to meet our legal obligations.</li>
          </ul>
          <p>We do not sell your data and do not use it for advertising.</p>

          <h2>Consent</h2>
          <p>
            When you submit a request you consent to us processing your data for that request. You can withdraw consent at any time by contacting us. Withdrawal
            does not affect processing already done, and we may be unable to continue the request without the data.
          </p>

          <h2>Who can see it</h2>
          <p>
            Only Legal Core staff and professionals assigned to your request can see its details and documents. Access is controlled on our servers, by role and
            by request, and access is recorded. Internal staff notes are never shown to customers. We share data with advocates or professionals engaged on your
            matter, and with service providers who host or deliver our systems under confidentiality obligations.
          </p>

          <h2>How we protect it</h2>
          <ul>
            <li>Passwords are stored only as secure hashes.</li>
            <li>Documents are stored privately, never in public folders, and are opened only through short-lived links after a permission check.</li>
            <li>Connections to the website use encryption in transit.</li>
            <li>We do not store your documents or personal details in your browser&apos;s local storage.</li>
            <li>Guest tracking requires a one-time code, so a reference number alone does not reveal your request.</li>
          </ul>

          <h2>How long we keep it</h2>
          <p>
            We keep request records and documents for as long as needed for the request and for any period required by law, and then delete them or make them
            anonymous. You can ask us to delete your data sooner, subject to legal requirements.
          </p>

          <h2 id="rights">Your rights</h2>
          <p>Under the DPDP Act you have the right to:</p>
          <ul>
            <li>get a summary of your personal data and how we process it (Section 11);</li>
            <li>have inaccurate or incomplete data corrected, completed or updated, and to have data erased when it is no longer needed (Section 12);</li>
            <li>have your grievances addressed (Section 13); and</li>
            <li>nominate a person to exercise your rights if you die or become incapable (Section 14).</li>
          </ul>
          <p>
            To exercise a right, contact us using the details below, or <Link href="/request">submit a request</Link> choosing Other and describing what you
            need. We may ask you to confirm your identity.
          </p>

          <h2 id="grievance">Grievances</h2>
          <p>
            Grievance contact:{" "}
            {SITE.grievanceOfficer || SITE.grievanceEmail ? (
              <>
                {SITE.grievanceOfficer} {SITE.grievanceEmail && <a href={`mailto:${SITE.grievanceEmail}`}>{SITE.grievanceEmail}</a>}
              </>
            ) : (
              <span className="placeholder">Not yet published</span>
            )}
            . If you are not satisfied with our response, you may approach the Data Protection Board of India after using our grievance process.
          </p>

          <h2>Security incidents</h2>
          <p>
            If a personal data breach occurs, we will act to contain it, inform affected people and notify the Data Protection Board as the law requires.
          </p>

          <h2>Changes to this notice</h2>
          <p>
            The Digital Personal Data Protection Rules, 2025 bring obligations into force in phases. We will update this notice as those provisions commence, and
            show the date of the latest version above.
          </p>
        </div>
      </article>
    </>
  );
}
