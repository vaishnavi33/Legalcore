"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PriorityPill, StatusPill } from "@/components/Blocks";
import RequireUser from "@/components/RequireUser";
import {
  api,
  ApiError,
  fmtDate,
  fmtDay,
  indiaToday,
  isAdmin,
  isBusiness,
  isLawyer,
  isManager,
  isReviewer,
  isStaff,
  type RequestSummary,
  type User,
} from "@/lib/api";
import { BRANCHES, PRIORITY_LABELS, ROLE_LABELS, SERVICES, STATUS_LABELS } from "@/lib/content";

interface ListOut {
  items: RequestSummary[];
  total: number;
  page: number;
  page_size: number;
}

interface Note {
  id: number;
  subject: string;
  body: string;
  request_number: string | null;
  read: boolean;
  at: string;
}

const OPEN = new Set(Object.keys(STATUS_LABELS).filter((s) => s !== "COMPLETED" && s !== "CANCELLED"));

function actionsFor(user: User): [string, string][] {
  const out: [string, string][] = [];
  if (isLawyer(user))
    out.push(["Submit drafting request", "/lawyers/drafting"], ["Submit research request", "/lawyers/research"], ["Submit document preparation request", "/lawyers/documents"]);
  if (isBusiness(user))
    out.push(["Submit business legal request", "/businesses/support"], ["Business agreements", "/businesses/agreements"], ["Employment documentation", "/businesses/employment"]);
  out.push(["Submit a legal request", "/individuals/request"], ["Ask for a legal opinion", "/individuals/legal-opinion"]);
  return out;
}

function NewRequestMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`dd right${open ? " open" : ""}`} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}>
      <button type="button" className="btn" aria-expanded={open} aria-controls="new-req" onClick={() => setOpen(!open)}>
        + New request
      </button>
      <div className="panel" id="new-req" hidden={!open}>
        {actionsFor(user).map(([t, h]) => (
          <Link key={h} href={h}>
            {t}
          </Link>
        ))}
        {!isLawyer(user) && (
          <Link className="all" href="/lawyers">
            I am a lawyer →
          </Link>
        )}
        {!isBusiness(user) && (
          <Link className="all" href="/businesses">
            For a business →
          </Link>
        )}
      </div>
    </div>
  );
}

function Due({ d, status }: { d: string | null; status: string }) {
  if (!d) return <span className="note">—</span>;
  const overdue = d < indiaToday() && OPEN.has(status);
  return <span className={overdue ? "err" : undefined}>{fmtDay(d)}{overdue ? " (overdue)" : ""}</span>;
}

function RequestTable({ rows, staff }: { rows: RequestSummary[]; staff: boolean }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Reference</th>
            <th scope="col">Service</th>
            {staff && <th scope="col">From</th>}
            {staff && <th scope="col">Branch</th>}
            <th scope="col">Status</th>
            <th scope="col">Needed by</th>
            <th scope="col">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.request_number}>
              <td>
                <Link className="mono" href={`/dashboard/requests/${r.request_number}`}>
                  {r.request_number}
                </Link>
              </td>
              <td>
                {r.service}
                {r.service_other && <span className="note"> · {r.service_other}</span>}
                {staff && r.audience !== "individual" && (
                  <>
                    {" "}
                    <span className={`tag ${r.audience === "business" ? "b" : ""}`}>{r.audience === "lawyer" ? "Lawyer" : "Business"}</span>
                  </>
                )}
              </td>
              {staff && <td>{r.contact_name}</td>}
              {staff && <td>{r.branch || <span className="pill new">Not allocated</span>}</td>}
              <td>
                <StatusPill status={r.status} label={r.status_label} /> {staff && <PriorityPill priority={r.priority} />}
              </td>
              <td>
                <Due d={r.needed_by} status={r.status} />
              </td>
              <td>{fmtDate(r.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useMine() {
  const [data, setData] = useState<ListOut | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<ListOut>("/requests?scope=mine&page_size=100")
      .then(setData)
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Could not load your requests."));
  }, []);
  return { data, err };
}

function ClientOverview({ user }: { user: User }) {
  const { data, err } = useMine();
  if (err) return <p className="err">{err}</p>;
  if (!data) return <p className="muted">Loading…</p>;
  const rows = data.items;
  const open = rows.filter((r) => OPEN.has(r.status));
  const needYou = rows.filter((r) => r.status === "INFORMATION_REQUIRED" || r.status === "CLIENT_REVIEW");
  const done = rows.filter((r) => r.status === "COMPLETED");
  const deadlines = open.filter((r) => r.needed_by).sort((a, b) => (a.needed_by! < b.needed_by! ? -1 : 1));
  return (
    <div className="dash-grid">
      <div className="stats">
        <div className="stat">
          <span className="note">Open requests</span>
          <b>{open.length}</b>
        </div>
        <div className="stat">
          <span className="note">Need your action</span>
          <b>{needYou.length}</b>
        </div>
        <div className="stat">
          <span className="note">Completed</span>
          <b>{done.length}</b>
        </div>
      </div>
      {isLawyer(user) && (
        <div className="card">
          <span className="label">Professional verification</span>
          <p>
            Status: <b>{user.lawyer_status === "verified" ? "Verified" : user.lawyer_status === "rejected" ? "Not verified" : user.lawyer_status === "suspended" ? "Suspended" : "Pending"}</b>
            {user.enrolment_number ? ` · Enrolment number ${user.enrolment_number}` : " · No enrolment number on file"}
          </p>
          <p className="note">Verification is a separate check by our team. You can submit requests while it is pending.</p>
        </div>
      )}
      {needYou.length > 0 && (
        <section>
          <h2 className="h3">Waiting for you</h2>
          <RequestTable rows={needYou} staff={false} />
        </section>
      )}
      {isLawyer(user) && deadlines.length > 0 && (
        <section>
          <h2 className="h3">Deadline tracking</h2>
          <RequestTable rows={deadlines.slice(0, 5)} staff={false} />
        </section>
      )}
      <section>
        <h2 className="h3">Start a request</h2>
        <div className="quick">
          {actionsFor(user).map(([t, h]) => (
            <Link key={h} className="card" href={h}>
              <b>{t}</b>
              <span className="more">Open →</span>
            </Link>
          ))}
        </div>
      </section>
      {rows.length === 0 && (
        <div className="card empty-state">
          <h3>No requests yet.</h3>
          <p className="muted">Requests you send while signed in appear here with their messages and documents.</p>
        </div>
      )}
    </div>
  );
}

function MyRequests() {
  const { data, err } = useMine();
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  if (err) return <p className="err">{err}</p>;
  if (!data) return <p className="muted">Loading your requests…</p>;
  const rows = data.items.filter((r) => (filter === "all" ? true : filter === "open" ? OPEN.has(r.status) : !OPEN.has(r.status)));
  return (
    <>
      <div className="toggle" role="group" aria-label="Show" style={{ marginBottom: 14 }}>
        {(["all", "open", "done"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k === "all" ? "All" : k === "open" ? "Open" : "Completed and cancelled"}
          </button>
        ))}
      </div>
      {rows.length ? <RequestTable rows={rows} staff={false} /> : <p className="muted">No requests to show.</p>}
    </>
  );
}

function Notifications({ onRead }: { onRead: () => void }) {
  const [list, setList] = useState<Note[] | null>(null);
  const load = useCallback(() => api<Note[]>("/notifications").then(setList).catch(() => setList([])), []);
  useEffect(() => {
    load();
  }, [load]);
  if (!list) return <p className="muted">Loading…</p>;
  if (!list.length) return <p className="muted">No notifications yet.</p>;
  return (
    <div className="thread">
      <div>
        <button
          className="btn ghost small"
          type="button"
          onClick={async () => {
            await api("/notifications/read-all", { method: "POST" });
            load();
            onRead();
          }}
        >
          Mark all as read
        </button>
      </div>
      {list.map((n) => (
        <div className={`msg${n.read ? "" : " unread"}`} key={n.id}>
          <header>
            <b>{n.subject}</b>
            <span>{fmtDate(n.at, true)}</span>
          </header>
          <p>{n.body}</p>
          {n.request_number && (
            <Link
              href={`/dashboard/requests/${n.request_number}`}
              onClick={() => {
                if (!n.read) api(`/notifications/${n.id}/read`, { method: "POST" }).then(onRead);
              }}
            >
              Open request {n.request_number} →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

const STAFF_QUEUES: { key: string; label: string; params: Record<string, string> }[] = [
  { key: "new", label: "New incoming", params: { status: "SUBMITTED" } },
  { key: "screening", label: "Under screening", params: { status: "UNDER_SCREENING" } },
  { key: "info", label: "Information required", params: { status: "INFORMATION_REQUIRED" } },
  { key: "mine", label: "Assigned to me", params: { queue: "assigned_to_me" } },
  { key: "progress", label: "Work in progress", params: { status: "IN_PROGRESS" } },
  { key: "due", label: "Due in 7 days", params: { queue: "due_soon" } },
  { key: "overdue", label: "Overdue", params: { queue: "overdue" } },
  { key: "advocate", label: "Advocate review", params: { status: "ADVOCATE_REVIEW" } },
  { key: "quality", label: "Quality review", params: { status: "QUALITY_REVIEW" } },
  { key: "revision", label: "Revision required", params: { status: "REVISION_REQUIRED" } },
  { key: "done", label: "Completed", params: { status: "COMPLETED" } },
];

function StaffOverview({ user, pick }: { user: User; pick: (p: Record<string, string>) => void }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const unalloc = isAdmin(user) || user.roles.includes("support_staff");
  useEffect(() => {
    const qs = unalloc ? [...STAFF_QUEUES, { key: "unalloc", label: "", params: { branch: "unallocated" } }] : STAFF_QUEUES;
    Promise.all(
      qs.map((q) => api<ListOut>(`/requests?${new URLSearchParams({ scope: "work", page_size: "1", ...q.params })}`).then((d) => [q.key, d.total] as const)),
    )
      .then((rows) => setCounts(Object.fromEntries(rows)))
      .catch(() => setCounts({}));
  }, [unalloc]);
  return (
    <div className="dash-grid">
      <div className="stats">
        {unalloc && (
          <button type="button" className="stat" onClick={() => pick({ branch: "unallocated" })}>
            <span className="note">Not yet allocated</span>
            <b>{counts ? (counts.unalloc ?? 0) : "…"}</b>
          </button>
        )}
        {STAFF_QUEUES.filter((q) => q.key !== "advocate" || isReviewer(user) || isManager(user)).map((q) => (
          <button type="button" className="stat" key={q.key} onClick={() => pick(q.params)}>
            <span className="note">{q.label}</span>
            <b className={q.key === "overdue" && counts?.overdue ? "err" : undefined}>{counts ? (counts[q.key] ?? 0) : "…"}</b>
          </button>
        ))}
      </div>
      {isManager(user) && (
        <p>
          <Link href="/admin">Branch statistics, staff workload and reports →</Link>
        </p>
      )}
    </div>
  );
}

function WorkQueue({ user, preset }: { user: User; preset: Record<string, string> }) {
  const [f, setF] = useState({ status: "", branch: "", service: "", priority: "", queue: "", q: "", ...preset });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListOut | null>(null);
  const [err, setErr] = useState("");
  const branchOptions = isAdmin(user) ? BRANCHES.map((b) => ({ slug: b.slug, name: b.name })) : user.branches;
  const unalloc = isAdmin(user) || user.roles.includes("support_staff");

  useEffect(() => {
    setF((cur) => ({ ...cur, status: "", branch: "", queue: "", ...preset }));
    setPage(1);
  }, [preset]);

  const load = useCallback(() => {
    const p = new URLSearchParams({ scope: "work", page: String(page), page_size: "20" });
    for (const [k, v] of Object.entries(f)) if (v.trim()) p.set(k, v.trim());
    api<ListOut>(`/requests?${p}`)
      .then((d) => {
        setData(d);
        setErr("");
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Could not load the work queue."));
  }, [f, page]);

  useEffect(() => {
    const t = setTimeout(load, f.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, f.q]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setF({ ...f, [k]: e.target.value });
    setPage(1);
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  return (
    <>
      <div className="filters">
        <select aria-label="Filter by status" value={f.status} onChange={set("status")}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select aria-label="Filter by queue" value={f.queue} onChange={set("queue")}>
          <option value="">Any deadline</option>
          <option value="open">All open</option>
          <option value="due_soon">Due in 7 days</option>
          <option value="overdue">Overdue</option>
          <option value="assigned_to_me">Assigned to me</option>
        </select>
        <select aria-label="Filter by priority" value={f.priority} onChange={set("priority")}>
          <option value="">Any priority</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {(branchOptions.length > 1 || unalloc) && (
          <select aria-label="Filter by branch" value={f.branch} onChange={set("branch")}>
            <option value="">All branches I can see</option>
            {unalloc && <option value="unallocated">Not yet allocated</option>}
            {branchOptions.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <select aria-label="Filter by service" value={f.service} onChange={set("service")}>
          <option value="">All services</option>
          {SERVICES.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
        <input type="search" aria-label="Search by name, mobile or reference" placeholder="Name, mobile or reference" value={f.q} onChange={set("q")} />
      </div>
      {err && <p className="err">{err}</p>}
      {!data ? (
        <p className="muted">Loading…</p>
      ) : data.items.length ? (
        <>
          <RequestTable rows={data.items} staff />
          <div className="btns" style={{ marginTop: 12, justifyContent: "space-between" }}>
            <span className="note">
              {data.total} request{data.total === 1 ? "" : "s"}
            </span>
            {pages > 1 && (
              <span className="btns">
                <button className="btn ghost small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  ← Previous
                </button>
                <span className="note">
                  Page {page} of {pages}
                </span>
                <button className="btn ghost small" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                  Next →
                </button>
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="card empty-state">
          <h3>Nothing here right now.</h3>
          <p className="muted">Requests for your branches, or assigned to you, appear here.</p>
        </div>
      )}
    </>
  );
}

type Tab = "overview" | "mine" | "notifications" | "work";

function Dashboard({ user }: { user: User }) {
  const staff = isStaff(user);
  const [tab, setTab] = useState<Tab>(staff ? "work" : "overview");
  const [preset, setPreset] = useState<Record<string, string>>({});
  const [unread, setUnread] = useState(0);
  const refreshUnread = useCallback(() => {
    api<{ unread: number }>("/notifications/unread").then((d) => setUnread(d.unread)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && ["overview", "mine", "notifications"].includes(t)) setTab(t);
    if (t === "work" && staff) setTab("work");
    refreshUnread();
  }, [staff, refreshUnread]);

  const tabs: [Tab, string][] = staff
    ? [["work", "Work queue"], ["overview", "My overview"], ["mine", "My requests"], ["notifications", `Notifications${unread ? ` (${unread})` : ""}`]]
    : [["overview", "Overview"], ["mine", "My requests"], ["notifications", `Notifications${unread ? ` (${unread})` : ""}`]];

  return (
    <div className="wrap">
      <div className="dash-head">
        <div style={{ display: "grid", gap: 6 }}>
          <span className="label">{user.roles.map((r) => ROLE_LABELS[r] || r).join(" · ")}</span>
          <h1 style={{ fontSize: "clamp(1.9rem,4vw,2.5rem)" }}>Welcome, {user.name.split(" ")[0]}.</h1>
          {user.branches.length > 0 && <p className="muted">Branch: {user.branches.map((b) => b.name).join(", ")}</p>}
        </div>
        <div className="btns">
          {isManager(user) && (
            <Link className="btn ghost" href="/admin">
              Reports and admin
            </Link>
          )}
          <NewRequestMenu user={user} />
        </div>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "work" && staff && (
          <>
            <StaffOverview user={user} pick={(p) => setPreset({ ...p })} />
            <div style={{ marginTop: 24 }}>
              <WorkQueue user={user} preset={preset} />
            </div>
          </>
        )}
        {tab === "overview" && <ClientOverview user={user} />}
        {tab === "mine" && <MyRequests />}
        {tab === "notifications" && <Notifications onRead={refreshUnread} />}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return <RequireUser>{(u) => <Dashboard user={u} />}</RequireUser>;
}
