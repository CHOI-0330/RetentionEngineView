import React from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { ThumbsUp, ThumbsDown, Search } from "lucide-react";
import { Input } from "../components/ui/input";

export interface StudentItem {
  id: string;
  name: string;
  avatar?: string;
  lastActivity: Date;
  status: "active" | "idle" | "offline";
  recentChat: {
    summary: string;
    aiResponse: string;
    subject: string;
    timestamp: Date;
    needsReview: boolean;
  };
  totalChats: number;
}

interface MentorDashboardViewProps {
  students: StudentItem[];
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  onViewStudentChat: (studentId: string) => void;
  onFeedback: (studentId: string, isGood: boolean) => void;
}

export function MentorDashboardView({
  students,
  searchQuery,
  onChangeSearch,
  onViewStudentChat,
  onFeedback,
}: MentorDashboardViewProps) {
  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.recentChat.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "idle":
        return "bg-yellow-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-400";
    }
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "たった今";
    if (diffMins < 60) return `${diffMins}分前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}時間前`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}日前`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="若手社員を検索..."
            value={searchQuery}
            onChange={(e) => onChangeSearch(e.target.value)}
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
                    {student.avatar ? <AvatarImage src={student.avatar} /> : null}
                    <AvatarFallback>
                      {student.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${getStatusColor(
                      student.status
                    )}`}
                  />
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
                      <Badge variant="destructive" className="text-xs">レビュー必要</Badge>
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
                        <p className="text-xs font-medium text-muted-foreground">若手社員の質問:</p>
                        <p className="text-sm">{student.recentChat.summary}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground">AIの回答:</p>
                        <p className="text-sm text-muted-foreground">{student.recentChat.aiResponse}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs font-medium">AIの回答品質:</span>
                      <Button size="sm" variant="outline" onClick={() => onFeedback(student.id, true)} className="h-7 px-2">
                        <ThumbsUp className="h-3 w-3 mr-1" />良い
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onFeedback(student.id, false)} className="h-7 px-2">
                        <ThumbsDown className="h-3 w-3 mr-1" />悪い
                      </Button>
                      <Button size="sm" variant="secondary" className="h-7 px-2 ml-auto" onClick={() => onViewStudentChat(student.id)}>
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
  );
}

