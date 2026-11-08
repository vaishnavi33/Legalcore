import FormPage from "@/components/FormPage";

export const metadata = { title: "Document Preparation" };

export default function Page() {
  return (
    <FormPage
      title="Document preparation"
      lead="Affidavits, vakalats, deeds, agreements and notices, prepared for your review."
      crumbs={[["For Lawyers", "/lawyers"], ["Document preparation"]]}
      audience="lawyer"
      service="legal-documentation"
    />
  );
}
