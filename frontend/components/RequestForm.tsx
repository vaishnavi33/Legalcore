"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError, isLawyer } from "@/lib/api";
import { BRANCHES, LEGAL_QUERY, SERVICES, TOPICS } from "@/lib/content";
import { useUser } from "./UserProvider";

type Audience = "lawyer" | "individual";

interface Created {
  request_number: string;
  status_label: string;
  service: string;
  branch: string;
  branch_phone: string;
  files_received: number;
  linked_to_account: boolean;
}

const MAX_FILES = 5;
const MAX_MB = 10;

function servicesFor(aud: Audience) {
  const list = SERVICES.filter((s) => s.who === aud || s.who === "both").map((s) => ({ slug: s.slug, name: s.name }));
  return aud === "individual" ? [{ slug: LEGAL_QUERY.slug, name: "General legal question" }, ...list] : list;
}

export default function RequestForm({
  audience = "individual",
  service = "",
  branch = "",
  title = "Send your request",
  lockAudience = false,
}: {
  audience?: Audience;
  service?: string;
  branch?: string;
  title?: string;
  lockAudience?: boolean;
}) {
  const { user, refresh } = useUser();
  const [aud, setAud] = useState<Audience>(audience);
  const [svc, setSvc] = useState(service);
  const [br, setBr] = useState(branch);
  const [f, setF] = useState({ name: "", phone: "", email: "", enrolment: "", court: "", caseNo: "", due: "", mode: "Phone call", date: "", topic: "", message: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Created | null>(null);

  const options = useMemo(() => servicesFor(aud), [aud]);

  // Pick up ?branch= from links like the home page finder and branch pages.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const b = p.get("branch");
    if (b && BRANCHES.some((x) => x.slug === b)) setBr(b);
  }, []);

  // Fill in what we already know about a signed-in person.
  useEffect(() => {
    if (!user) return;
    setF((cur) => ({
      ...cur,
      name: cur.name || user.name,
      phone: cur.phone || user.mobile || "",
      email: cur.email || user.email || "",
      enrolment: cur.enrolment || user.enrolment_number || "",
    }));
    if (!br && user.branches.length === 1 && !user.roles.some((r) => r !== "client" && r !== "lawyer")) setBr(user.branches[0].slug);
  }, [user, br]);

  useEffect(() => {
    if (svc && !options.some((o) => o.slug === svc)) setSvc("");
  }, [options, svc]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  function pickFiles(list: FileList | null) {
    const arr = Array.from(list || []);
    const big = arr.find((x) => x.size > MAX_MB * 1024 * 1024);
    if (big) return setErr(`${big.name} is larger than ${MAX_MB} MB.`);
    if (arr.length > MAX_FILES) return setErr(`You can attach up to ${MAX_FILES} files.`);
    setErr("");
    setFiles(arr);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const miss: string[] = [];
    if (f.name.trim().length < 2) miss.push("your name");
    if (f.phone.replace(/\D/g, "").length < 10) miss.push("a 10-digit mobile number");
    if (!svc) miss.push("a service");
    if (!br) miss.push("a branch");
    if (aud === "lawyer" && !f.enrolment.trim()) miss.push("your enrolment number");
    if (f.message.trim().length < 5) miss.push(aud === "lawyer" ? "the brief facts" : "what happened");
    if (miss.length) return setErr(`Please add ${miss.join(", ")}.`);
    if (!consent) return setErr("Please tick the box so we can contact you.");
    setErr("");
    setBusy(true);
    const data = {
      audience: aud,
      service: svc,
      branch: br,
      name: f.name,
      phone: f.phone,
      email: f.email || null,
      message: f.message,
      preferred_contact: aud === "individual" ? f.mode : "",
      preferred_date: aud === "individual" && f.date ? f.date : null,
      topic: aud === "individual" ? f.topic : "",
      enrolment_number: aud === "lawyer" ? f.enrolment : "",
      court: aud === "lawyer" ? f.court : "",
      case_number: aud === "lawyer" ? f.caseNo : "",
      needed_by: aud === "lawyer" && f.due ? f.due : null,
      consent,
    };
    const fd = new FormData();
    fd.append("data", JSON.stringify(data));
    files.forEach((file) => fd.append("files", file));
    try {
      const res = await api<Created>("/requests", { method: "POST", body: fd });
      setDone(res);
      if (user && aud === "lawyer" && !isLawyer(user)) refresh();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not send your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDone(null);
    setFiles([]);
    setConsent(false);
    setF((cur) => ({ ...cur, message: "", topic: "", court: "", caseNo: "", due: "", date: "" }));
  }

  return (
    <div className="desk" id="request">
      <div className="sec-head" style={{ margin: 0 }}>
        <span className="label">Request form</span>
        <h2>{title}</h2>
        <p className="muted">Fields marked * are required. You can write in English or Telugu.</p>
      </div>

      {done ? (
        <div className="done" role="status">
          <span className="label">Request received</span>
          <h3>Thank you, {f.name.split(" ")[0]}.</h3>
          <p>Your request number is</p>
          <span className="ref">{done.request_number}</span>
          <p>
            Our {done.branch} branch will call you on {f.phone} within one working day about {done.service}.
            {done.files_received > 0 && ` We received ${done.files_received} file${done.files_received > 1 ? "s" : ""}.`} Keep this number to track your request.
          </p>
          <div className="btns">
            {done.linked_to_account ? (
              <Link className="btn alt" href={`/dashboard/requests/${done.request_number}`}>
                Open this request
              </Link>
            ) : (
              <Link className="btn alt" href={`/track-request?ref=${done.request_number}`}>
                Track this request
              </Link>
            )}
            <button className="btn ghost" type="button" onClick={reset}>
              Send another
            </button>
          </div>
          {!done.linked_to_account && (
            <p className="note">
              Tip: <Link href="/register">create a free account</Link> to see all your requests, messages and documents in one place.
            </p>
          )}
        </div>
      ) : (
        <>
          {!lockAudience && (
            <div className="toggle" role="group" aria-label="Who are you?">
              <button type="button" aria-pressed={aud === "individual"} onClick={() => setAud("individual")}>
                I need legal help
              </button>
              <button type="button" aria-pressed={aud === "lawyer"} onClick={() => setAud("lawyer")}>
                I am a lawyer
              </button>
            </div>
          )}
          <form onSubmit={submit} noValidate>
            <div className="row">
              <div className="field">
                <label htmlFor="f-name">Your name *</label>
                <input id="f-name" autoComplete="name" placeholder="e.g. Ramesh Kumar" value={f.name} onChange={set("name")} />
              </div>
              <div className="field">
                <label htmlFor="f-phone">Mobile number *</label>
                <input id="f-phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile number" value={f.phone} onChange={set("phone")} />
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="f-svc">What do you need? *</label>
                <select id="f-svc" value={svc} onChange={(e) => setSvc(e.target.value)}>
                  <option value="">Choose a service</option>
                  {options.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="f-branch">Nearest branch *</label>
                <select id="f-branch" value={br} onChange={(e) => setBr(e.target.value)}>
                  <option value="">Choose a branch</option>
                  {BRANCHES.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name}, {b.state}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="f-email">
                  Email <small>(optional)</small>
                </label>
                <input id="f-email" type="email" autoComplete="email" placeholder="you@example.com" value={f.email} onChange={set("email")} />
              </div>
              {aud === "lawyer" ? (
                <div className="field">
                  <label htmlFor="f-bar">Bar Council enrolment no. *</label>
                  <input id="f-bar" placeholder="e.g. AP/1234/2015" value={f.enrolment} onChange={set("enrolment")} />
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="f-mode">How should we talk to you?</label>
                  <select id="f-mode" value={f.mode} onChange={set("mode")}>
                    <option>Phone call</option>
                    <option>Visit the branch</option>
                    <option>WhatsApp</option>
                  </select>
                </div>
              )}
            </div>
            {aud === "lawyer" ? (
              <div className="row">
                <div className="field">
                  <label htmlFor="f-court">
                    Court and jurisdiction <small>(optional)</small>
                  </label>
                  <input id="f-court" placeholder="e.g. Principal District Court, Kurnool" value={f.court} onChange={set("court")} />
                </div>
                <div className="field">
                  <label htmlFor="f-case">
                    Case number <small>(if filed)</small>
                  </label>
                  <input id="f-case" placeholder="e.g. O.S. No. 123 of 2026" value={f.caseNo} onChange={set("caseNo")} />
                </div>
                <div className="field">
                  <label htmlFor="f-due">
                    Needed by <small>(optional)</small>
                  </label>
                  <input id="f-due" type="date" value={f.due} onChange={set("due")} />
                </div>
              </div>
            ) : (
              <>
                <div className="field">
                  <span className="flabel" id="topicLbl">
                    What is it about?
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
                <div className="row">
                  <div className="field">
                    <label htmlFor="f-date">
                      Preferred date <small>(optional)</small>
                    </label>
                    <input id="f-date" type="date" value={f.date} onChange={set("date")} />
                  </div>
                </div>
              </>
            )}
            <div className="field">
              <label htmlFor="f-msg">{aud === "lawyer" ? "Brief facts and instructions *" : "Tell us what happened *"}</label>
              <textarea id="f-msg" placeholder="Write in your own words." value={f.message} onChange={set("message")} />
            </div>
            <div className="field">
              <label htmlFor="f-files">
                Attach papers <small>(optional: up to {MAX_FILES} files, PDF, Word or photos, {MAX_MB} MB each)</small>
              </label>
              <input id="f-files" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => pickFiles(e.target.files)} />
            </div>
            <label className="check" htmlFor="f-ok">
              <input type="checkbox" id="f-ok" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I agree that Legal Core may contact me about this request and use my details only for it.</span>
            </label>
            {err && (
              <p className="err" role="alert">
                {err}
              </p>
            )}
            <div className="btns">
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Sending…" : aud === "lawyer" ? "Send drafting request" : "Send my request"}
              </button>
              {!user && (
                <span className="note">
                  Have an account? <Link href="/login">Sign in</Link> to keep all your requests together.
                </span>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}
