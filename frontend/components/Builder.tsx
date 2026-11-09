"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Aud } from "@/lib/content";

// "I am [a lawyer] and I need [case drafting]" → the right form. No branch choice: staff allocate requests internally.
const NEEDS: Record<Aud, [string, string][]> = {
  individual: [
    ["a legal opinion from an advocate", "/individuals/legal-opinion"],
    ["to speak to an advocate", "/individuals/consultation"],
    ["to send or reply to a legal notice", "/individuals/legal-notice"],
    ["an agreement drafted", "/individuals/agreement"],
    ["help with property papers", "/individuals/property"],
    ["a document reviewed", "/individuals/document-review"],
    ["help, but I am not sure what", "/individuals/legal-query"],
    ["to track a request", "/track-request"],
  ],
  lawyer: [
    ["a case drafted", "/lawyers/drafting"],
    ["legal research", "/lawyers/research"],
    ["documents prepared", "/lawyers/documents"],
    ["case preparation support", "/lawyers/case-preparation"],
    ["a document reviewed", "/lawyers/document-review"],
    ["to track a request", "/track-request"],
  ],
  business: [
    ["a business agreement", "/businesses/agreements"],
    ["a contract drafted", "/businesses/contracts"],
    ["employment documents", "/businesses/employment"],
    ["a legal notice", "/businesses/legal-notice"],
    ["ongoing legal support", "/businesses/support"],
    ["something else", "/businesses/other"],
  ],
};

export default function Builder() {
  const [who, setWho] = useState<Aud>("individual");
  const [need, setNeed] = useState(NEEDS.individual[0][1]);
  const router = useRouter();

  return (
    <form
      className="builder"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(need);
      }}
    >
      <span className="label">Find the right service</span>
      <div className="sentence">
        <span>I am</span>
        <select
          aria-label="I am"
          value={who}
          onChange={(e) => {
            const w = e.target.value as Aud;
            setWho(w);
            setNeed(NEEDS[w][0][1]);
          }}
        >
          <option value="individual">an individual</option>
          <option value="lawyer">a lawyer</option>
          <option value="business">a business</option>
        </select>
        <span>and I need</span>
        <select aria-label="I need" value={need} onChange={(e) => setNeed(e.target.value)}>
          {NEEDS[who].map(([t, h]) => (
            <option key={h + t} value={h}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <button className="btn" type="submit">
        Continue →
      </button>
    </form>
  );
}
