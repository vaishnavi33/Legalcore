export interface Step {
  status: string;
  label: string;
  state: "done" | "current" | "todo" | string;
}

export default function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="timeline">
      {steps.map((s, i) => (
        <li key={i} className={`t-${s.state}`}>
          <span className="dot" aria-hidden="true">
            {s.state === "done" ? "✓" : ""}
          </span>
          <span>
            <b>{s.label}</b>
            {s.state === "current" && <small>Current step</small>}
            {s.state === "done" && <span className="sr-only"> (done)</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

export const PREVIEW_STEPS: Step[] = [
  "Request received",
  "Being reviewed",
  "Accepted",
  "Team assigned",
  "Work in progress",
  "Quality check by advocate",
  "Ready for you",
].map((label) => ({ status: label, label, state: "todo" }));
