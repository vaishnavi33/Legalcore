import FormPage from "@/components/FormPage";

export const metadata = { title: "Request Legal Research" };

export default function Page() {
  return (
    <FormPage
      title="Request legal research"
      lead="State the exact legal question and the court. We return a memo with checked citations."
      crumbs={[["For Lawyers", "/lawyers"], ["Legal research"]]}
      audience="lawyer"
      service="legal-research"
    />
  );
}
