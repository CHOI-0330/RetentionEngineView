"use client";
import StudentChatPagePresenter from "../../Presenter/Entitle/StudentChatPagePresenter";

export default function StudentPage() {
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <StudentChatPagePresenter />
      </div>
    </main>
  );
}
