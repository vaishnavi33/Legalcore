"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError, earliestNeededBy, fmtDay, isLawyer, upload } from "@/lib/api";
import { AUDIENCES, type Aud, servicesFor, TOPICS } from "@/lib/content";
import FileUploader from "./FileUploader";
import KeepReady from "./KeepReady";
import { useUser } from "./UserProvider";

interface Created {
  request_number: string;
  status_label: string;
  service: string;
  files_received: number;
  linked_to_account: boolean;
  acknowledgements: { channel: string; status: string }[];
}

export const NEEDED_BY_HELP =
  "Please select a required date at least two days from today. If your matter involves an urgent court deadline or other time-sensitive requirement, mention it separately in the description.";

type Errors = Partial<Record<string, string>>;

const EMPTY = { name: "", phone: "", email: "", organisation: "", enrolment: "", court: "", caseNo: "", opposite: "", due: "", mode: "Phone call", topic: "", message: "", other: "" };

/** One request form for lawyers, individuals and businesses. No account and no branch choice needed. */
export default function RequestForm({
  audience = "individual",
  service = "",
  title = "Submit your request",
  lockAudience = false,
}: {
  audience?: Aud;
  service?: string;
  title?: string;
  lockAudience?: boolean;
}) {
  const { user, refresh } = useUser();
  const [aud, setAud] = useState<Aud>(audience);
  const [svc, setSvc] = useState(service);
  const [f, setF] = useState(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [errs, setErrs] = useState<Errors>({});
  const [formErr, setFormErr] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState<Created | null>(null);
  const [minDate, setMinDate] = useState("");

  const options = useMemo(() => servicesFor(aud), [aud]);

  // Worked out in the browser after load so the date is India-local and never stale from a cached page.
  useEffect(() => setMinDate(earliestNeededBy()), []);

  useEffect(() => {
    if (!user) return;
    setF((cur) => ({
      ...cur,
      name: cur.name || user.name,
      phone: cur.phone || user.mobile || "",
      email: cur.email || user.email || "",
      enrolment: cur.enrolment || user.enrolment_number || "",
    }));
  }, [user]);

  useEffect(() => {
    if (svc && !options.some((o) => o.slug === svc)) setSvc("");
  }, [options, svc]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setF({ ...f, [k]: e.target.value });
    if (errs[k]) setErrs({ ...errs, [k]: undefined });
  };

  function validate(): Errors {
    const e: Errors = {};
    if (f.name.trim().length < 2) e.name = "Please enter your full name.";
    if (!/^(?:\+?91|0)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Enter a valid 10-digit Indian mobile number.";
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address, or leave it blank.";
    if (aud === "business" && f.organisation.trim().length < 2) e.organisation = "Please enter the business or organisation name.";
    if (!svc) e.svc = "Please choose a service.";
    if (svc === "other" && f.other.trim().length < 3) e.other = "Please specify the legal service you require.";
    if (aud === "lawyer" && f.enrolment && !/^[A-Za-z0-9/().\- ]{3,40}$/.test(f.enrolment.trim())) e.enrolment = "Use letters, numbers and / - . only.";
    if (!f.due) e.due = "Please choose the date you need this by.";
    else if (minDate && f.due < minDate) e.due = NEEDED_BY_HELP;
    if (f.message.trim().length < 10) e.message = "Please describe your requirement in a few sentences.";
    if (!consent) e.consent = "Please agree so that we can handle your request.";
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setErrs(v);
    if (Object.keys(v).length) {
      setFormErr("Please correct the highlighted fields.");
      const first = document.querySelector<HTMLElement>(`[data-f="${Object.keys(v)[0]}"]`);
      first?.focus();
      return;
    }
    setFormErr("");
    const data = {
      audience: aud,
      service: svc,
      service_other: svc === "other" ? f.other : "",
      name: f.name,
      phone: f.phone,
      email: f.email || null,
      organisation: aud === "business" ? f.organisation : "",
      message: f.message,
      preferred_contact: f.mode,
      topic: aud === "individual" ? f.topic : "",
      enrolment_number: aud === "lawyer" ? f.enrolment : "",
      court: f.court,
      case_number: f.caseNo,
      opposite_party: f.opposite,
      needed_by: f.due,
      consent,
    };
    const fd = new FormData();
    fd.append("data", JSON.stringify(data));
    files.forEach((file) => fd.append("files", file));
    setProgress(0);
    try {
      const res = await upload<Created>("/requests", fd, setProgress);
      setDone(res);
      setFiles([]);
      if (user && ((aud === "lawyer" && !isLawyer(user)) || aud === "business")) refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      setFormErr(e2 instanceof ApiError ? e2.message : "Could not send your request. Please try again.");
    } finally {
      setProgress(null);
    }
  }

  function reset() {
    setDone(null);
    setConsent(false);
    setF((cur) => ({ ...EMPTY, name: cur.name, phone: cur.phone, email: cur.email, organisation: cur.organisation, enrolment: cur.enrolment }));
  }

  const err = (k: string) =>
    errs[k] ? (
      <span className="err" id={`e-${k}`}>
        {errs[k]}
      </span>
    ) : null;
  const inv = (k: string) => (errs[k] ? { "aria-invalid": true as const, "aria-describedby": `e-${k}` } : {});

  if (done) {
    const sent = done.acknowledgements.filter((a) => a.status === "sent" || a.status === "delivered").map((a) => a.channel);
    return (
      <div className="desk" id="request">
        <div className="done" role="status">
          <span className="label">Request submitted</span>
          <h2>Thank you, {f.name.split(" ")[0]}.</h2>
          <p>Your request reference number is</p>
          <span className="ref">{done.request_number}</span>
          <p>
            We have saved your request for {done.service}
            {done.files_received > 0 ? ` with ${done.files_received} document${done.files_received > 1 ? "s" : ""}` : ""}. Our team will review it and
            contact you. Please note the reference number; you will need it to track your request.
          </p>
          <p className="note">
            {sent.includes("email") || sent.includes("sms")
              ? `An acknowledgement has been sent by ${sent.filter((c) => c !== "in_app").join(" and ")}.`
              : "We could not send an acknowledgement message automatically, so please keep this reference number safe."}{" "}
            The date you asked for is noted, but it is not a promise of completion; our team will confirm timelines after screening.
          </p>
          <div className="btns">
            {done.linked_to_account ? (
              <Link className="btn" href={`/dashboard/requests/${done.request_number}`}>
                Open this request
              </Link>
            ) : (
              <Link className="btn" href={`/track-request?ref=${done.request_number}`}>
                Track this request
              </Link>
            )}
            <button className="btn ghost" type="button" onClick={reset}>
              Submit another request
            </button>
          </div>
          {!done.linked_to_account && (
            <p className="note">
              Optional: <Link href="/register">create an account</Link> to see future requests, messages and documents in one place.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="desk" id="request">
      <div className="sec-head" style={{ margin: 0 }}>
        <span className="label">Request form</span>
        <h2>{title}</h2>
        <p className="muted">
          No account needed. Fields marked <span aria-hidden="true">*</span>
          <span className="sr-only">with an asterisk</span> are required. You may write in English or Telugu.
        </p>
      </div>
      <form onSubmit={submit} noValidate>
        {!lockAudience && (
          <fieldset className="group">
            <legend>I am</legend>
            <div className="toggle" role="group" aria-label="Customer type">
              {AUDIENCES.map((a) => (
                <button key={a.key} type="button" aria-pressed={aud === a.key} onClick={() => setAud(a.key)}>
                  {a.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="group">
          <legend>Your details</legend>
          <div className="row">
            <div className="field">
              <label htmlFor="f-name">Full name *</label>
              <input id="f-name" data-f="name" autoComplete="name" value={f.name} onChange={set("name")} {...inv("name")} />
              {err("name")}
            </div>
            <div className="field">
              <label htmlFor="f-phone">Mobile number *</label>
              <input id="f-phone" data-f="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile number" value={f.phone} onChange={set("phone")} {...inv("phone")} />
              {err("phone")}
            </div>
            <div className="field">
              <label htmlFor="f-email">
                Email address <small>(recommended)</small>
              </label>
              <input id="f-email" data-f="email" type="email" autoComplete="email" value={f.email} onChange={set("email")} {...inv("email")} />
              {err("email")}
            </div>
          </div>
          {aud === "business" && (
            <div className="row">
              <div className="field">
                <label htmlFor="f-org">Business or organisation name *</label>
                <input id="f-org" data-f="organisation" autoComplete="organization" value={f.organisation} onChange={set("organisation")} {...inv("organisation")} />
                {err("organisation")}
              </div>
            </div>
          )}
          {aud === "lawyer" && (
            <div className="row">
              <div className="field">
                <label htmlFor="f-bar">Bar Council Enrolment Number (Optional)</label>
                <input id="f-bar" data-f="enrolment" placeholder="e.g. AP/1234/2015" value={f.enrolment} onChange={set("enrolment")} {...inv("enrolment")} aria-describedby="h-bar" />
                <span className="note" id="h-bar">
                  You can leave this blank. A number entered here is not treated as verification; our team verifies professional status separately.
                </span>
                {err("enrolment")}
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="group">
          <legend>Your requirement</legend>
          <div className="row">
            <div className="field">
              <label htmlFor="f-svc">Choose a service *</label>
              <select id="f-svc" data-f="svc" value={svc} onChange={(e) => (setSvc(e.target.value), setErrs({ ...errs, svc: undefined }))} {...inv("svc")}>
                <option value="">Select a service</option>
                {options.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.name}
                  </option>
                ))}
              </select>
              {err("svc")}
            </div>
            <div className="field">
              <label htmlFor="f-due">Needed-by date *</label>
              <input id="f-due" data-f="due" type="date" min={minDate || undefined} value={f.due} onChange={set("due")} aria-describedby="h-due" aria-invalid={errs.due ? true : undefined} />
              <span className="note" id="h-due">
                {NEEDED_BY_HELP}
                {minDate && ` The earliest date you can choose is ${fmtDay(minDate)}.`}
              </span>
              {err("due")}
            </div>
          </div>
          {svc === "other" && (
            <div className="field">
              <label htmlFor="f-other">Please specify the legal service you require. *</label>
              <input id="f-other" data-f="other" value={f.other} onChange={set("other")} maxLength={200} {...inv("other")} />
              {err("other")}
            </div>
          )}
          {aud === "individual" && (
            <div className="field">
              <span className="flabel" id="topicLbl">
                What is it about? <small>(optional)</small>
              </span>
              <div className="chips" role="radiogroup" aria-labelledby="topicLbl">
                {TOPICS.map((t, i) => (
                  <label key={t}>
                    <input type="radio" name="topic" id={`tp${i}`} value={t} checked={f.topic === t} onChange={set("topic")} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="f-msg">Description of your requirement *</label>
            <textarea id="f-msg" data-f="message" placeholder="Describe the facts and what you need in your own words. Mention any court date or other urgent deadline here." value={f.message} onChange={set("message")} maxLength={8000} {...inv("message")} />
            {err("message")}
          </div>
          <details className="more-fields" open={aud === "lawyer"}>
            <summary>Case details, where applicable</summary>
            <div className="row">
              <div className="field">
                <label htmlFor="f-court">Court or authority</label>
                <input id="f-court" placeholder="e.g. Principal District Court, Kurnool" value={f.court} onChange={set("court")} maxLength={200} />
              </div>
              <div className="field">
                <label htmlFor="f-case">Case number</label>
                <input id="f-case" placeholder="e.g. O.S. No. 123 of 2026" value={f.caseNo} onChange={set("caseNo")} maxLength={80} />
              </div>
              <div className="field">
                <label htmlFor="f-opp">Other party&apos;s name</label>
                <input id="f-opp" value={f.opposite} onChange={set("opposite")} maxLength={200} aria-describedby="h-opp" />
                <span className="note" id="h-opp">
                  Helps us check for conflicts of interest before assigning your matter.
                </span>
              </div>
            </div>
          </details>
          <div className="row">
            <div className="field">
              <label htmlFor="f-mode">How should we contact you?</label>
              <select id="f-mode" value={f.mode} onChange={set("mode")}>
                <option>Phone call</option>
                <option>Email</option>
                <option>WhatsApp</option>
              </select>
            </div>
          </div>
        </fieldset>

        <KeepReady>
          <FileUploader files={files} onChange={setFiles} progress={progress} />
        </KeepReady>

        <fieldset className="group">
          <legend className="sr-only">Consent</legend>
          <label className="check" htmlFor="f-ok">
            <input type="checkbox" id="f-ok" data-f="consent" checked={consent} onChange={(e) => (setConsent(e.target.checked), setErrs({ ...errs, consent: undefined }))} />
            <span>
              I have read the <Link href="/privacy">Privacy Notice</Link>. I agree that Legal Core may use the details and documents I provide to handle
              this request and contact me about it. *
            </span>
          </label>
          {err("consent")}
        </fieldset>

        {formErr && (
          <p className="err" role="alert">
            {formErr}
          </p>
        )}
        <div className="btns">
          <button className="btn" type="submit" disabled={progress != null}>
            {progress != null ? "Submitting…" : "Submit request"}
          </button>
          {!user && (
            <span className="note">
              Have an account? <Link href="/login">Sign in</Link> to keep your requests together. It is optional.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
