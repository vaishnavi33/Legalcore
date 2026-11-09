"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import RequireUser from "@/components/RequireUser";
import { api, ApiError, isAdmin, type User } from "@/lib/api";

interface Sys {
  environment: string;
  demo_mode: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  virus_scanning: boolean;
  storage: string;
  max_upload_mb: number;
  max_files_per_request: number;
}
interface Log {
  id: number;
  channel: string;
  recipient: string;
  subject: string;
  status: string;
  error: string;
  request_number: string | null;
  at: string;
}

const LOG_STATUS: Record<string, [string, string]> = {
  delivered: ["Delivered", "done"],
  sent: ["Handed to provider", "done"],
  failed: ["Failed", "closed"],
  not_configured: ["Not sent (channel not set up)", "wait"],
};

function OnOff({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return <span className={`pill ${on ? "done" : "wait"}`}>{on ? yes : no}</span>;
}

function System({ user }: { user: User }) {
  const [sys, setSys] = useState<Sys | null>(null);
  const [log, setLog] = useState<Log[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<Sys>("/admin/system").then(setSys).catch((e) => setErr(e instanceof ApiError ? e.message : "Could not load."));
    api<Log[]>("/admin/notifications").then(setLog).catch(() => setLog([]));
  }, []);
  return (
    <div className="wrap">
      <div className="dash-head">
        <h1 className="h-dash">System and notifications</h1>
      </div>
      <AdminNav user={user} />
      {err && <p className="err">{err}</p>}
      {sys && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Integrations</h3>
          <div className="tablewrap">
            <table>
              <tbody>
                <tr>
                  <th scope="row">Environment</th>
                  <td>
                    {sys.environment} {sys.demo_mode && <span className="pill wait">Demo mode: fictional data only</span>}
                  </td>
                </tr>
                <tr>
                  <th scope="row">Email</th>
                  <td>
                    <OnOff on={sys.email} yes="Set up" no="Not set up (add SMTP settings)" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">SMS</th>
                  <td>
                    <OnOff on={sys.sms} yes="Set up" no="Not set up (no provider connected yet)" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">WhatsApp</th>
                  <td>
                    <OnOff on={sys.whatsapp} yes="Set up" no="Not set up (no provider connected yet)" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">Virus scanning of uploads</th>
                  <td>
                    <OnOff on={sys.virus_scanning} yes="On (ClamAV)" no="Off (set CLAMD_HOST to turn on)" />
                  </td>
                </tr>
                <tr>
                  <th scope="row">File storage</th>
                  <td>{sys.storage}</td>
                </tr>
                <tr>
                  <th scope="row">Upload limits</th>
                  <td>
                    {sys.max_upload_mb} MB per file, {sys.max_files_per_request} files per submission
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="card" style={{ marginBottom: 40 }}>
        <h3>Notification log</h3>
        <p className="note">Every email, SMS and WhatsApp attempt is recorded here with its real result. Nothing is marked as sent unless a provider accepted it.</p>
        {!log ? (
          <p className="muted">Loading…</p>
        ) : log.length === 0 ? (
          <p className="muted">No notifications yet.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Channel</th>
                  <th scope="col">To</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {log.map((n) => (
                  <tr key={n.id}>
                    <td className="mono">{new Date(n.at).toLocaleString("en-IN")}</td>
                    <td>{n.channel}</td>
                    <td className="mono">{n.recipient}</td>
                    <td>
                      {n.subject}
                      {n.request_number && <small className="muted"> · {n.request_number}</small>}
                    </td>
                    <td>
                      <span className={`pill ${(LOG_STATUS[n.status] || [n.status, "wait"])[1]}`}>{(LOG_STATUS[n.status] || [n.status])[0]}</span>
                      {n.error && <small className="err"> {n.error}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return <RequireUser allow={isAdmin}>{(u) => <System user={u} />}</RequireUser>;
}
