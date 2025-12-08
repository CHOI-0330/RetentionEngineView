"use client";

import StudentChatPageComponent from "../../../../src/interfaceAdapters/pages/entitle/StudentChatPage";

interface StudentChatPageProps {
  params: { convId: string };
}

export default function StudentChatPage({ params }: StudentChatPageProps) {
  const convId = decodeURIComponent(params.convId);
  return <StudentChatPageComponent convId={convId} />;
}
