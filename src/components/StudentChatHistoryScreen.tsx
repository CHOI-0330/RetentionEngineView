import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Search, Filter, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  subject: string;
  date: Date;
  summary: string;
  messageCount: number;
  status: 'completed' | 'ongoing';
  messages: Array<{
    content: string;
    sender: 'student' | 'ai';
    timestamp: Date;
  }>;
}

export function StudentChatHistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const chatSessions: ChatSession[] = [
    {
      id: '1',
      title: '二次方程式の基礎',
      subject: '数学',
      date: new Date(Date.now() - 86400000), // 1 day ago
      summary: '因数分解と二次方程式の公式を使った解法について学習しました。',
      messageCount: 12,
      status: 'completed',
      messages: [
        { content: "二次方程式とは何ですか？", sender: 'student', timestamp: new Date() },
        { content: "二次方程式は2次の多項式です...", sender: 'ai', timestamp: new Date() }
      ]
    },
    {
      id: '2',
      title: '光合成のプロセス',
      subject: '生物',
      date: new Date(Date.now() - 172800000), // 2 days ago
      summary: '光合成における明反応と暗反応について議論しました。',
      messageCount: 8,
      status: 'completed',
      messages: [
        { content: "光合成はどのように機能しますか？", sender: 'student', timestamp: new Date() },
        { content: "光合成は植物が行うプロセスで...", sender: 'ai', timestamp: new Date() }
      ]
    },
    {
      id: '3',
      title: '第二次世界大戦の年表',
      subject: '歴史',
      date: new Date(Date.now() - 259200000), // 3 days ago
      summary: '第二次世界大戦中の主要な出来事と戦闘について探求しました。',
      messageCount: 15,
      status: 'completed',
      messages: [
        { content: "第二次世界大戦はいつ始まりましたか？", sender: 'student', timestamp: new Date() },
        { content: "第二次世界大戦は1939年9月1日に始まりました...", sender: 'ai', timestamp: new Date() }
      ]
    },
    {
      id: '4',
      title: '化学結合の種類',
      subject: '化学',
      date: new Date(Date.now() - 345600000), // 4 days ago
      summary: 'イオン結合、共有結合、金属結合について理解しました。',
      messageCount: 10,
      status: 'ongoing',
      messages: [
        { content: "化学結合にはどのような種類がありますか？", sender: 'student', timestamp: new Date() },
        { content: "化学結合には主に3つの種類があります...", sender: 'ai', timestamp: new Date() }
      ]
    }
  ];

  const filteredSessions = chatSessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || session.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const toggleExpanded = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今日';
    if (diffDays === 1) return '昨日';
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white px-4 py-4">
        <h1 className="mb-4">チャット履歴</h1>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="会話を検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input-background border-0"
            />
          </div>
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full sm:w-40 bg-input-background border-0">
              <SelectValue placeholder="科目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全科目</SelectItem>
              <SelectItem value="数学">数学</SelectItem>
              <SelectItem value="生物">生物</SelectItem>
              <SelectItem value="歴史">歴史</SelectItem>
              <SelectItem value="化学">化学</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-full sm:w-32 bg-input-background border-0">
              <SelectValue placeholder="日付" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全期間</SelectItem>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">今週</SelectItem>
              <SelectItem value="month">今月</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chat Sessions */}
      <div className="space-y-3">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="overflow-hidden">
            <Collapsible>
              <CollapsibleTrigger 
                className="w-full"
                onClick={() => toggleExpanded(session.id)}
              >
                <CardHeader className="hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedSessions.has(session.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <div className="text-left">
                        <CardTitle className="text-base">{session.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {session.subject}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(session.date)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {session.messageCount}件のメッセージ
                          </span>
                          <Badge 
                            variant={session.status === 'completed' ? 'secondary' : 'default'}
                            className="text-xs"
                          >
                            {session.status === 'completed' ? '完了' : '進行中'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-left mt-2">
                    {session.summary}
                  </p>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="border-t pt-4 space-y-3">
                    <h4 className="font-medium text-sm">最近のメッセージ</h4>
                    {session.messages.slice(0, 3).map((message, index) => (
                      <div key={index} className="flex gap-2 text-sm">
                        <Badge variant="outline" className="text-xs min-w-fit">
                          {message.sender === 'student' ? 'あなた' : 'AI'}
                        </Badge>
                        <p className="text-muted-foreground line-clamp-2">
                          {message.content}
                        </p>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      会話全体を表示
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {filteredSessions.length === 0 && (
          <Card className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">会話が見つかりません</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedSubject !== 'all' 
                ? '検索フィルターを調整してください'
                : '新しいチャットを開始すると、ここに会話履歴が表示されます'
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}