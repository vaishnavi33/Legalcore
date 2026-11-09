export const KEEP_READY_EXAMPLES = [
  "Agreements and contracts",
  "Previous legal notices and replies",
  "Court documents",
  "Petitions and written statements",
  "Court orders and judgments",
  "FIR copies and police complaints",
  "Property documents",
  "Sale deeds and title deeds",
  "Encumbrance certificates",
  "Identity and address documents, where relevant",
  "Payment receipts and transaction records",
  "Photographs and supporting evidence",
  "Correspondence",
  "Other material papers relevant to the matter",
];

export default function KeepReady({ children }: { children?: React.ReactNode }) {
  return (
    <fieldset className="keep">
      <legend>What to Keep Ready</legend>
      <p>
        Please upload all available material papers and documents relating to your legal requirement. Providing relevant documents will help our team
        understand your request.
      </p>
      <details>
        <summary>Examples of useful documents</summary>
        <ul className="ticks">
          {KEEP_READY_EXAMPLES.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </details>
      {children}
      <p className="note">You can submit your request even if you do not have every document now. You can send more documents later.</p>
    </fieldset>
  );
}
