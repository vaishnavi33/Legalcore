import { AudienceForm, audienceMeta, audienceParams } from "@/components/AudiencePages";

export const dynamicParams = false;

export function generateStaticParams() {
  return audienceParams("individual");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return audienceMeta("individual", (await params).slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <AudienceForm aud="individual" slug={(await params).slug} />;
}
