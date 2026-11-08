"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import RequireUser from "@/components/RequireUser";
import { api, ApiError, isAdmin, isManager, type Branch, type Service, type User } from "@/lib/api";

function BranchEditor({ b, onSaved }: { b: Branch; onSaved: (b: Branch) => void }) {
  const [f, setF] = useState({ address: b.address, phone: b.phone, email: b.email, hours: b.hours });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg("");
        setErr("");
        try {
          onSaved(await api<Branch>(`/admin/branches/${b.slug}`, { method: "PATCH", json: f }));
          setMsg("Saved. The branch page now shows these details.");
        } catch (e2) {
          setErr(e2 instanceof ApiError ? e2.message : "Could not save.");
        }
      }}
    >
      <span className="label">
        {b.code} · {b.state}
      </span>
      <h3>{b.name}</h3>
      <div className="field">
        <label htmlFor={`ad-${b.slug}`}>Address</label>
        <textarea id={`ad-${b.slug}`} style={{ minHeight: 70 }} value={f.address} onChange={set("address")} />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor={`ph-${b.slug}`}>Phone</label>
          <input id={`ph-${b.slug}`} value={f.phone} onChange={set("phone")} />
        </div>
        <div className="field">
          <label htmlFor={`em-${b.slug}`}>Email</label>
          <input id={`em-${b.slug}`} type="email" value={f.email} onChange={set("email")} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`hr-${b.slug}`}>Working hours</label>
        <input id={`hr-${b.slug}`} value={f.hours} onChange={set("hours")} />
      </div>
      {err && <p className="err">{err}</p>}
      {msg && <p className="okmsg">{msg}</p>}
      <button className="btn alt small" type="submit">
        Save {b.name}
      </button>
    </form>
  );
}

function Fees() {
  const [list, setList] = useState<Service[]>([]);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api<Service[]>("/services").then(setList);
  }, []);
  return (
    <div className="card">
      <h3>Service fees</h3>
      <p className="note">Shown on each service page. Leave empty to show “Fee on request”. Example: From ₹2,000</p>
      <div className="tablewrap">
        <table>
          <tbody>
            {list.map((s) => (
              <tr key={s.slug}>
                <td>
                  <label htmlFor={`fee-${s.slug}`}>{s.name}</label>
                </td>
                <td>
                  <input
                    id={`fee-${s.slug}`}
                    defaultValue={s.fee_text}
                    maxLength={60}
                    onBlur={async (e) => {
                      if (e.target.value === s.fee_text) return;
                      try {
                        const out = await api<Service>(`/admin/services/${s.slug}`, { method: "PATCH", json: { fee_text: e.target.value } });
                        setList((l) => l.map((x) => (x.slug === out.slug ? out : x)));
                        setMsg(`Saved fee for ${s.name}.`);
                      } catch (e2) {
                        setMsg(e2 instanceof ApiError ? e2.message : "Could not save.");
                      }
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg && <p className="okmsg">{msg}</p>}
    </div>
  );
}

function Branches({ user }: { user: User }) {
  const [list, setList] = useState<Branch[] | null>(null);
  useEffect(() => {
    api<Branch[]>("/branches").then((all) => setList(isAdmin(user) ? all : all.filter((b) => user.branches.some((x) => x.slug === b.slug))));
  }, [user]);
  return (
    <div className="wrap">
      <div className="dash-head">
        <h1 style={{ fontSize: "clamp(1.9rem,4vw,2.6rem)" }}>{isAdmin(user) ? "Branches and fees" : "Branch details"}</h1>
      </div>
      <AdminNav user={user} />
      <div style={{ display: "grid", gap: 20, paddingBottom: 40 }}>
        {isAdmin(user) && <Fees />}
        <div className="grid">{list ? list.map((b) => <BranchEditor key={b.slug} b={b} onSaved={(nb) => setList((l) => l!.map((x) => (x.slug === nb.slug ? nb : x)))} />) : <p className="muted">Loading…</p>}</div>
      </div>
    </div>
  );
}

export default function Page() {
  return <RequireUser allow={isManager}>{(u) => <Branches user={u} />}</RequireUser>;
}
