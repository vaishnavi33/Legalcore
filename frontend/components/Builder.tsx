"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRANCHES } from "@/lib/content";

// "I am [a lawyer] and I need [case drafting] in [Hyderabad]" → the right page, with the branch already chosen.
const NEEDS: Record<"lawyer" | "individual", [string, string][]> = {
  lawyer: [
    ["a case drafted", "/lawyers/drafting"],
    ["legal research", "/lawyers/research"],
    ["documents prepared", "/lawyers/documents"],
    ["an agreement drafted", "/services/agreement-drafting"],
    ["a legal notice", "/services/legal-notices"],
    ["to track a request", "/track-request"],
  ],
  individual: [
    ["legal advice", "/individuals/consultation"],
    ["to ask a question", "/individuals/legal-query"],
    ["help with my documents", "/individuals/documents"],
    ["an agreement drafted", "/services/agreement-drafting"],
    ["to send a legal notice", "/services/legal-notices"],
    ["an affidavit or deed", "/services/legal-documentation"],
    ["to track a request", "/track-request"],
  ],
};

export default function Builder() {
  const [who, setWho] = useState<"lawyer" | "individual">("individual");
  const [need, setNeed] = useState(NEEDS.individual[0][1]);
  const [branch, setBranch] = useState("");
  const router = useRouter();

  return (
    <form
      className="builder"
      onSubmit={(e) => {
        e.preventDefault();
        const sep = need.includes("?") ? "&" : "?";
        router.push(branch && need !== "/track-request" ? `${need}${sep}branch=${branch}${need.startsWith("/services/") ? "#request" : ""}` : need);
      }}
    >
      <span className="label">Tell us in one line</span>
      <div className="sentence">
        <span>I am</span>
        <select
          aria-label="I am"
          value={who}
          onChange={(e) => {
            const w = e.target.value as "lawyer" | "individual";
            setWho(w);
            setNeed(NEEDS[w][0][1]);
          }}
        >
          <option value="individual">someone who needs help</option>
          <option value="lawyer">a lawyer</option>
        </select>
        <span>and I need</span>
        <select aria-label="I need" value={need} onChange={(e) => setNeed(e.target.value)}>
          {NEEDS[who].map(([t, h]) => (
            <option key={h + t} value={h}>
              {t}
            </option>
          ))}
        </select>
        <span>near</span>
        <select aria-label="Near branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="">any branch</option>
          {BRANCHES.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <button className="btn" type="submit">
        Take me there →
      </button>
    </form>
  );
}
