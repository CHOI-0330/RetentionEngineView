import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import { ThumbsUp, ThumbsDown, Bell, Settings, Users, BookOpen, BarChart3, MessageSquare, Search } from 'lucide-react';
import { Input } from './ui/input';

interface Student {
  id: string;
  name: string;
  avatar?: string;
  lastActivity: Date;
  status: 'active' | 'idle' | 'offline';
  recentChat: {
    summary: string;
    aiResponse: string;
    subject: string;
    timestamp: Date;
    needsReview: boolean;
  };
  totalChats: number;
}

interface MentorDashboardProps {
  onViewStudentChat: (studentId: string) => void;
}

export function MentorDashboard({ onViewStudentChat }: MentorDashboardProps) {
  const [selectedView, setSelectedView] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');

  const students: Student[] = [
    {
      id: '1',
      name: '田中 愛美',
      lastActivity: new Date(Date.now() - 300000), // 5 minutes ago
      status: 'active',
      recentChat: {
        summary: '実生活における二次方程式の公式の応用について質問',
        aiResponse: '二次方程式の公式は弾道運動、利益最適化、面積計算などの問題解決に使用できます。',
        subject: '数学',
        timestamp: new Date(Date.now() - 300000),
        needsReview: true
      },
      totalChats: 15
    },
    {
      id: '2',
      name: '佐藤 健',
      lastActivity: new Date(Date.now() - 1200000), // 20 minutes ago
      status: 'idle',
      recentChat: {
        summary: '光合成の光反応とエネルギー変換について探求',
        aiResponse: '光反応はチラコイド膜で起こり、クロロフィルが光エネルギーを吸収してATPとNADPHを生成します。',
        subject: '生物',
        timestamp: new Date(Date.now() - 1200000),
        needsReview: false
      },
      totalChats: 23
    },
    {
      id: '3',
      name: '鈴木 花子',
      lastActivity: new Date(Date.now() - 3600000), // 1 hour ago
      status: 'offline',
      recentChat: {
        summary: 'イオン結合と電子移動について学習',
        aiResponse: 'イオン結合は金属原子から非金属原子へ電子が移動して、反対の電荷を持つイオンが形成されることで生じます。',
        subject: '化学',
        timestamp: new Date(Date.now() - 3600000),
        needsReview: true
      },
      totalChats: 8
    },
    {
      id: '4',
      name: '山田 太郎',
      lastActivity: new Date(Date.now() - 7200000), // 2 hours ago
      status: 'offline',
      recentChat: {
        summary: '第一次世界大戦の原因と影響について議論',
        aiResponse: '第一次世界大戦は帝国主義、同盟システム、フランツ・フェルディナント大公の暗殺など複雑な要因によって引き起こされました。',
        subject: '歴史',
        timestamp: new Date(Date.now() - 7200000),
        needsReview: false
      },
      totalChats: 12
    }
  ];

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.recentChat.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFeedback = (studentId: string, isGood: boolean) => {
    console.log(`Feedback for student ${studentId}: ${isGood ? 'Good' : 'Bad'}`);
    // Here you would typically update the feedback in your data store
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}時間前`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}日前`;
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b p-4">
            <h2 className="font-semibold">メンターポータル</h2>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setSelectedView('students')}
                  className={selectedView === 'students' ? 'bg-accent' : ''}
                >
                  <Users className="h-4 w-4" />
                  学生
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setSelectedView('reviews')}
                  className={selectedView === 'reviews' ? 'bg-accent' : ''}
                >
                  <MessageSquare className="h-4 w-4" />
                  レビュー
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setSelectedView('knowledge')}
                  className={selectedView === 'knowledge' ? 'bg-accent' : ''}
                >
                  <BookOpen className="h-4 w-4" />
                  知識ベース
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => setSelectedView('analytics')}
                  className={selectedView === 'analytics' ? 'bg-accent' : ''}
                >
                  <BarChart3 className="h-4 w-4" />
                  分析
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <h1 className="font-medium">ダッシュボード概要</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback>MT</AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4">
            {selectedView === 'students' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="学生を検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-input-background border-0"
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  {filteredStudents.map((student) => (
                    <Card key={student.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={student.avatar} />
                              <AvatarFallback>
                                {student.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${getStatusColor(student.status)}`} />
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">{student.name}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>最終活動: {formatLastActivity(student.lastActivity)}</span>
                                  <span>•</span>
                                  <span>総チャット数: {student.totalChats}</span>
                                </div>
                              </div>
                              {student.recentChat.needsReview && (
                                <Badge variant="destructive" className="text-xs">
                                  レビュー必要
                                </Badge>
                              )}
                            </div>

                            <div className="bg-accent/50 rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {student.recentChat.subject}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatLastActivity(student.recentChat.timestamp)}
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">学生の質問:</p>
                                  <p className="text-sm">{student.recentChat.summary}</p>
                                </div>
                                
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground">AIの回答:</p>
                                  <p className="text-sm text-muted-foreground">{student.recentChat.aiResponse}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-2">
                                <span className="text-xs font-medium">AIの回答品質:</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFeedback(student.id, true)}
                                  className="h-7 px-2"
                                >
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  良い
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFeedback(student.id, false)}
                                  className="h-7 px-2"
                                >
                                  <ThumbsDown className="h-3 w-3 mr-1" />
                                  悪い
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 px-2 ml-auto"
                                  onClick={() => onViewStudentChat(student.id)}
                                >
                                  チャット表示
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedView !== 'students' && (
              <Card className="p-8 text-center">
                <h3 className="font-medium mb-2">{selectedView.charAt(0).toUpperCase() + selectedView.slice(1)} View</h3>
                <p className="text-muted-foreground">This section is coming soon. Currently showing the Students overview.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}