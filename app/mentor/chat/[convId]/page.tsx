import MentorStudentChatPage from "../../../../src/interfaceAdapters/pages/entitle/MentorStudentChatPage";

interface MentorChatPageProps {
  params: { convId: string };
}

export default function MentorChatPage({ params }: MentorChatPageProps) {
  const convId = decodeURIComponent(params.convId);
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl">
        <MentorStudentChatPage convId={convId} />
      </div>
    </main>
  );
}
