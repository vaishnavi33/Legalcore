import { AudienceForm, audienceMeta, audienceParams } from "@/components/AudiencePages";

export const dynamicParams = false;

export function generateStaticParams() {
  return audienceParams("business");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return audienceMeta("business", (await params).slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <AudienceForm aud="business" slug={(await params).slug} />;
}
