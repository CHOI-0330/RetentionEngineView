"use client";

import StudentChatPageComponent from "../../../../src/interfaceAdapters/pages/entitle/StudentChatPage";

interface StudentChatPageProps {
  params: { convId: string };
}

export default function StudentChatPage({ params }: StudentChatPageProps) {
  const convId = decodeURIComponent(params.convId);
  return (
    <main className="min-h-screen bg-background p-0">
      <div className="w-full flex justify-center px-4">
        <div className="w-full max-w-5xl">
          <StudentChatPageComponent convId={convId} />
        </div>
      </div>
    </main>
  );
}
