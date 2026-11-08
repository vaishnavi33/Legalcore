"use client";

import { useEffect, useState } from "react";
import { api, ApiError, fmtDate } from "@/lib/api";
import Timeline, { PREVIEW_STEPS, type Step } from "./Timeline";

interface TrackOut {
  request_number: string;
  service: string;
  branch: string;
  status: string;
  status_label: string;
  created_at: string;
  steps: Step[];
  updates: { label: string; note: string; at: string }[];
}

export default function TrackForm() {
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<TrackOut | null>(null);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("ref");
    if (r) setRef(r.toUpperCase());
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (ref.trim().length < 8) return setErr("Enter your request number, for example LC-HYD-AB12-CD34.");
    if (phone.replace(/\D/g, "").length < 10) return setErr("Enter the 10-digit mobile number you used.");
    setErr("");
    setBusy(true);
    try {
      setRes(await api<TrackOut>("/track", { method: "POST", json: { request_number: ref, phone } }));
    } catch (e2) {
      setRes(null);
      setErr(e2 instanceof ApiError ? e2.message : "Could not check the status. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="split">
      <div className="desk">
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="t-ref">Request number</label>
            <input id="t-ref" placeholder="e.g. LC-HYD-AB12-CD34" autoCapitalize="characters" value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} />
          </div>
          <div className="field">
            <label htmlFor="t-phone">Mobile number</label>
            <input id="t-phone" type="tel" inputMode="numeric" placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {err && (
            <p className="err" role="alert">
              {err}
            </p>
          )}
          <button className="btn alt" type="submit" disabled={busy}>
            {busy ? "Checking…" : "Check status"}
          </button>
        </form>
        <p className="note">For your privacy this page shows the status only. Sign in to see messages and documents.</p>
      </div>
      <div className="card" aria-live="polite">
        {res ? (
          <>
            <span className="label">{res.request_number}</span>
            <h3>
              {res.service} · {res.branch}
            </h3>
            <p className="muted">Sent on {fmtDate(res.created_at)}</p>
            <Timeline steps={res.steps} />
            {res.updates.some((u) => u.note) && (
              <div className="thread">
                <b>Updates from our team</b>
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
            )}
          </>
        ) : (
          <>
            <h3>Status steps</h3>
            <p className="muted">Every request moves through these steps.</p>
            <Timeline steps={PREVIEW_STEPS} />
          </>
        )}
      </div>
    </div>
  );
}
