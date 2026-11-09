import { AudienceForm, audienceMeta, audienceParams } from "@/components/AudiencePages";

export const dynamicParams = false;

export function generateStaticParams() {
  return audienceParams("lawyer");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return audienceMeta("lawyer", (await params).slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <AudienceForm aud="lawyer" slug={(await params).slug} />;
}
