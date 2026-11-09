"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import RequireUser from "@/components/RequireUser";
import { api, ApiError, fmtDay, isAdmin, type User } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/content";

interface Advocate {
  user_id: string;
  name: string;
  mobile: string | null;
  email: string | null;
  roles: string[];
  enrolment_number: string;
  state_bar_council: string;
  verification_status: "pending" | "verified" | "rejected" | "suspended";
  verified_at: string | null;
  verified_by: string | null;
  verification_note: string;
  practice_location: string;
  experience_areas: string;
  availability: string;
  open_matters: number;
}

const V_LABEL: Record<Advocate["verification_status"], [string, string]> = {
  pending: ["Pending check", "wait"],
  verified: ["Verified", "done"],
  rejected: ["Rejected", "closed"],
  suspended: ["Suspended", "closed"],
};

function Editor({ a, me, onSaved }: { a: Advocate; me: User; onSaved: (a: Advocate) => void }) {
  const [f, setF] = useState({
    enrolment_number: a.enrolment_number,
    state_bar_council: a.state_bar_council,
    practice_location: a.practice_location,
    experience_areas: a.experience_areas,
    availability: a.availability || "available",
  });
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const self = a.user_id === me.id;
  async function save(status?: Advocate["verification_status"]) {
    setErr("");
    setMsg("");
    if (status && status !== "pending" && note.trim().length < 5) {
      return setErr(status === "verified" ? "Record how the enrolment was checked, for example “Checked on the State Bar Council roll on 9 Nov 2026”." : "Please give a reason.");
    }
    try {
      const body: Record<string, string> = { ...f };
      if (status) {
        body.verification_status = status;
        body.verification_note = note.trim();
      }
      const out = await api<Advocate>(`/admin/advocates/${a.user_id}`, { method: "PATCH", json: body });
      onSaved(out);
      setNote("");
      setMsg(status ? `Status changed to ${V_LABEL[status][0].toLowerCase()}.` : "Details saved.");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save.");
    }
  }
  const id = (k: string) => `${k}-${a.user_id}`;
  return (
    <div className="subform">
      <div className="row">
        <div className="field">
          <label htmlFor={id("en")}>Bar Council enrolment number</label>
          <input id={id("en")} maxLength={40} value={f.enrolment_number} onChange={set("enrolment_number")} />
        </div>
        <div className="field">
          <label htmlFor={id("sb")}>State Bar Council</label>
          <input id={id("sb")} maxLength={80} placeholder="e.g. Bar Council of Andhra Pradesh" value={f.state_bar_council} onChange={set("state_bar_council")} />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor={id("pl")}>Practice location</label>
          <input id={id("pl")} maxLength={120} value={f.practice_location} onChange={set("practice_location")} />
        </div>
        <div className="field">
          <label htmlFor={id("av")}>Availability</label>
          <select id={id("av")} value={f.availability} onChange={set("availability")}>
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor={id("ex")}>Areas of experience</label>
        <textarea id={id("ex")} style={{ minHeight: 60 }} maxLength={2000} value={f.experience_areas} onChange={set("experience_areas")} />
      </div>
      <button className="btn ghost small" type="button" onClick={() => save()}>
        Save details
      </button>
      <div className="field">
        <label htmlFor={id("nt")}>Verification note or reason</label>
        <textarea id={id("nt")} style={{ minHeight: 60 }} maxLength={2000} placeholder="How was the enrolment checked? Or why is it rejected or suspended?" value={note} onChange={(e) => setNote(e.target.value)} />
        <small className="note">A submitted number is never proof by itself. Check it against the State Bar Council roll before verifying.</small>
      </div>
      {self ? (
        <p className="note">You cannot change your own verification status.</p>
      ) : (
        <div className="btns">
          {a.verification_status !== "verified" && (
            <button className="btn gold small" type="button" onClick={() => save("verified")}>
              Mark verified
            </button>
          )}
          {a.verification_status !== "rejected" && (
            <button className="btn ghost small" type="button" onClick={() => save("rejected")}>
              Reject
            </button>
          )}
          {a.verification_status === "verified" && (
            <button className="btn danger small" type="button" onClick={() => save("suspended")}>
              Suspend
            </button>
          )}
          {a.verification_status !== "pending" && (
            <button className="btn ghost small" type="button" onClick={() => save("pending")}>
              Back to pending
            </button>
          )}
        </div>
      )}
      {a.verification_note && (
        <p className="note">
          Last note: {a.verification_note}
          {a.verified_by && ` (by ${a.verified_by}${a.verified_at ? `, ${fmtDay(a.verified_at)}` : ""})`}
        </p>
      )}
      {err && <p className="err">{err}</p>}
      {msg && <p className="okmsg">{msg}</p>}
    </div>
  );
}

function Advocates({ user }: { user: User }) {
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [list, setList] = useState<Advocate[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (kind) p.set("kind", kind);
    if (status) p.set("status", status);
    api<Advocate[]>(`/admin/advocates?${p}`)
      .then(setList)
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Could not load."));
  }, [kind, status]);
  useEffect(load, [load]);
  return (
    <div className="wrap">
      <div className="dash-head">
        <div style={{ display: "grid", gap: 6 }}>
          <span className="label">Internal only, never shown on the public website</span>
          <h1 className="h-dash">Advocate verification</h1>
        </div>
      </div>
      <AdminNav user={user} />
      <div className="filters">
        <select aria-label="Who" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Everyone with an enrolment record</option>
          <option value="network">Advocate network (reviewers)</option>
          <option value="lawyers">Lawyers using Legal Core</option>
        </select>
        <select aria-label="Verification status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {Object.entries(V_LABEL).map(([k, [t]]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {err && <p className="err">{err}</p>}
      {!list ? (
        <p className="muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="muted">No one matches these filters.</p>
      ) : (
        <div className="tablewrap" style={{ marginBottom: 40 }}>
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Enrolment</th>
                <th scope="col">Status</th>
                <th scope="col">Open matters</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <Fragment key={a.user_id}>
                  <tr>
                    <td>
                      <b>{a.name}</b>
                      <br />
                      <small className="muted">{a.roles.map((r) => ROLE_LABELS[r] || r).join(", ")}</small>
                    </td>
                    <td className="mono">
                      {a.enrolment_number || "—"}
                      {a.state_bar_council && (
                        <>
                          <br />
                          <small>{a.state_bar_council}</small>
                        </>
                      )}
                    </td>
                    <td>
                      <span className={`pill ${V_LABEL[a.verification_status][1]}`}>{V_LABEL[a.verification_status][0]}</span>
                    </td>
                    <td>{a.open_matters}</td>
                    <td>
                      <button className="btn ghost small" aria-expanded={open === a.user_id} onClick={() => setOpen(open === a.user_id ? null : a.user_id)}>
                        {open === a.user_id ? "Close" : "Review"}
                      </button>
                    </td>
                  </tr>
                  {open === a.user_id && (
                    <tr>
                      <td colSpan={5}>
                        <Editor a={a} me={user} onSaved={(n) => setList((l) => l!.map((x) => (x.user_id === n.user_id ? n : x)))} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <RequireUser allow={isAdmin}>{(u) => <Advocates user={u} />}</RequireUser>;
}
