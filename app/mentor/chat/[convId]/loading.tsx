import { PageLoading } from "../../../../src/components/PageLoading";

export default function MentorChatLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <PageLoading message="会話を読み込み中..." size="lg" />
    </div>
  );
}
