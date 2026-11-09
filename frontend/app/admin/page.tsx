"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import RequireUser from "@/components/RequireUser";
import { api, ApiError, isManager, type User } from "@/lib/api";

interface Row {
  key: string;
  label: string;
  count: number;
}
interface Report {
  total: number;
  open: number;
  completed: number;
  last_30_days: number;
  by_status: Row[];
  by_branch: Row[];
  by_service: Row[];
  by_priority: Row[];
  overdue: number;
  unallocated: number;
  workload: { id: string; name: string; roles: string[]; open: number }[];
  total_users: number | null;
  pending_verifications: number | null;
}

function Bars({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.key}>
          <span>{r.label}</span>
          <i style={{ width: `${(r.count / max) * 100}%` }} aria-hidden="true" />
          <span>{r.count}</span>
        </div>
      ))}
    </div>
  );
}

function Reports({ user }: { user: User }) {
  const [rep, setRep] = useState<Report | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<Report>("/admin/reports")
      .then(setRep)
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Could not load reports."));
  }, []);
  return (
    <div className="wrap">
      <div className="dash-head">
        <div style={{ display: "grid", gap: 6 }}>
          <span className="label">{user.roles.includes("admin") || user.roles.includes("super_admin") ? "All branches" : user.branches.map((b) => b.name).join(", ")}</span>
          <h1 className="h-dash">Reports</h1>
        </div>
      </div>
      <AdminNav user={user} />
      {err && <p className="err">{err}</p>}
      {!rep ? (
        <p className="muted">Loading…</p>
      ) : (
        <div style={{ display: "grid", gap: 20, paddingBottom: 40 }}>
          <div className="stats">
            <div className="stat">
              <span className="label">All requests</span>
              <b>{rep.total}</b>
            </div>
            <div className="stat">
              <span className="label">Open now</span>
              <b>{rep.open}</b>
            </div>
            <div className="stat">
              <span className="label">Completed</span>
              <b>{rep.completed}</b>
            </div>
            <div className="stat">
              <span className="label">Last 30 days</span>
              <b>{rep.last_30_days}</b>
            </div>
            <div className="stat">
              <span className="label">Past required date</span>
              <b>{rep.overdue}</b>
            </div>
            <div className="stat">
              <span className="label">Waiting for allocation</span>
              <b>{rep.unallocated}</b>
            </div>
            {rep.total_users != null && (
              <div className="stat">
                <span className="label">Registered people</span>
                <b>{rep.total_users}</b>
              </div>
            )}
            {rep.pending_verifications != null && (
              <div className="stat">
                <span className="label">Enrolments to verify</span>
                <b>{rep.pending_verifications}</b>
              </div>
            )}
          </div>
          <div className="grid">
            <div className="card">
              <h3>By branch</h3>
              <Bars rows={rep.by_branch} />
            </div>
            <div className="card">
              <h3>By status</h3>
              {rep.by_status.length ? <Bars rows={rep.by_status} /> : <p className="muted">No requests yet.</p>}
            </div>
          </div>
          <div className="grid">
            <div className="card">
              <h3>Open matters by priority</h3>
              <p className="note">Priority is set by staff for internal planning. It is not a legal assessment of the matter.</p>
              <Bars rows={rep.by_priority} />
            </div>
            <div className="card">
              <h3>Staff workload (open assignments)</h3>
              {rep.workload.length ? <Bars rows={rep.workload.map((w) => ({ key: w.id, label: w.name, count: w.open }))} /> : <p className="muted">No open assignments.</p>}
            </div>
          </div>
          <div className="card">
            <h3>By service</h3>
            <Bars rows={rep.by_service} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return <RequireUser allow={isManager}>{(u) => <Reports user={u} />}</RequireUser>;
}
