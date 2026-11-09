"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import RequireUser from "@/components/RequireUser";
import { api, ApiError, isAdmin, isManager, type Branch, type User } from "@/lib/api";

const STATUS_TEXT: Record<Branch["office_status"], string> = {
  operational: "Operational office",
  service_area: "Service area (no public office)",
  planned: "Planned location",
};

function BranchEditor({ b, admin, onSaved }: { b: Branch; admin: boolean; onSaved: (b: Branch) => void }) {
  const [f, setF] = useState({ address: b.address, phone: b.phone, email: b.email, hours: b.hours, description: b.description, manager_name: b.manager_name, office_status: b.office_status });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const id = (k: string) => `${k}-${b.slug}`;
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg("");
        setErr("");
        const phone = f.phone.trim();
        if (phone && !/^[0-9+()\- ]{6,20}$/.test(phone)) return setErr("Please enter a valid phone number, or leave it empty.");
        const body: Record<string, string> = { ...f };
        if (!admin) delete body.office_status;
        try {
          onSaved(await api<Branch>(`/admin/branches/${b.slug}`, { method: "PATCH", json: body }));
          setMsg("Saved. The location page now shows these details.");
        } catch (e2) {
          setErr(e2 instanceof ApiError ? e2.message : "Could not save.");
        }
      }}
    >
      <span className="label">
        {b.code} · {b.state}
      </span>
      <h3>{b.name}</h3>
      <p className="note">Only publish details that are real and confirmed. Empty fields show “Not yet published” on the website.</p>
      <div className="field">
        <label htmlFor={id("st")}>Public status</label>
        <select id={id("st")} value={f.office_status} onChange={set("office_status")} disabled={!admin}>
          {Object.entries(STATUS_TEXT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={id("ds")}>Short description</label>
        <textarea id={id("ds")} style={{ minHeight: 70 }} maxLength={2000} value={f.description} onChange={set("description")} />
      </div>
      <div className="field">
        <label htmlFor={id("ad")}>Address</label>
        <textarea id={id("ad")} style={{ minHeight: 70 }} maxLength={500} value={f.address} onChange={set("address")} />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor={id("ph")}>Phone</label>
          <input id={id("ph")} inputMode="tel" maxLength={20} value={f.phone} onChange={set("phone")} />
        </div>
        <div className="field">
          <label htmlFor={id("em")}>Email</label>
          <input id={id("em")} type="email" value={f.email} onChange={set("email")} />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor={id("hr")}>Working hours</label>
          <input id={id("hr")} maxLength={120} value={f.hours} onChange={set("hours")} />
        </div>
        <div className="field">
          <label htmlFor={id("mg")}>Branch manager (name shown publicly)</label>
          <input id={id("mg")} maxLength={120} value={f.manager_name} onChange={set("manager_name")} />
        </div>
      </div>
      {err && <p className="err">{err}</p>}
      {msg && <p className="okmsg">{msg}</p>}
      <button className="btn alt small" type="submit">
        Save {b.name}
      </button>
    </form>
  );
}

function Branches({ user }: { user: User }) {
  const [list, setList] = useState<Branch[] | null>(null);
  const admin = isAdmin(user);
  useEffect(() => {
    api<Branch[]>("/branches").then((all) => setList(admin ? all : all.filter((b) => user.branches.some((x) => x.slug === b.slug))));
  }, [user, admin]);
  return (
    <div className="wrap">
      <div className="dash-head">
        <h1 className="h-dash">{admin ? "Branches" : "Branch details"}</h1>
      </div>
      <AdminNav user={user} />
      <div className="grid" style={{ paddingBottom: 40 }}>
        {list ? list.map((b) => <BranchEditor key={b.slug} b={b} admin={admin} onSaved={(nb) => setList((l) => l!.map((x) => (x.slug === nb.slug ? nb : x)))} />) : <p className="muted">Loading…</p>}
      </div>
    </div>
  );
}

export default function Page() {
  return <RequireUser allow={isManager}>{(u) => <Branches user={u} />}</RequireUser>;
}
