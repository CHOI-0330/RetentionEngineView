import MentorStudentChatPage from "../../../../src/interfaceAdapters/pages/entitle/MentorStudentChatPage";

interface MentorChatPageProps {
  params: { convId: string };
}

export default function MentorChatPage({ params }: MentorChatPageProps) {
  const convId = decodeURIComponent(params.convId);
  return <MentorStudentChatPage convId={convId} />;
}
