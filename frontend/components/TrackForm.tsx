"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type Doc, fmtDate, fmtSize, upload } from "@/lib/api";
import { DOC_KIND_LABELS } from "@/lib/content";
import FileUploader from "./FileUploader";
import Timeline, { PREVIEW_STEPS, type Step } from "./Timeline";

interface TrackOut {
  request_number: string;
  service: string;
  status: string;
  status_label: string;
  status_explain: string;
  created_at: string;
  steps: Step[];
  updates: { label: string; note: string; at: string }[];
  files_received: number;
  token: string;
}

interface Started {
  challenge_id: string;
  sent_to: string[];
  expires_in: number;
  demo_code: string | null;
}

/** Guest tracking in two steps: reference + mobile, then a one-time code. The short session lives only in memory. */
export default function TrackForm() {
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [ch, setCh] = useState<Started | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<TrackOut | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [okMsg, setOkMsg] = useState("");

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("ref");
    if (r) setRef(r.toUpperCase());
  }, []);

  const headers = (t = res?.token || "") => ({ "X-Track-Token": t });

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (ref.trim().length < 8) return setErr("Enter your request reference number, for example LC-ABCD-2345.");
    if (phone.replace(/\D/g, "").length < 10) return setErr("Enter the 10-digit mobile number you used in the request.");
    setErr("");
    setBusy(true);
    try {
      setCh(await api<Started>("/track/start", { method: "POST", json: { request_number: ref.trim(), phone } }));
      setCode("");
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not start tracking.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setErr("Enter the 6-digit code.");
    setErr("");
    setBusy(true);
    try {
      const out = await api<TrackOut>("/track/verify", { method: "POST", json: { challenge_id: ch!.challenge_id, code: code.trim() } });
      setRes(out);
      setDocs(await api<Doc[]>("/track/documents", { headers: headers(out.token) }));
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not check the code.");
      if (e2 instanceof ApiError && e2.status === 410) setCh(null);
    } finally {
      setBusy(false);
    }
  }

  async function sendMore() {
    if (!files.length || !res) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    setProgress(0);
    setErr("");
    try {
      const out = await upload<TrackOut>("/track/documents", fd, setProgress, headers());
      setRes({ ...out, token: res.token });
      setDocs(await api<Doc[]>("/track/documents", { headers: headers() }));
      setOkMsg(`${files.length} document${files.length > 1 ? "s" : ""} sent.`);
      setFiles([]);
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not send the documents.");
    } finally {
      setProgress(null);
    }
  }

  async function download(d: Doc) {
    try {
      const r = await fetch(`/api/v1/track/documents/${d.id}`, { headers: headers() });
      if (!r.ok) throw new Error();
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = d.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setErr("Could not download the document. Your session may have ended; please verify again.");
    }
  }

  function signOut() {
    setRes(null);
    setCh(null);
    setDocs([]);
    setCode("");
  }

  if (res) {
    return (
      <div className="split">
        <div className="desk">
          <div className="sec-head" style={{ margin: 0 }}>
            <span className="label">Request {res.request_number}</span>
            <h2>{res.status_label}</h2>
            <p className="muted">{res.status_explain}</p>
            <p className="note">
              {res.service} · Submitted {fmtDate(res.created_at)}
            </p>
          </div>
          <Timeline steps={res.steps} />
          {res.updates.some((u) => u.note) && (
            <div>
              <h3 style={{ marginBottom: 10 }}>Updates from Legal Core</h3>
              <div className="thread">
                {res.updates
                  .filter((u) => u.note)
                  .map((u, i) => (
                    <div className="msg staff" key={i}>
                      <header>
                        <span>{u.label}</span>
                        <span>{fmtDate(u.at, true)}</span>
                      </header>
                      <p>{u.note}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
          <button className="btn ghost small" type="button" onClick={signOut}>
            Close
          </button>
        </div>
        <div className="side">
          <div className="card">
            <h3>Documents</h3>
            {docs.length === 0 ? (
              <p className="muted">No documents yet.</p>
            ) : (
              <ul className="files">
                {docs.map((d) => (
                  <li key={d.id}>
                    <span>
                      {d.from_requester ? d.filename : <button className="linkbtn" type="button" onClick={() => download(d)}>{d.filename}</button>}
                      <small className="note"> · {DOC_KIND_LABELS[d.kind]}</small>
                    </span>
                    <span className="note">{fmtSize(d.size)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <h3>Send more documents</h3>
            <FileUploader files={files} onChange={setFiles} progress={progress} />
            {okMsg && <p className="okmsg">{okMsg}</p>}
            {err && (
              <p className="err" role="alert">
                {err}
              </p>
            )}
            <button className="btn small" type="button" disabled={!files.length || progress != null} onClick={sendMore}>
              Send documents
            </button>
            <p className="note">For your security this view closes after 30 minutes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="split">
      <div className="desk">
        {!ch ? (
          <form onSubmit={start} noValidate>
            <span className="label">Step 1 of 2</span>
            <div className="row">
              <div className="field">
                <label htmlFor="t-ref">Request reference number</label>
                <input id="t-ref" className="mono" placeholder="LC-ABCD-2345" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} autoComplete="off" />
              </div>
              <div className="field">
                <label htmlFor="t-phone">Mobile number used in the request</label>
                <input id="t-phone" type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            {err && (
              <p className="err" role="alert">
                {err}
              </p>
            )}
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Checking…" : "Send me a one-time code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} noValidate>
            <span className="label">Step 2 of 2</span>
            <p>
              {ch.sent_to.length
                ? `We have sent a 6-digit code to your ${ch.sent_to.join(" and ")}.`
                : "Messages could not be sent from this demonstration site, so the code is shown below."}{" "}
              It expires in {Math.round(ch.expires_in / 60)} minutes.
            </p>
            {ch.demo_code && (
              <p className="banner">
                Demo only: your code is <b className="mono">{ch.demo_code}</b>
              </p>
            )}
            <div className="field" style={{ maxWidth: 260 }}>
              <label htmlFor="t-code">One-time code</label>
              <input id="t-code" className="mono" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
            {err && (
              <p className="err" role="alert">
                {err}
              </p>
            )}
            <div className="btns">
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Checking…" : "View my request"}
              </button>
              <button className="btn ghost" type="button" onClick={() => (setCh(null), setErr(""))}>
                Start again
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="card">
        <span className="label">What you will see</span>
        <Timeline steps={PREVIEW_STEPS} />
        <p className="note">
          For your privacy, we show request details only after you enter a one-time code. If you have an account, sign in to see full details and documents.
        </p>
      </div>
    </div>
  );
}
