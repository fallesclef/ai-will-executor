import { notFound } from "next/navigation";
import { GameShell } from "@/components/GameShell";
import { getStory } from "@/data/cases";

interface CasePageProps {
  params: Promise<{ caseId: string }>;
}

export async function generateMetadata({ params }: CasePageProps) {
  const { caseId } = await params;
  const story = getStory(caseId);
  if (!story) return { title: "案件不存在" };

  return {
    title: `${story.title} · ${story.subtitle}`,
    description: story.description ?? story.subtitle,
  };
}

export default async function CasePage({ params }: CasePageProps) {
  const { caseId } = await params;
  const story = getStory(caseId);

  if (!story) {
    notFound();
  }

  return <GameShell caseId={caseId} />;
}
