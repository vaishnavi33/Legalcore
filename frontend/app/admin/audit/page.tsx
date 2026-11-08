"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import RequireUser from "@/components/RequireUser";
import { api, fmtDate, isAdmin, type User } from "@/lib/api";

interface Row {
  id: number;
  actor: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  detail: Record<string, unknown>;
  ip: string;
  at: string;
}

const ACTIONS = ["", "user.login", "user.login_failed", "request.create", "request.view", "request.status", "request.assign", "request.transfer", "document.download", "user.update", "branch.update"];

function Audit({ user }: { user: User }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [action, setAction] = useState("");
  useEffect(() => {
    api<Row[]>(`/admin/audit-logs${action ? `?action=${action}` : ""}`).then(setRows);
  }, [action]);
  return (
    <div className="wrap">
      <div className="dash-head">
        <h1 style={{ fontSize: "clamp(1.9rem,4vw,2.6rem)" }}>Activity log</h1>
      </div>
      <AdminNav user={user} />
      <div className="filters">
        <select aria-label="Filter by action" value={action} onChange={(e) => setAction(e.target.value)}>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a || "All activity"}
            </option>
          ))}
        </select>
      </div>
      <div className="tablewrap" style={{ marginBottom: 40 }}>
        <table>
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Who</th>
              <th scope="col">Action</th>
              <th scope="col">On</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.at, true)}</td>
                <td>{r.actor || "Visitor"}</td>
                <td className="mono">{r.action}</td>
                <td className="mono">{r.resource_id}</td>
                <td className="note">{Object.entries(r.detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`).join(" · ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Page() {
  return <RequireUser allow={isAdmin}>{(u) => <Audit user={u} />}</RequireUser>;
}
