import FormPage from "@/components/FormPage";

export const metadata = { title: "Submit Legal Query" };

export default function Page() {
  return (
    <FormPage
      title="Submit a legal query"
      lead="Write your problem in simple words, in English or Telugu. We will call you with next steps."
      crumbs={[["For Individuals", "/individuals"], ["Legal query"]]}
      audience="individual"
      service="legal-query"
    />
  );
}
