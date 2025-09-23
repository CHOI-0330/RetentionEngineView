import React, { useState } from 'react';
import { StudentChatScreen } from './StudentChatScreen';
import { StudentChatHistoryScreen } from './StudentChatHistoryScreen';
import { StudentFeedbackScreen } from './StudentFeedbackScreen';
import { FeedbackNotificationCenter } from './FeedbackNotificationCenter';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { LogOut, User } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider, SidebarTrigger } from './ui/sidebar';

interface MentorFeedback {
  id: string;
  messageId: string;
  originalText: string;
  correctedText: string;
  feedback: string;
  mentorName: string;
  timestamp: Date;
  status: 'pending' | 'reviewed' | 'applied';
}

interface StudentInterfaceProps {
  onLogout: () => void;
}

export function StudentInterface({ onLogout }: StudentInterfaceProps) {
  const [activeView, setActiveView] = useState('chat');

  const [mentorFeedbacks, setMentorFeedbacks] = useState<MentorFeedback[]>([
    {
      id: 'feedback-2',
      messageId: '2',
      originalText: "もちろんです！二次方程式は2次の多項式で、通常ax² + bx + c = 0の形で表されます。簡単な例から始めましょう：x² - 5x + 6 = 0。これは因数分解または二次方程式の公式で解くことができます。",
      correctedText: "こんにちは！二次方程式について説明させていただきますね。二次方程式は最高次の項が2次（x²）の方程式で、一般形はax² + bx + c = 0で表されます（a≠0）。具体例として x² - 5x + 6 = 0 を使って、因数分解と二次方程式の公式の両方の解法を見てみましょう。",
      feedback: "より丁寧な導入と、一般形の条件（a≠0）を明記することで理解が深まります。また、具体例を使って複数の解法を提示することで、学習者の選択肢を広げています。",
      mentorName: "田中先生",
      timestamp: new Date(Date.now() - 200000),
      status: 'pending'
    },
    {
      id: 'feedback-4',
      messageId: '4',
      originalText: "もちろん！x² - 5x + 6 = 0を因数分解するには、積が6で和が-5になる2つの数を見つける必要があります。その数は-2と-3です。つまり：(x - 2)(x - 3) = 0となり、x = 2またはx = 3が解になります。",
      correctedText: "因数分解の手順を詳しく説明しますね。x² - 5x + 6 = 0 では、定数項6と一次項の係数-5に注目します。積が6で和が-5になる2つの数を探すと、-2と-3です。確認：(-2) × (-3) = 6 ✓、(-2) + (-3) = -5 ✓。よって (x - 2)(x - 3) = 0 となり、x = 2 または x = 3 が解です。検算も大切ですね。",
      feedback: "手順を段階的に説明し、確認作業を明示することで、学習者が自分でも同じプロセスを辿れるようになります。検算の大切さも伝えています。",
      mentorName: "田中先生",
      timestamp: new Date(Date.now() - 60000),
      status: 'pending'
    }
  ]);

  const handleMarkAsReviewed = (feedbackId: string) => {
    setMentorFeedbacks(prev => 
      prev.map(feedback => 
        feedback.id === feedbackId 
          ? { ...feedback, status: 'reviewed' as const }
          : feedback
      )
    );
  };

  const renderContent = () => {
    switch (activeView) {
      case 'chat':
        return <StudentChatScreen mentorFeedbacks={mentorFeedbacks} onUpdateFeedback={setMentorFeedbacks} />;
      case 'history':
        return <StudentChatHistoryScreen />;
      case 'feedback':
        return <StudentFeedbackScreen mentorFeedbacks={mentorFeedbacks} />;
      default:
        return <StudentChatScreen mentorFeedbacks={mentorFeedbacks} onUpdateFeedback={setMentorFeedbacks} />;
    }
  };

  const getTitleForView = (view: string) => {
    switch (view) {
      case 'chat': return 'AI学習アシスタント';
      case 'history': return 'チャット履歴';
      case 'feedback': return 'メンターからの添削一覧';
      default: return 'チャット';
    }
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar 
          userRole="student"
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
              <FeedbackNotificationCenter 
                feedbacks={mentorFeedbacks}
                onMarkAsReviewed={handleMarkAsReviewed}
              />
              <Avatar className="h-8 w-8">
                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
