import React, { useState } from 'react';
import { MentorDashboard } from './MentorDashboard';
import { MentorChatReviewScreen } from './MentorChatReviewScreen';
import { KnowledgeCorrectionScreen } from './KnowledgeCorrectionScreen';
import { KnowledgeSummaryScreen } from './KnowledgeSummaryScreen';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Users, Edit, BookOpen, LogOut, GraduationCap, BarChart3 } from 'lucide-react';

interface MentorInterfaceProps {
  onLogout: () => void;
}

export function MentorInterface({ onLogout }: MentorInterfaceProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const handleViewStudentChat = (studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('chat-review');
  };

  const handleBackToDashboard = () => {
    setSelectedStudentId(null);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Header */}
        <div className="border-b bg-white shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-3">
              {/* User Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <GraduationCap className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">メンターモード</p>
                  <p className="text-xs text-muted-foreground">教育管理ダッシュボード</p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <TabsList className="grid w-fit grid-cols-4 bg-transparent p-1 h-auto">
                <TabsTrigger 
                  value="dashboard" 
                  className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm">ダッシュボード</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="correction" 
                  className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Edit className="h-4 w-4" />
                  <span className="text-sm">添削</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="knowledge" 
                  className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm">知識ベース</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  disabled
                >
                  <Users className="h-4 w-4" />
                  <span className="text-sm">分析</span>
                </TabsTrigger>
              </TabsList>

              {/* Logout */}
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <TabsContent value="dashboard" className="m-0">
          <MentorDashboard onViewStudentChat={handleViewStudentChat} />
        </TabsContent>
        
        <TabsContent value="correction" className="m-0">
          <KnowledgeCorrectionScreen />
        </TabsContent>
        
        <TabsContent value="knowledge" className="m-0">
          <KnowledgeSummaryScreen />
        </TabsContent>

        <TabsContent value="analytics" className="m-0">
          <div className="p-8 text-center">
            <h3 className="text-lg font-medium mb-2">分析機能</h3>
            <p className="text-muted-foreground">詳細な学習分析機能は開発中です。</p>
          </div>
        </TabsContent>

        {/* Chat Review Overlay */}
        {activeTab === 'chat-review' && selectedStudentId && (
          <div className="fixed inset-0 bg-background z-50">
            <MentorChatReviewScreen 
              studentId={selectedStudentId}
              onBack={handleBackToDashboard}
            />
          </div>
        )}
      </Tabs>
    </div>
  );
}