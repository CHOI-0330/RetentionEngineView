import { PageLoading } from "../../../../src/components/PageLoading";

export default function ChatLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <PageLoading message="チャットを読み込み中..." size="lg" />
    </div>
  );
}
