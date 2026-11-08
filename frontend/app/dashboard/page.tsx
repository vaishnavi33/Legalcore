"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusPill } from "@/components/Blocks";
import RequireUser from "@/components/RequireUser";
import { api, ApiError, fmtDate, isAdmin, isLawyer, isManager, isStaff, type RequestSummary, type User } from "@/lib/api";
import { BRANCHES, ROLE_LABELS, SERVICES, STATUS_LABELS } from "@/lib/content";

interface ListOut {
  items: RequestSummary[];
  total: number;
  page: number;
  page_size: number;
}

function NewRequestMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const items: [string, string][] = [
    ["Ask a legal question", "/individuals/legal-query"],
    ["Book an advocate consultation", "/individuals/consultation"],
    ["Get help with documents", "/individuals/documents"],
    ["Agreement drafting", "/services/agreement-drafting#request"],
    ["Legal notice", "/services/legal-notices#request"],
  ];
  const lawyer: [string, string][] = [
    ["Case drafting", "/lawyers/drafting"],
    ["Legal research", "/lawyers/research"],
    ["Document preparation", "/lawyers/documents"],
  ];
  return (
    <div className={`dd right${open ? " open" : ""}`} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}>
      <button type="button" className="btn" aria-expanded={open} aria-controls="new-req" onClick={() => setOpen(!open)}>
        + New request
      </button>
      <div className="panel" id="new-req" hidden={!open}>
        {isLawyer(user) && (
          <>
            <span className="note" style={{ padding: "6px 12px 0" }}>
              For your cases
            </span>
            {lawyer.map(([t, h]) => (
              <Link key={h} href={h}>
                {t}
              </Link>
            ))}
            <span className="note" style={{ padding: "6px 12px 0", borderTop: "1px solid var(--line)" }}>
              For yourself
            </span>
          </>
        )}
        {items.map(([t, h]) => (
          <Link key={h} href={h}>
            {t}
          </Link>
        ))}
        {!isLawyer(user) && (
          <Link className="all" href="/lawyers/drafting">
            I am a lawyer →
          </Link>
        )}
      </div>
    </div>
  );
}

function RequestTable({ rows, showContact }: { rows: RequestSummary[]; showContact: boolean }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Request</th>
            <th scope="col">Service</th>
            {showContact && <th scope="col">From</th>}
            <th scope="col">Branch</th>
            <th scope="col">Status</th>
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
                {r.audience === "lawyer" && (
                  <>
                    {" "}
                    <span className="tag">Lawyer</span>
                  </>
                )}
              </td>
              {showContact && <td>{r.contact_name}</td>}
              <td>{r.branch}</td>
              <td>
                <StatusPill status={r.status} label={r.status_label} />
              </td>
              <td>{fmtDate(r.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MyRequests({ user }: { user: User }) {
  const [data, setData] = useState<ListOut | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<ListOut>("/requests?scope=mine&page_size=50")
      .then(setData)
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Could not load your requests."));
  }, []);
  if (err) return <p className="err">{err}</p>;
  if (!data) return <p className="muted">Loading your requests…</p>;
  if (!data.items.length)
    return (
      <div className="card empty-state">
        <h3>You have not sent any requests yet.</h3>
        <p className="muted">Start one now. You can track it here and get messages and documents from our team.</p>
        <NewRequestMenu user={user} />
      </div>
    );
  return <RequestTable rows={data.items} showContact={false} />;
}

function WorkQueue({ user }: { user: User }) {
  const [status, setStatus] = useState("");
  const [branch, setBranch] = useState("");
  const [service, setService] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListOut | null>(null);
  const [err, setErr] = useState("");
  const branchOptions = isAdmin(user) ? BRANCHES.map((b) => ({ slug: b.slug, name: b.name })) : user.branches;

  const load = useCallback(() => {
    const p = new URLSearchParams({ scope: "work", page: String(page), page_size: "20" });
    if (status) p.set("status", status);
    if (branch) p.set("branch", branch);
    if (service) p.set("service", service);
    if (q.trim()) p.set("q", q.trim());
    api<ListOut>(`/requests?${p}`)
      .then((d) => {
        setData(d);
        setErr("");
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Could not load the work queue."));
  }, [status, branch, service, q, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  return (
    <>
      <div className="filters">
        <select aria-label="Filter by status" value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {branchOptions.length > 1 && (
          <select aria-label="Filter by branch" value={branch} onChange={(e) => (setBranch(e.target.value), setPage(1))}>
            <option value="">All my branches</option>
            {branchOptions.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        <select aria-label="Filter by service" value={service} onChange={(e) => (setService(e.target.value), setPage(1))}>
          <option value="">All services</option>
          {SERVICES.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
          <option value="legal-query">Legal Query</option>
        </select>
        <input type="search" aria-label="Search by name, mobile or request number" placeholder="Name, mobile or request number" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
      </div>
      {err && <p className="err">{err}</p>}
      {!data ? (
        <p className="muted">Loading…</p>
      ) : data.items.length ? (
        <>
          <RequestTable rows={data.items} showContact />
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
          <p className="muted">Requests for your branch, or assigned to you, appear here.</p>
        </div>
      )}
    </>
  );
}

function Dashboard({ user }: { user: User }) {
  const staff = isStaff(user);
  const [tab, setTab] = useState<"mine" | "work">(staff ? "work" : "mine");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "mine" || (t === "work" && staff)) setTab(t);
  }, [staff]);

  return (
    <div className="wrap">
      <div className="dash-head">
        <div style={{ display: "grid", gap: 6 }}>
          <span className="label">{user.roles.map((r) => ROLE_LABELS[r] || r).join(" · ")}</span>
          <h1 style={{ fontSize: "clamp(1.9rem,4vw,2.6rem)" }}>Namaste, {user.name.split(" ")[0]}.</h1>
          {user.branches.length > 0 && <p className="muted">Branch: {user.branches.map((b) => b.name).join(", ")}</p>}
        </div>
        <div className="btns">
          {isManager(user) && (
            <Link className="btn ghost" href="/admin">
              Reports
            </Link>
          )}
          <NewRequestMenu user={user} />
        </div>
      </div>
      {isLawyer(user) && user.lawyer_status === "pending" && (
        <p className="banner">Your enrolment number ({user.enrolment_number}) is being verified. You can send drafting requests in the meantime.</p>
      )}
      <div className="tabs" role="tablist">
        {staff && (
          <button role="tab" aria-selected={tab === "work"} onClick={() => setTab("work")}>
            Work queue
          </button>
        )}
        <button role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")}>
          My requests
        </button>
      </div>
      <div role="tabpanel">{tab === "work" && staff ? <WorkQueue user={user} /> : <MyRequests user={user} />}</div>
    </div>
  );
}

export default function DashboardPage() {
  return <RequireUser>{(u) => <Dashboard user={u} />}</RequireUser>;
}
