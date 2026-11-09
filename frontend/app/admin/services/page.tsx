"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import RequireUser from "@/components/RequireUser";
import { api, ApiError, isAdmin, type Service, type User } from "@/lib/api";

function Row({ s, onSaved }: { s: Service; onSaved: (s: Service) => void }) {
  const [name, setName] = useState(s.name);
  const [fee, setFee] = useState(s.fee_text || "");
  const [err, setErr] = useState("");
  async function save(body: object) {
    setErr("");
    try {
      onSaved(await api<Service>(`/admin/services/${s.slug}`, { method: "PATCH", json: body }));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save.");
    }
  }
  return (
    <tr className={s.is_active ? undefined : "muted"}>
      <td>
        <label className="sr-only" htmlFor={`n-${s.slug}`}>
          Name
        </label>
        <input id={`n-${s.slug}`} value={name} minLength={2} maxLength={100} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim().length >= 2 && name !== s.name && save({ name: name.trim() })} />
        {err && <p className="err">{err}</p>}
      </td>
      <td>
        <small>
          {s.audience.split(",").join(", ")}
          {s.requires_advocate && " · advocate only"}
        </small>
      </td>
      <td>
        <label className="sr-only" htmlFor={`f-${s.slug}`}>
          Internal fee note
        </label>
        <input id={`f-${s.slug}`} maxLength={60} value={fee} onChange={(e) => setFee(e.target.value)} onBlur={() => fee !== (s.fee_text || "") && save({ fee_text: fee })} />
      </td>
      <td>
        {s.slug === "other" ? (
          <small className="muted">Always on</small>
        ) : (
          <button className="btn ghost small" onClick={() => save({ is_active: !s.is_active })}>
            {s.is_active ? "Turn off" : "Turn on"}
          </button>
        )}
      </td>
    </tr>
  );
}

function Services({ user }: { user: User }) {
  const [list, setList] = useState<Service[] | null>(null);
  useEffect(() => {
    api<Service[]>("/admin/services").then(setList);
  }, []);
  return (
    <div className="wrap">
      <div className="dash-head">
        <h1 className="h-dash">Services</h1>
      </div>
      <AdminNav user={user} />
      <p className="note" style={{ marginBottom: 16 }}>
        Services that are turned off disappear from the request forms. The fee note is for staff only and is never shown on the public website. Changes save when you leave a field.
      </p>
      {!list ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="tablewrap" style={{ marginBottom: 40 }}>
          <table>
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Offered to</th>
                <th scope="col">Internal fee note</th>
                <th scope="col">On forms</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <Row key={s.slug} s={s} onSaved={(n) => setList((l) => l!.map((x) => (x.slug === n.slug ? n : x)))} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <RequireUser allow={isAdmin}>{(u) => <Services user={u} />}</RequireUser>;
}
