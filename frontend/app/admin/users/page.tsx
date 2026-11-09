"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import RequireUser from "@/components/RequireUser";
import { api, ApiError, isAdmin, type User } from "@/lib/api";
import { BRANCHES, ROLE_LABELS } from "@/lib/content";

const ASSIGNABLE = ["client", "lawyer", "business_client", "drafting_staff", "support_staff", "advocate_reviewer", "branch_manager", "admin", "super_admin"];

function RoleBranchPicker({ roles, branches, setRoles, setBranches, canSuper, idp }: { roles: string[]; branches: string[]; setRoles: (r: string[]) => void; setBranches: (b: string[]) => void; canSuper: boolean; idp: string }) {
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <>
      <div className="field">
        <span className="flabel" id={`${idp}-roles`}>
          Roles
        </span>
        <div className="chips" role="group" aria-labelledby={`${idp}-roles`}>
          {ASSIGNABLE.filter((r) => canSuper || r !== "super_admin").map((r) => (
            <label key={r}>
              <input type="checkbox" checked={roles.includes(r)} onChange={() => setRoles(toggle(roles, r))} />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="flabel" id={`${idp}-br`}>
          Branches <small>(for staff and branch managers)</small>
        </span>
        <div className="chips" role="group" aria-labelledby={`${idp}-br`}>
          {BRANCHES.map((b) => (
            <label key={b.slug}>
              <input type="checkbox" checked={branches.includes(b.slug)} onChange={() => setBranches(toggle(branches, b.slug))} />
              {b.name}
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

function AddStaff({ canSuper, onAdded }: { canSuper: boolean; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", mobile: "", email: "", password: "" });
  const [roles, setRoles] = useState<string[]>(["drafting_staff"]);
  const [branches, setBranches] = useState<string[]>([]);
  const [err, setErr] = useState("");
  if (!open)
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + Add staff member
      </button>
    );
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api("/admin/users", { method: "POST", json: { ...f, email: f.email || null, roles, branches } });
          setOpen(false);
          setF({ name: "", mobile: "", email: "", password: "" });
          onAdded();
        } catch (e2) {
          setErr(e2 instanceof ApiError ? e2.message : "Could not add.");
        }
      }}
    >
      <h3>Add a staff member</h3>
      <div className="row">
        <div className="field">
          <label htmlFor="n-name">Name</label>
          <input id="n-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="n-mobile">Mobile</label>
          <input id="n-mobile" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="n-email">
            Email <small>(optional)</small>
          </label>
          <input id="n-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="n-pass">First password</label>
          <input id="n-pass" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </div>
      </div>
      <RoleBranchPicker idp="new" roles={roles} branches={branches} setRoles={setRoles} setBranches={setBranches} canSuper={canSuper} />
      {err && <p className="err">{err}</p>}
      <div className="btns">
        <button className="btn alt" type="submit">
          Add
        </button>
        <button className="btn ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function EditUser({ u, me, onSaved }: { u: User; me: User; onSaved: () => void }) {
  const [roles, setRoles] = useState(u.roles);
  const [branches, setBranches] = useState(u.branches.map((b) => b.slug));
  const [err, setErr] = useState("");
  const canSuper = me.roles.includes("super_admin");
  async function save(body: object) {
    try {
      await api(`/admin/users/${u.id}`, { method: "PATCH", json: body });
      setErr("");
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save.");
    }
  }
  return (
    <div style={{ display: "grid", gap: 12, padding: "12px 0" }}>
      <RoleBranchPicker idp={u.id} roles={roles} branches={branches} setRoles={setRoles} setBranches={setBranches} canSuper={canSuper} />
      {err && <p className="err">{err}</p>}
      <div className="btns">
        <button className="btn alt small" onClick={() => save({ roles, branches })}>
          Save roles and branches
        </button>
        {u.lawyer_status && (
          <a className="btn ghost small" href="/admin/advocates">
            Enrolment check
          </a>
        )}
        {u.id !== me.id && (
          <button className="btn ghost small" onClick={() => save({ is_active: !u.is_active })}>
            {u.is_active ? "Deactivate account" : "Reactivate account"}
          </button>
        )}
      </div>
    </div>
  );
}

function Users({ user }: { user: User }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [data, setData] = useState<{ items: User[]; total: number } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (role) p.set("role", role);
    api<{ items: User[]; total: number }>(`/admin/users?${p}`).then(setData);
  }, [q, role]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="wrap">
      <div className="dash-head">
        <h1 className="h-dash">People and roles</h1>
        <AddStaff canSuper={user.roles.includes("super_admin")} onAdded={load} />
      </div>
      <AdminNav user={user} />
      <div className="filters">
        <input type="search" aria-label="Search people" placeholder="Name, mobile or email" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Everyone</option>
          {ASSIGNABLE.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="tablewrap" style={{ marginBottom: 40 }}>
          <table>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Mobile / email</th>
                <th scope="col">Roles</th>
                <th scope="col">Branches</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <Fragment key={u.id}>
                  <tr>
                    <td>
                      <b>{u.name}</b>
                      {!u.is_active && (
                        <>
                          {" "}
                          <span className="pill closed">Inactive</span>
                        </>
                      )}
                      {u.lawyer_status === "pending" && (
                        <>
                          {" "}
                          <span className="pill wait">Enrolment to verify</span>
                        </>
                      )}
                    </td>
                    <td className="mono">
                      {u.mobile}
                      {u.email && (
                        <>
                          <br />
                          {u.email}
                        </>
                      )}
                    </td>
                    <td>{u.roles.map((r) => ROLE_LABELS[r] || r).join(", ")}</td>
                    <td>{u.branches.map((b) => b.name).join(", ") || "—"}</td>
                    <td>
                      <button className="btn ghost small" aria-expanded={open === u.id} onClick={() => setOpen(open === u.id ? null : u.id)}>
                        {open === u.id ? "Close" : "Edit"}
                      </button>
                    </td>
                  </tr>
                  {open === u.id && (
                    <tr>
                      <td colSpan={5}>
                        <EditUser u={u} me={user} onSaved={load} />
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
  return <RequireUser allow={isAdmin}>{(u) => <Users user={u} />}</RequireUser>;
}
