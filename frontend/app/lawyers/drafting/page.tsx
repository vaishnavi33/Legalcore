import FormPage from "@/components/FormPage";

export const metadata = { title: "Submit Drafting Request" };

export default function Page() {
  return (
    <FormPage
      title="Submit drafting request"
      lead="Share the brief facts, court and document type. Attach existing pleadings or orders if you have them."
      crumbs={[["For Lawyers", "/lawyers"], ["Drafting request"]]}
      audience="lawyer"
      service="case-drafting"
    />
  );
}
