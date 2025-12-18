"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "../../../../src/components/ui/skeleton";

// 동적 import로 코드 스플리팅 적용 (First Load JS 감소)
const MentorStudentChatPageComponent = dynamic(
  () => import("../../../../src/interfaceAdapters/pages/entitle/MentorStudentChatPage"),
  {
    loading: () => (
      <div className="flex flex-col h-screen p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="flex-1 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    ),
    ssr: false, // 클라이언트에서만 렌더링 (WebSocket 등 브라우저 API 사용)
  }
);

interface MentorChatPageProps {
  params: { convId: string };
}

export default function MentorChatPage({ params }: MentorChatPageProps) {
  const convId = decodeURIComponent(params.convId);
  return <MentorStudentChatPageComponent convId={convId} />;
}
