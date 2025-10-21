import StudentChatPage from "../../src/interfaceAdapters/pages/entitle/StudentChatPage";

export default function StudentPage() {
  return (
    <main className="min-h-screen bg-background p-0">
      <div className="w-full flex justify-end">
        <div className="w-full max-w-5xl">
          <StudentChatPage />
        </div>
      </div>
    </main>
  );
}
