"use client";

// Small pieces that read details administrators can change (branch details, demo mode) from the API.
import { useEffect, useState } from "react";
import { api, type Branch, type PublicConfig } from "@/lib/api";

let branchesCache: Promise<Branch[]> | null = null;
let configCache: Promise<PublicConfig | null> | null = null;
export const loadBranches = () => (branchesCache ??= api<Branch[]>("/branches").catch(() => ((branchesCache = null), [])));
export const loadConfig = () => (configCache ??= api<PublicConfig>("/config").catch(() => ((configCache = null), null)));

export const OFFICE_STATUS: Record<string, [string, string]> = {
  operational: ["Office open", "An operational office that you can visit."],
  service_area: ["Service area", "We serve this area. Requests are handled online and by phone."],
  planned: ["Planned location", "This location is planned. Requests from this area are handled online and by phone."],
};

function Val({ v }: { v?: string }) {
  return v ? <>{v}</> : <span className="placeholder">Not yet published</span>;
}

export function BranchContact({ slug, name, state }: { slug: string; name: string; state: string }) {
  const [b, setB] = useState<Branch | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    loadBranches().then((list) => {
      setB(list.find((x) => x.slug === slug) || null);
      setLoaded(true);
    });
  }, [slug]);
  const st = OFFICE_STATUS[b?.office_status || "planned"];
  return (
    <div className="card facts" aria-busy={!loaded}>
      <div>
        <span className="label">Status</span>
        <span>
          <span className={`pill ${b?.office_status === "operational" ? "done" : "wait"}`}>{st[0]}</span> <span className="note">{st[1]}</span>
        </span>
      </div>
      {b?.description && (
        <div>
          <span className="label">About this location</span>
          <span>{b.description}</span>
        </div>
      )}
      <div>
        <span className="label">Address</span>
        <span>
          <Val v={b?.address} />
        </span>
      </div>
      <div>
        <span className="label">Phone</span>
        <span>{b?.phone ? <a href={`tel:${b.phone.replace(/\s/g, "")}`}>{b.phone}</a> : <Val />}</span>
      </div>
      <div>
        <span className="label">Email</span>
        <span>{b?.email ? <a href={`mailto:${b.email}`}>{b.email}</a> : <Val />}</span>
      </div>
      <div>
        <span className="label">Working hours</span>
        <span>
          <Val v={b?.hours} />
        </span>
      </div>
      <div>
        <span className="label">Branch manager</span>
        <span>
          <Val v={b?.manager_name} />
        </span>
      </div>
      {b?.address && (
        <div>
          <span className="label">Directions</span>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.address}, ${name}, ${state}`)}`} target="_blank" rel="noopener noreferrer">
            Open in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}

export function DemoBanner() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    loadConfig().then((c) => setDemo(!!c?.demo_mode));
  }, []);
  if (!demo) return null;
  return (
    <div className="demo-banner" role="note">
      <div className="wrap">
        <b>Demonstration site.</b> All people and cases shown are fictional. Please do not upload real documents or personal information.
      </div>
    </div>
  );
}
