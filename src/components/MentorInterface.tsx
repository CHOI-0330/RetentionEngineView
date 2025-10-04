import React, { useState } from "react";
import { MentorDashboard } from "./MentorDashboard";
import { MentorChatReviewScreen } from "./MentorChatReviewScreen";
import { KnowledgeSummaryScreen } from "./KnowledgeSummaryScreen";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { LogOut, GraduationCap, Bell, Settings } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "./ui/sidebar";

interface MentorInterfaceProps {
  onLogout: () => void;
}

export function MentorInterface({ onLogout }: MentorInterfaceProps) {
  const [activeView, setActiveView] = useState("students");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );

  const handleViewStudentChat = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveView("chat-review");
  };

  const handleBackToDashboard = () => {
    setSelectedStudentId(null);
    setActiveView("students");
  };

  const renderContent = () => {
    // Chat Review is a special case that overlays everything
    if (activeView === "chat-review" && selectedStudentId) {
      return (
        <div className="fixed inset-0 bg-background z-50">
          <MentorChatReviewScreen
            studentId={selectedStudentId}
            onBack={handleBackToDashboard}
          />
        </div>
      );
    }

    switch (activeView) {
      case "students":
        return <MentorDashboard onViewStudentChat={handleViewStudentChat} />;
      case "knowledge":
        return <KnowledgeSummaryScreen />;
      default:
        return <MentorDashboard onViewStudentChat={handleViewStudentChat} />;
    }
  };

  const getTitleForView = (view: string) => {
    switch (view) {
      case "students":
        return "若手社員ダッシュボード";
      case "knowledge":
        return "知識ベース概要";
      default:
        return "ダッシュボード";
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar
          userRole="mentor"
          selectedView={activeView}
          onSelectView={setActiveView}
          className="border-r"
        />

        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <h1 className="font-medium">{getTitleForView(activeView)}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <GraduationCap className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">{renderContent()}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
