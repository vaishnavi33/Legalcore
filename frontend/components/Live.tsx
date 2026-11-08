"use client";

// Small pieces that read details admins can change (fees, branch addresses) from the API.
import { useEffect, useState } from "react";
import { api, type Branch, type Service } from "@/lib/api";

let servicesCache: Promise<Service[]> | null = null;
let branchesCache: Promise<Branch[]> | null = null;
export const loadServices = () => (servicesCache ??= api<Service[]>("/services").catch(() => ((servicesCache = null), [])));
export const loadBranches = () => (branchesCache ??= api<Branch[]>("/branches").catch(() => ((branchesCache = null), [])));

export function FeeText({ slug }: { slug: string }) {
  const [fee, setFee] = useState<string | null>(null);
  useEffect(() => {
    loadServices().then((list) => setFee(list.find((s) => s.slug === slug)?.fee_text || ""));
  }, [slug]);
  return <span>{fee ? fee : "Fee on request"}. We confirm the fee before starting work.</span>;
}

function Ph({ v, f }: { v?: string; f: string }) {
  return v ? <>{v}</> : <span className="placeholder">{f}</span>;
}

export function BranchContact({ slug, name, state }: { slug: string; name: string; state: string }) {
  const [b, setB] = useState<Branch | null>(null);
  useEffect(() => {
    loadBranches().then((list) => setB(list.find((x) => x.slug === slug) || null));
  }, [slug]);
  const mapQ = encodeURIComponent(`${b?.address || ""} ${name}, ${state}`.trim());
  return (
    <div className="card facts">
      <div>
        <span className="label">Address</span>
        <span>
          <Ph v={b?.address} f={`Branch address to be added, ${name}, ${state}`} />
        </span>
      </div>
      <div>
        <span className="label">Phone</span>
        <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>
          <Ph v={b?.phone} f="+91 00000 00000" />
        </span>
      </div>
      <div>
        <span className="label">Email</span>
        <span>
          <Ph v={b?.email} f={`${slug}@legalcore.in`} />
        </span>
      </div>
      <div>
        <span className="label">Working hours</span>
        <span>{b?.hours || "Monday to Saturday, 9:30 am to 6:30 pm"}</span>
      </div>
      <div>
        <span className="label">Directions</span>
        <a href={`https://www.google.com/maps/search/?api=1&query=${mapQ}`} target="_blank" rel="noopener noreferrer">
          Open {name} in Google Maps
        </a>
      </div>
    </div>
  );
}
