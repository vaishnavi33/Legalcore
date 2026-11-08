import FormPage from "@/components/FormPage";

export const metadata = { title: "Document Assistance" };

export default function Page() {
  return (
    <FormPage
      title="Document assistance"
      lead="Upload photos or copies of your papers and tell us what you want to do with them."
      crumbs={[["For Individuals", "/individuals"], ["Document assistance"]]}
      audience="individual"
      service="document-assistance"
    />
  );
}
