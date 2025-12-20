import { PageLoading } from "../../src/components/PageLoading";

export default function ProfileLoading() {
  return (
    <div className="container px-4 sm:px-6 py-8">
      <PageLoading message="プロフィールを読み込み中..." />
    </div>
  );
}
