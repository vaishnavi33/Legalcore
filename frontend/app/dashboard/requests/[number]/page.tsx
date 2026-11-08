"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusPill } from "@/components/Blocks";
import RequireUser from "@/components/RequireUser";
import { api, ApiError, fmtDate, fmtSize, isAdmin, type RequestDetail, type User } from "@/lib/api";
import { BRANCHES, ROLE_LABELS, STATUS_LABELS } from "@/lib/content";

const REQUESTER_ACTIONS: Record<string, string> = {
  CANCELLED: "Cancel this request",
  UNDER_REVIEW: "I have added the information",
  REVISION_REQUESTED: "Ask for changes",
};

const KIND_LABEL: Record<string, string> = { original: "From requester", working: "Working draft (staff only)", approved: "Final document" };

function useToast() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 3000);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg] as const;
}

function Detail({ user, number }: { user: User; number: string }) {
  const [r, setR] = useState<RequestDetail | null>(null);
  const [err, setErr] = useState("");
  const [toast, setToast] = useToast();
  const [staff, setStaff] = useState<User[]>([]);

  const load = useCallback(() => {
    api<RequestDetail>(`/requests/${number}`)
      .then(setR)
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Could not load this request."));
  }, [number]);

  useEffect(load, [load]);

  const canAssign = !!r && r.can_manage && (isAdmin(user) || (user.roles.includes("branch_manager") && user.branches.some((b) => b.slug === r.branch_slug)));
  useEffect(() => {
    if (canAssign && r) api<User[]>(`/admin/staff?branch=${r.branch_slug}`).then(setStaff).catch(() => setStaff([]));
  }, [canAssign, r?.branch_slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(path: string, init: Parameters<typeof api>[1], done: string) {
    try {
      const res = await api<RequestDetail>(`/requests/${number}${path}`, init);
      setR(res);
      setToast(done);
      return true;
    } catch (e) {
      setToast("");
      alertErr(e);
      return false;
    }
  }
  const [actionErr, setActionErr] = useState("");
  function alertErr(e: unknown) {
    setActionErr(e instanceof ApiError ? e.message : "That did not work. Please try again.");
  }

  if (err)
    return (
      <div className="wrap hero">
        <h1>We could not open this request.</h1>
        <p className="lead">{err}</p>
        <Link className="btn alt" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    );
  if (!r)
    return (
      <div className="wrap hero">
        <p className="muted">Loading…</p>
      </div>
    );

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link> / <span className="mono">{r.request_number}</span>
      </nav>
      <div className="dash-head">
        <div style={{ display: "grid", gap: 6 }}>
          <span className="label mono">{r.request_number}</span>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)" }}>{r.service}</h1>
          <div className="btns">
            <StatusPill status={r.status} label={r.status_label} />
            <span className="muted">
              {r.branch} branch · sent {fmtDate(r.created_at)}
            </span>
          </div>
        </div>
      </div>
      {actionErr && (
        <p className="err" role="alert" style={{ marginBottom: 12 }}>
          {actionErr}
        </p>
      )}
      {r.status === "AWAITING_INFORMATION" && r.is_requester && (
        <p className="banner" style={{ marginBottom: 16 }}>
          Our team needs more information from you. Read their message below, reply or attach papers, then press “I have added the information”.
        </p>
      )}

      <div className="split" style={{ paddingBottom: 40 }}>
        <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
          <div className="card">
            <h3>{r.audience === "lawyer" ? "Brief facts and instructions" : "What happened"}</h3>
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.message}</p>
            <div className="facts" style={{ marginTop: 8 }}>
              {r.topic && (
                <div>
                  <span className="label">Topic</span>
                  <span>{r.topic}</span>
                </div>
              )}
              {r.audience === "lawyer" && (
                <>
                  <div>
                    <span className="label">Enrolment number</span>
                    <span>{r.enrolment_number}</span>
                  </div>
                  {r.court && (
                    <div>
                      <span className="label">Court</span>
                      <span>{r.court}</span>
                    </div>
                  )}
                  {r.case_number && (
                    <div>
                      <span className="label">Case number</span>
                      <span>{r.case_number}</span>
                    </div>
                  )}
                  {r.needed_by && (
                    <div>
                      <span className="label">Needed by</span>
                      <span>{fmtDate(r.needed_by)}</span>
                    </div>
                  )}
                </>
              )}
              {r.preferred_contact && (
                <div>
                  <span className="label">Contact by</span>
                  <span>
                    {r.preferred_contact}
                    {r.preferred_date ? ` · preferred date ${fmtDate(r.preferred_date)}` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Conversation r={r} onSend={(fd) => act("/notes", { method: "POST", body: fd }, "Sent")} />

          <div className="card">
            <h3>Documents</h3>
            {r.documents.length === 0 ? (
              <p className="muted">No documents yet.</p>
            ) : (
              <ul className="files">
                {r.documents.map((d) => (
                  <li key={d.id}>
                    <a href={`/api/v1/requests/${r.request_number}/documents/${d.id}`}>
                      {d.filename}
                      {d.version > 1 ? ` (v${d.version})` : ""}
                    </a>
                    <span className="note">
                      {r.can_manage ? KIND_LABEL[d.kind] : d.kind === "approved" ? "Final document" : "Your upload"} · {fmtSize(d.size)} · {fmtDate(d.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="side">
          <StatusBox r={r} onChange={(status, note) => act("/status", { method: "POST", json: { status, note } }, `Moved to ${STATUS_LABELS[status]}`)} />

          {r.can_manage && (
            <div className="card">
              <h3>Contact</h3>
              <div className="facts">
                <div>
                  <span className="label">Name</span>
                  <span>{r.contact_name}</span>
                </div>
                <div>
                  <span className="label">Mobile</span>
                  <span className="mono">{r.contact_phone}</span>
                </div>
                {r.contact_email && (
                  <div>
                    <span className="label">Email</span>
                    <span style={{ overflowWrap: "anywhere" }}>{r.contact_email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {r.can_manage && (
            <div className="card">
              <h3>Team</h3>
              {r.assignees.length === 0 ? (
                <p className="muted">Nobody assigned yet.</p>
              ) : (
                <ul className="files">
                  {r.assignees.map((a) => (
                    <li key={a.id}>
                      <span>
                        {a.name}
                        <br />
                        <span className="note">{a.roles.map((x) => ROLE_LABELS[x] || x).join(", ")}</span>
                      </span>
                      {canAssign && (
                        <button className="btn ghost small" onClick={() => act(`/assign/${a.id}`, { method: "DELETE" }, `Removed ${a.name}`)}>
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {canAssign && <AssignBox staff={staff.filter((s) => !r.assignees.some((a) => a.id === s.id))} onAssign={(id) => act("/assign", { method: "POST", json: { assignee_id: id } }, "Assigned")} />}
            </div>
          )}

          {canAssign && <TransferBox current={r.branch_slug} onTransfer={(branch, note) => act("/transfer", { method: "POST", json: { branch, note } }, "Transferred").then((ok) => ok && load())} />}

          <div className="card">
            <h3>History</h3>
            <ol className="timeline">
              {r.history.map((h, i) => (
                <li key={i} className={i === r.history.length - 1 ? "t-current" : "t-done"}>
                  <span className="dot" aria-hidden="true">
                    {i === r.history.length - 1 ? "" : "✓"}
                  </span>
                  <span>
                    <b>{h.label}</b>
                    <small>
                      {fmtDate(h.at, true)}
                      {h.by ? ` · ${h.by}` : ""}
                    </small>
                    {h.note && <small>“{h.note}”</small>}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatusBox({ r, onChange }: { r: RequestDetail; onChange: (s: string, note: string) => Promise<boolean> }) {
  const [next, setNext] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  useEffect(() => setNext(""), [r.status]);

  if (!r.allowed_next.length) return null;

  if (!r.can_manage)
    return (
      <div className="card">
        <h3>What would you like to do?</h3>
        <div className="field">
          <label htmlFor="req-note">
            Message <small>(optional)</small>
          </label>
          <textarea id="req-note" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="btns">
          {r.allowed_next.map((s) =>
            s === "CANCELLED" && !confirmCancel ? (
              <button key={s} className="btn ghost small" onClick={() => setConfirmCancel(true)}>
                {REQUESTER_ACTIONS[s]}
              </button>
            ) : (
              <button
                key={s}
                className={`btn small${s === "CANCELLED" ? "" : " alt"}`}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  if (await onChange(s, note)) setNote("");
                  setBusy(false);
                  setConfirmCancel(false);
                }}
              >
                {s === "CANCELLED" ? "Yes, cancel it" : REQUESTER_ACTIONS[s] || STATUS_LABELS[s]}
              </button>
            ),
          )}
        </div>
        {confirmCancel && <p className="note">Cancelling stops all work on this request. Press “Yes, cancel it” to confirm.</p>}
      </div>
    );

  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!next) return;
        setBusy(true);
        if (await onChange(next, note)) setNote("");
        setBusy(false);
      }}
    >
      <h3>Update status</h3>
      <div className="field">
        <label htmlFor="st-next">Move to</label>
        <select id="st-next" value={next} onChange={(e) => setNext(e.target.value)}>
          <option value="">Choose the next step</option>
          {r.allowed_next.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="st-note">
          Message to the requester <small>(optional, they will see it)</small>
        </label>
        <textarea id="st-note" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder={next === "AWAITING_INFORMATION" ? "Say exactly what you need from them" : ""} />
      </div>
      <button className="btn alt small" type="submit" disabled={!next || busy}>
        {busy ? "Saving…" : "Save status"}
      </button>
    </form>
  );
}

function AssignBox({ staff, onAssign }: { staff: User[]; onAssign: (id: string) => Promise<boolean> }) {
  const [id, setId] = useState("");
  return (
    <div className="field" style={{ marginTop: 10 }}>
      <label htmlFor="as-who">Assign someone</label>
      <div className="btns" style={{ flexWrap: "nowrap" }}>
        <select id="as-who" value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Choose a person</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.roles.filter((x) => x !== "client").map((x) => ROLE_LABELS[x] || x).join(", ")}
            </option>
          ))}
        </select>
        <button className="btn alt small" disabled={!id} onClick={async () => (await onAssign(id)) && setId("")}>
          Assign
        </button>
      </div>
    </div>
  );
}

function TransferBox({ current, onTransfer }: { current: string; onTransfer: (b: string, note: string) => Promise<unknown> }) {
  const [b, setB] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="card">
      <h3>Transfer to another branch</h3>
      <p className="note">The other branch takes over the request and its team is chosen again. You will no longer see it unless you manage that branch.</p>
      <div className="field">
        <label htmlFor="tr-branch">Branch</label>
        <select id="tr-branch" value={b} onChange={(e) => setB(e.target.value)}>
          <option value="">Choose a branch</option>
          {BRANCHES.filter((x) => x.slug !== current).map((x) => (
            <option key={x.slug} value={x.slug}>
              {x.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="tr-note">
          Reason <small>(staff only)</small>
        </label>
        <input id="tr-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn ghost small" disabled={!b} onClick={() => onTransfer(b, note)}>
        Transfer
      </button>
    </div>
  );
}

function Conversation({ r, onSend }: { r: RequestDetail; onSend: (fd: FormData) => Promise<boolean> }) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [kind, setKind] = useState("original");
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <div className="card">
      <h3>Messages</h3>
      <div className="thread">
        {r.notes.length === 0 && <p className="muted">No messages yet. {r.can_manage ? "Write to the requester below." : "Our team will write here if they need anything."}</p>}
        {r.notes.map((n) => (
          <div key={n.id} className={`msg${n.internal ? " internal" : n.from_staff ? " staff" : ""}`}>
            <header>
              <b>
                {n.from_staff ? (r.can_manage ? n.author : "Legal Core team") : n.author || "Requester"}
                {n.internal && " · internal note"}
              </b>
              <span>{fmtDate(n.at, true)}</span>
            </header>
            <p>{n.body}</p>
          </div>
        ))}
      </div>
      <form
        style={{ marginTop: 8 }}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim() && !files?.length) return;
          setBusy(true);
          const fd = new FormData();
          fd.append("body", body);
          if (r.can_manage) {
            fd.append("internal", String(internal));
            fd.append("kind", kind);
          }
          Array.from(files || []).forEach((f) => fd.append("files", f));
          if (await onSend(fd)) {
            setBody("");
            setFiles(null);
            setKey((k) => k + 1);
          }
          setBusy(false);
        }}
      >
        <div className="field">
          <label htmlFor="m-body">{r.can_manage ? "Write a message or note" : "Write to our team"}</label>
          <textarea id="m-body" style={{ minHeight: 90 }} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="m-files">
              Attach files <small>(optional)</small>
            </label>
            <input key={key} id="m-files" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setFiles(e.target.files)} />
          </div>
          {r.can_manage && (
            <div className="field">
              <label htmlFor="m-kind">Files are</label>
              <select id="m-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="original">Papers from the requester</option>
                <option value="working">Working draft (staff only)</option>
                <option value="approved">Final document for the requester</option>
              </select>
            </div>
          )}
        </div>
        {r.can_manage && (
          <label className="check" htmlFor="m-internal">
            <input type="checkbox" id="m-internal" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
            <span>Internal note (the requester will not see it)</span>
          </label>
        )}
        <button className="btn alt small" type="submit" disabled={busy || (!body.trim() && !files?.length)}>
          {busy ? "Sending…" : internal ? "Save note" : "Send"}
        </button>
      </form>
    </div>
  );
}

export default function RequestPage() {
  const { number } = useParams<{ number: string }>();
  return <RequireUser>{(u) => <Detail user={u} number={String(number).toUpperCase()} />}</RequireUser>;
}
