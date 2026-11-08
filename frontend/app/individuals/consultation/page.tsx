import FormPage from "@/components/FormPage";

export const metadata = { title: "Request Advocate Consultation" };

export default function Page() {
  return (
    <FormPage
      title="Request advocate consultation"
      lead="Choose your nearest branch and how you want to talk. A qualified advocate will call you."
      crumbs={[["For Individuals", "/individuals"], ["Consultation"]]}
      audience="individual"
      service="advocate-consultation"
    />
  );
}
