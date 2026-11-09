"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PriorityPill, StatusPill } from "@/components/Blocks";
import FileUploader from "@/components/FileUploader";
import RequireUser from "@/components/RequireUser";
import { api, ApiError, type Doc, fmtDate, fmtDay, fmtSize, isAdmin, isReviewer, type RequestDetail, upload, type User } from "@/lib/api";
import { BRANCHES, DOC_KIND_LABELS, PRIORITY_LABELS, ROLE_LABELS, STATUS_LABELS } from "@/lib/content";

const REQUESTER_ACTIONS: Record<string, string> = {
  CANCELLED: "Cancel this request",
  UNDER_SCREENING: "I have added the information",
  REVISION_REQUIRED: "Ask for changes",
  COMPLETED: "I am satisfied, mark complete",
};
const NEEDS_REASON = new Set(["ON_HOLD", "CANCELLED", "INFORMATION_REQUIRED", "REVISION_REQUIRED"]);
const NOTE_KIND: Record<string, string> = { message: "", review: "Advocate review comment", revision: "Revision request", system: "System" };

function useToast() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 3000);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg] as const;
}

function Fact({ k, v }: { k: string; v?: React.ReactNode }) {
  if (!v) return null;
  return (
    <div>
      <span className="label">{k}</span>
      <span style={{ overflowWrap: "anywhere" }}>{v}</span>
    </div>
  );
}

function Detail({ user, number }: { user: User; number: string }) {
  const [r, setR] = useState<RequestDetail | null>(null);
  const [err, setErr] = useState("");
  const [toast, setToast] = useToast();
  const [actionErr, setActionErr] = useState("");
  const [staff, setStaff] = useState<User[]>([]);

  const load = useCallback(() => {
    api<RequestDetail>(`/requests/${number}`)
      .then(setR)
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Could not load this request."));
  }, [number]);
  useEffect(load, [load]);

  const manage = !!r && r.can_allocate && !!r.branch_slug;
  useEffect(() => {
    if (manage && r) api<User[]>(`/admin/staff?branch=${r.branch_slug}`).then(setStaff).catch(() => setStaff([]));
  }, [manage, r?.branch_slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(path: string, init: Parameters<typeof api>[1], done: string) {
    setActionErr("");
    try {
      setR(await api<RequestDetail>(`/requests/${number}${path}`, init));
      setToast(done);
      return true;
    } catch (e) {
      setActionErr(e instanceof ApiError ? e.message : "That did not work. Please try again.");
      return false;
    }
  }

  if (err)
    return (
      <div className="wrap hero">
        <h1>We could not open this request.</h1>
        <p className="lead">{err}</p>
        <Link className="btn" href="/dashboard">
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

  const s = r.can_manage;
  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link> / <span className="mono">{r.request_number}</span>
      </nav>
      <div className="dash-head">
        <div style={{ display: "grid", gap: 6 }}>
          <span className="label mono">{r.request_number}</span>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)" }}>
            {r.service}
            {r.service_other ? `: ${r.service_other}` : ""}
          </h1>
          <div className="btns">
            <StatusPill status={r.status} label={r.status_label} />
            {s && <PriorityPill priority={r.priority} />}
            <span className="muted">
              {s ? `${r.branch ? `${r.branch} branch` : "Not yet allocated"} · ` : ""}submitted {fmtDate(r.created_at)}
            </span>
          </div>
          {!s && <p className="muted">{r.status_explain}</p>}
        </div>
      </div>
      {actionErr && (
        <p className="err" role="alert" style={{ marginBottom: 12 }}>
          {actionErr}
        </p>
      )}
      {r.status === "INFORMATION_REQUIRED" && r.is_requester && (
        <p className="banner" style={{ marginBottom: 16 }}>
          Our team needs more information from you. Read the message below, reply or add documents, then press “I have added the information”.
        </p>
      )}
      {r.status === "CLIENT_REVIEW" && r.is_requester && (
        <p className="banner" style={{ marginBottom: 16 }}>
          The work is ready for your review. Check the documents shared with you, then mark it complete or ask for changes.
        </p>
      )}

      <div className="split" style={{ paddingBottom: 40 }}>
        <div style={{ display: "grid", gap: 20, minWidth: 0 }}>
          <div className="card">
            <h3>Requirement</h3>
            <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.message}</p>
            <div className="facts" style={{ marginTop: 8 }}>
              <Fact k="Needed by" v={r.needed_by && `${fmtDay(r.needed_by)} (requested, not promised)`} />
              <Fact k="Organisation" v={r.organisation} />
              <Fact k="Topic" v={r.topic} />
              <Fact
                k="Bar Council enrolment number"
                v={r.audience === "lawyer" && (r.enrolment_number ? `${r.enrolment_number} · ${r.enrolment_verified ? "verified" : "not verified"}` : "Not provided")}
              />
              <Fact k="Court or authority" v={r.court} />
              <Fact k="Case number" v={r.case_number} />
              <Fact k="Other party" v={r.opposite_party} />
              <Fact k="Contact by" v={r.preferred_contact} />
            </div>
            {r.requires_advocate && s && <p className="note">This service must pass advocate review before quality review.</p>}
          </div>

          <Documents r={r} user={user} onChanged={setR} setToast={setToast} setErr={setActionErr} />
          <Conversation r={r} user={user} onSend={(fd) => upload<RequestDetail>(`/requests/${number}/notes`, fd).then((x) => (setR(x), setToast("Sent"), true))} setErr={setActionErr} />
        </div>

        <aside className="side">
          <StatusBox r={r} onChange={(status, note, internal_note) => act("/status", { method: "POST", json: { status, note, internal_note } }, `Moved to ${STATUS_LABELS[status]}`)} />

          {s && (
            <div className="card">
              <h3>Requester</h3>
              <div className="facts">
                <Fact k="Name" v={r.contact_name} />
                <Fact k="Mobile" v={<span className="mono">{r.contact_phone}</span>} />
                <Fact k="Email" v={r.contact_email} />
                <Fact k="Customer type" v={r.audience === "lawyer" ? "Lawyer" : r.audience === "business" ? "Business" : "Individual"} />
              </div>
            </div>
          )}

          {s && <PriorityBox r={r} onSave={(priority, reason) => act("/priority", { method: "POST", json: { priority, reason } }, "Priority saved")} />}

          {r.can_allocate && (
            <AllocateBox
              current={r.branch_slug}
              onSave={(branch, note) => act("/transfer", { method: "POST", json: { branch, note } }, r.branch_slug ? "Transferred" : "Allocated").then((ok) => ok && load())}
            />
          )}

          {s && (
            <div className="card">
              <h3>Assigned team</h3>
              {r.assignees.length === 0 ? (
                <p className="muted">Nobody assigned yet.</p>
              ) : (
                <ul className="files">
                  {r.assignees.map((a) => (
                    <li key={a.id}>
                      <span>
                        {a.name}
                        <br />
                        <span className="note">
                          {a.roles.map((x) => ROLE_LABELS[x] || x).join(", ")}
                          {a.conflict_checked ? " · conflict check recorded" : ""}
                        </span>
                      </span>
                      {manage && (
                        <button className="btn ghost small" onClick={() => act(`/assign/${a.id}`, { method: "DELETE" }, `Removed ${a.name}`)}>
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {manage && (
                <AssignBox
                  number={r.request_number}
                  staff={staff.filter((x) => !r.assignees.some((a) => a.id === x.id))}
                  onAssign={(id, note) => act("/assign", { method: "POST", json: { assignee_id: id, conflict_checked: true, conflict_note: note } }, "Assigned")}
                />
              )}
              {!r.branch_slug && <p className="note">Allocate the request to a branch before assigning staff.</p>}
            </div>
          )}

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
                    {h.internal_note && <small className="internal-note">Internal: {h.internal_note}</small>}
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

function Documents({
  r,
  user,
  onChanged,
  setToast,
  setErr,
}: {
  r: RequestDetail;
  user: User;
  onChanged: (r: RequestDetail) => void;
  setToast: (s: string) => void;
  setErr: (s: string) => void;
}) {
  const s = r.can_manage;
  const [files, setFiles] = useState<File[]>([]);
  const [kind, setKind] = useState(s ? "draft" : "original");
  const [share, setShare] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  async function open(d: Doc, inline: boolean) {
    try {
      const l = await api<{ url: string }>(`/requests/${r.request_number}/documents/${d.id}/link`, { method: "POST" });
      window.open(`${l.url}${inline ? "" : "?inline=false"}`, "_blank", "noopener");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not open the document.");
    }
  }
  async function patch(d: Doc, body: Record<string, unknown>, msg: string) {
    try {
      onChanged(await api<RequestDetail>(`/requests/${r.request_number}/documents/${d.id}`, { method: "PATCH", json: body }));
      setToast(msg);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not update the document.");
    }
  }
  async function send() {
    if (!files.length) return;
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("share", String(share));
    files.forEach((f) => fd.append("files", f));
    setProgress(0);
    try {
      onChanged(await upload<RequestDetail>(`/requests/${r.request_number}/notes`, fd, setProgress));
      setFiles([]);
      setToast("Documents uploaded");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not upload.");
    } finally {
      setProgress(null);
    }
  }

  const kinds = ["draft", "revised_draft", "under_review", ...(isReviewer(user) ? ["advocate_reviewed"] : []), "final"];
  const canPreview = (d: Doc) => /\.(pdf|png|jpe?g)$/i.test(d.filename);
  return (
    <div className="card">
      <h3>Documents</h3>
      {r.documents.length === 0 ? (
        <p className="muted">No documents yet.</p>
      ) : (
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Document</th>
                <th scope="col">Status</th>
                <th scope="col">Uploaded</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {r.documents.map((d) => (
                <tr key={d.id} className={d.kind === "superseded" ? "muted" : undefined}>
                  <td>
                    <b style={{ overflowWrap: "anywhere" }}>{d.filename}</b>
                    <br />
                    <span className="note">
                      v{d.version} · {fmtSize(d.size)}
                      {s && d.scan_status !== "clean" ? " · not virus-scanned" : ""}
                    </span>
                  </td>
                  <td>
                    {s && d.kind !== "original" ? (
                      <select aria-label={`Status of ${d.filename}`} value={d.kind} onChange={(e) => patch(d, { kind: e.target.value }, "Document updated")}>
                        {[...new Set([d.kind, ...kinds, "superseded"])].map((k) => (
                          <option key={k} value={k}>
                            {DOC_KIND_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      DOC_KIND_LABELS[d.kind]
                    )}
                    {s && !["original", "under_review", "final"].includes(d.kind) && (
                      <label className="check" style={{ marginTop: 6, fontSize: "0.85rem" }}>
                        <input type="checkbox" checked={d.shared_with_client} onChange={(e) => patch(d, { shared_with_client: e.target.checked }, e.target.checked ? "Shared with requester" : "Hidden from requester")} />
                        <span>Shared with requester</span>
                      </label>
                    )}
                  </td>
                  <td>
                    {fmtDate(d.at, true)}
                    {s && d.uploaded_by && (
                      <>
                        <br />
                        <span className="note">{d.uploaded_by}</span>
                      </>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {canPreview(d) && (
                      <button className="linkbtn" type="button" onClick={() => open(d, true)}>
                        Preview
                      </button>
                    )}{" "}
                    <button className="linkbtn" type="button" onClick={() => open(d, false)}>
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="subform">
        <h4>{s ? "Upload a version" : "Add more documents"}</h4>
        {s && (
          <div className="row">
            <div className="field">
              <label htmlFor="d-kind">These files are</label>
              <select id="d-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {DOC_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            {kind !== "final" && kind !== "under_review" && (
              <label className="check" style={{ alignSelf: "end" }}>
                <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />
                <span>Share with the requester now</span>
              </label>
            )}
          </div>
        )}
        <FileUploader files={files} onChange={setFiles} progress={progress} />
        <button className="btn small" type="button" disabled={!files.length || progress != null} onClick={send}>
          Upload
        </button>
        {s && <p className="note">Final documents are shared with the requester automatically. Uploading a new final with the same file name marks the old one superseded.</p>}
      </div>
    </div>
  );
}

function StatusBox({ r, onChange }: { r: RequestDetail; onChange: (s: string, note: string, internal: string) => Promise<boolean> }) {
  const [next, setNext] = useState("");
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  useEffect(() => setNext(""), [r.status]);

  if (!r.allowed_next.length) return null;

  if (!r.can_manage)
    return (
      <div className="card">
        <h3>Your next step</h3>
        <div className="field">
          <label htmlFor="req-note">
            Message <small>(optional)</small>
          </label>
          <textarea id="req-note" style={{ minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="btns">
          {r.allowed_next.map((st) =>
            st === "CANCELLED" && !confirmCancel ? (
              <button key={st} className="btn danger small" onClick={() => setConfirmCancel(true)}>
                {REQUESTER_ACTIONS[st]}
              </button>
            ) : (
              <button
                key={st}
                className={`btn small${st === "CANCELLED" ? " danger" : ""}`}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  if (await onChange(st, note, "")) setNote("");
                  setBusy(false);
                  setConfirmCancel(false);
                }}
              >
                {st === "CANCELLED" ? "Yes, cancel it" : REQUESTER_ACTIONS[st] || STATUS_LABELS[st]}
              </button>
            ),
          )}
        </div>
        {confirmCancel && <p className="note">Cancelling stops all work on this request. Press “Yes, cancel it” to confirm.</p>}
      </div>
    );

  const needReason = NEEDS_REASON.has(next);
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!next) return;
        setBusy(true);
        if (await onChange(next, note, internal)) {
          setNote("");
          setInternal("");
        }
        setBusy(false);
      }}
    >
      <h3>Update status</h3>
      <div className="field">
        <label htmlFor="st-next">Move to</label>
        <select id="st-next" value={next} onChange={(e) => setNext(e.target.value)}>
          <option value="">Choose the next step</option>
          {r.allowed_next.map((st) => (
            <option key={st} value={st}>
              {STATUS_LABELS[st]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="st-note">
          Message to the requester <small>(they will see it)</small>
        </label>
        <textarea id="st-note" style={{ minHeight: 64 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder={next === "INFORMATION_REQUIRED" ? "Say exactly what you need from them" : ""} />
      </div>
      <div className="field">
        <label htmlFor="st-int">
          Internal reason <small>(staff only)</small>
        </label>
        <textarea id="st-int" style={{ minHeight: 54 }} value={internal} onChange={(e) => setInternal(e.target.value)} />
      </div>
      {needReason && <p className="note">A reason is required for this step, in either box.</p>}
      <button className="btn small" type="submit" disabled={!next || busy || (needReason && !note.trim() && !internal.trim())}>
        {busy ? "Saving…" : "Save status"}
      </button>
    </form>
  );
}

function PriorityBox({ r, onSave }: { r: RequestDetail; onSave: (p: string, reason: string) => Promise<boolean> }) {
  const [p, setP] = useState(r.priority);
  const [reason, setReason] = useState("");
  useEffect(() => setP(r.priority), [r.priority]);
  return (
    <div className="card">
      <h3>Priority</h3>
      <p className="note">A working priority set after review. It is not a legal assessment of urgency.</p>
      <div className="field">
        <label htmlFor="pr">Priority</label>
        <select id="pr" value={p} onChange={(e) => setP(e.target.value)}>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      {p !== r.priority && (
        <>
          <div className="field">
            <label htmlFor="pr-why">
              Reason <small>(staff only)</small>
            </label>
            <input id="pr-why" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <button className="btn small" type="button" onClick={async () => (await onSave(p, reason)) && setReason("")}>
            Save priority
          </button>
        </>
      )}
    </div>
  );
}

interface Conflict {
  request_number: string;
  service: string;
  match: string;
  created_at: string;
}

function AssignBox({ number, staff, onAssign }: { number: string; staff: User[]; onAssign: (id: string, note: string) => Promise<boolean> }) {
  const [id, setId] = useState("");
  const [hits, setHits] = useState<Conflict[] | null>(null);
  const [ok, setOk] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    setOk(false);
    setNote("");
    setHits(null);
    if (id) api<Conflict[]>(`/requests/${number}/conflicts?assignee_id=${id}`).then(setHits).catch(() => setHits([]));
  }, [id, number]);
  return (
    <div className="subform">
      <div className="field">
        <label htmlFor="as-who">Assign a professional</label>
        <select id="as-who" value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">Choose a person</option>
          {staff.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {x.roles.filter((y) => y !== "client").map((y) => ROLE_LABELS[y] || y).join(", ")}
            </option>
          ))}
        </select>
      </div>
      {id && (
        <>
          <div className={`callout${hits?.length ? " warn" : ""}`}>
            <b>Conflict-of-interest check</b>
            {hits === null ? (
              <p className="note">Checking earlier matters…</p>
            ) : hits.length ? (
              <ul>
                {hits.map((h) => (
                  <li key={h.request_number + h.match}>
                    {h.request_number} ({h.service}): {h.match}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="note">No earlier matters for this person involve the same names. Still confirm there is no other conflict you know of.</p>
            )}
          </div>
          {!!hits?.length && (
            <div className="field">
              <label htmlFor="as-note">Why this assignment is acceptable *</label>
              <input id="as-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          <label className="check">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
            <span>I have checked for conflicts of interest for this assignment.</span>
          </label>
          <button className="btn small" type="button" disabled={!ok || (!!hits?.length && note.trim().length < 5)} onClick={async () => (await onAssign(id, note)) && setId("")}>
            Assign
          </button>
        </>
      )}
    </div>
  );
}

function AllocateBox({ current, onSave }: { current: string | null; onSave: (b: string, note: string) => Promise<unknown> }) {
  const [b, setB] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="card">
      <h3>{current ? "Transfer to another branch" : "Allocate to a branch"}</h3>
      <p className="note">
        {current
          ? "The other branch takes over and chooses its own team. You will no longer see it unless you have access to that branch."
          : "Choose the branch based on workload, location, the service needed and professional availability."}
      </p>
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
          Note <small>(staff only)</small>
        </label>
        <input id="tr-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn small" disabled={!b} onClick={() => onSave(b, note)}>
        {current ? "Transfer" : "Allocate"}
      </button>
    </div>
  );
}

function Conversation({ r, user, onSend, setErr }: { r: RequestDetail; user: User; onSend: (fd: FormData) => Promise<boolean>; setErr: (s: string) => void }) {
  const s = r.can_manage;
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"message" | "internal" | "review" | "revision">("message");
  const [busy, setBusy] = useState(false);
  return (
    <div className="card">
      <h3>Messages</h3>
      <div className="thread">
        {r.notes.length === 0 && <p className="muted">No messages yet. {s ? "Write to the requester below." : "Our team will write here if they need anything."}</p>}
        {r.notes.map((n) => (
          <div key={n.id} className={`msg${n.internal ? " internal" : n.from_staff ? " staff" : ""}${n.kind === "review" ? " review" : ""}`}>
            <header>
              <b>
                {n.from_staff ? (s ? n.author : "Legal Core team") : n.author || "Requester"}
                {n.internal && " · internal note"}
                {NOTE_KIND[n.kind] && ` · ${NOTE_KIND[n.kind]}`}
              </b>
              <span>{fmtDate(n.at, true)}</span>
            </header>
            <p>{n.body}</p>
          </div>
        ))}
      </div>
      <form
        className="subform"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!body.trim()) return;
          setBusy(true);
          const fd = new FormData();
          fd.append("body", body);
          fd.append("internal", String(mode === "internal"));
          fd.append("note_kind", mode === "internal" ? "message" : mode);
          try {
            if (await onSend(fd)) setBody("");
          } catch (e2) {
            setErr(e2 instanceof ApiError ? e2.message : "Could not send.");
          }
          setBusy(false);
        }}
      >
        {s ? (
          <div className="toggle" role="group" aria-label="Message type">
            <button type="button" aria-pressed={mode === "message"} onClick={() => setMode("message")}>
              Message to requester
            </button>
            <button type="button" aria-pressed={mode === "internal"} onClick={() => setMode("internal")}>
              Internal note
            </button>
            {isReviewer(user) && (
              <button type="button" aria-pressed={mode === "review"} onClick={() => setMode("review")}>
                Advocate review comment
              </button>
            )}
          </div>
        ) : (
          (r.status === "CLIENT_REVIEW" || r.status === "COMPLETED") && (
            <label className="check">
              <input type="checkbox" checked={mode === "revision"} onChange={(e) => setMode(e.target.checked ? "revision" : "message")} />
              <span>This message describes changes I need</span>
            </label>
          )
        )}
        <div className="field">
          <label htmlFor="m-body">{mode === "internal" ? "Internal note (never shown to the requester)" : s ? "Message" : "Write to our team"}</label>
          <textarea id="m-body" style={{ minHeight: 90 }} value={body} onChange={(e) => setBody(e.target.value)} maxLength={8000} />
        </div>
        <button className="btn small" type="submit" disabled={busy || !body.trim()}>
          {busy ? "Sending…" : mode === "internal" ? "Save note" : "Send"}
        </button>
        {!s && <p className="note">To send documents, use “Add more documents” above.</p>}
        {s && isAdmin(user) && <span className="sr-only">Administrator</span>}
      </form>
    </div>
  );
}

export default function RequestPage() {
  const { number } = useParams<{ number: string }>();
  return <RequireUser>{(u) => <Detail user={u} number={String(number).toUpperCase()} />}</RequireUser>;
}
