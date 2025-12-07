/**
 * Student Chat ページ
 *
 * Clean Architecture適用
 */

import StudentChatPage from "../../src/interfaceAdapters/pages/entitle/StudentChatPage";

export default function StudentPage() {
  return (
    <main className="min-h-screen bg-background">
      <StudentChatPage />
    </main>
  );
}
