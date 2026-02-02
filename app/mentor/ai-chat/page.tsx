"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "../../../src/components/ui/skeleton";

const MentorAiChatPageComponent = dynamic(
  () => import("../../../src/interfaceAdapters/pages/entitle/MentorAiChatPage"),
  {
    loading: () => (
      <div className="flex flex-col h-screen p-4 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="flex-1 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    ),
    ssr: false,
  }
);

export default function MentorAiChatPage() {
  return <MentorAiChatPageComponent />;
}
