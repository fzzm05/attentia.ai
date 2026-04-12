import { notFound } from "next/navigation";

import { StudySessionScreen } from "@/components/study/study-session-screen";
import { getStudySessionData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function StudySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const data = await getStudySessionData(sessionId);

  if (data === null) {
    notFound();
  }

  return (
    <StudySessionScreen
      data={data}
      wsUrl={process.env.NEXT_PUBLIC_SESSION_ENGINE_WS_URL ?? "ws://127.0.0.1:8000/ws"}
    />
  );
}
