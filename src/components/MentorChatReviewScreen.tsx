import React, { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { ArrowLeft, ThumbsUp, ThumbsDown, Edit, Save, X } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: "student" | "ai";
  timestamp: Date;
  canEdit?: boolean;
}

interface Student {
  id: string;
  name: string;
  avatar?: string;
}

interface MentorChatReviewScreenProps {
  studentId: string;
  onBack: () => void;
}

export function MentorChatReviewScreen({
  studentId,
  onBack,
}: MentorChatReviewScreenProps) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [comment, setComment] = useState("");

  // Mock data based on studentId
  const getStudentData = (id: string) => {
    const students = {
      "1": {
        id: "1",
        name: "田中 愛美",
        avatar: undefined,
      },
      "2": {
        id: "2",
        name: "佐藤 健",
        avatar: undefined,
      },
      "3": {
        id: "3",
        name: "鈴木 花子",
        avatar: undefined,
      },
      "4": {
        id: "4",
        name: "山田 太郎",
        avatar: undefined,
      },
    };
    return students[id as keyof typeof students] || students["1"];
  };

  const getMessagesForStudent = (id: string): Message[] => {
    const messageSets = {
      "1": [
        {
          id: "1",
          content:
            "こんにちは！二次方程式の理解に苦労しています。実際の問題で使う方法を教えてもらえますか？",
          sender: "student" as const,
          timestamp: new Date(Date.now() - 1800000),
        },
        {
          id: "2",
          content:
            "もちろんです！二次方程式は多くの実生活の問題で使用されます。例えば、物体の放物線運動を計算する際や、利益を最大化する価格を見つける場合などです。具体的な例を使って説明しましょう.\n\nボールを投げた時の軌道は h = -4.9t² + v₀t + h₀ という二次方程式で表せます。ここで h は高さ、t は時間、v₀ は初速度、h₀ は初期の高さです。",
          sender: "ai" as const,
          timestamp: new Date(Date.now() - 1740000),
          canEdit: true,
        },
        {
          id: "3",
          content: "なるほど！でも、この公式をどうやって解くんですか？",
          sender: "student" as const,
          timestamp: new Date(Date.now() - 1680000),
        },
        {
          id: "4",
          content:
            "二次方程式を解く方法は主に3つあります：\n\n1. 因数分解\n2. 平方完成\n3. 二次方程式の公式\n\n最も一般的なのは二次方程式の公式です：x = (-b ± \u221a(b² - 4ac)) / 2a\n\n先ほどのボールの例で、ボールが地面に落ちる時間を求めてみましょう。",
          sender: "ai" as const,
          timestamp: new Date(Date.now() - 1620000),
          canEdit: true,
        },
      ],
      "2": [
        {
          id: "5",
          content: "光合成の光反応について詳しく教えてください。",
          sender: "student" as const,
          timestamp: new Date(Date.now() - 1200000),
        },
        {
          id: "6",
          content:
            "光合成の光反応は、葉緑体のチラコイド膜で起こります。光エネルギーを化学エネルギーに変換する重要なプロセスです。\n\n主なステップ：\n1. 光の吸収：クロロフィルが光エネルギーを吸収\n2. 水の分解：H\u2082O \u2192 2H\u207a + \u00bdO\u2082 + 2e\u207b\n3. ATPとNADPHの生成",
          sender: "ai" as const,
          timestamp: new Date(Date.now() - 1140000),
          canEdit: true,
        },
      ],
    };
    return messageSets[id as keyof typeof students] || messageSets["1"];
  };

  const student = getStudentData(studentId);
  const [messages, setMessages] = useState<Message[]>(
    getMessagesForStudent(studentId)
  );

  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditedContent(currentContent);
    setComment(""); // Clear previous comment
  };

  const handleSaveEdit = () => {
    if (editingMessageId) {
      console.log("Saving correction and comment:", {
        messageId: editingMessageId,
        correction: editedContent,
        comment: comment,
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === editingMessageId ? { ...msg, content: editedContent } : msg
        )
      );
      setEditingMessageId(null);
      setEditedContent("");
      setComment("");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditedContent("");
    setComment("");
  };

  const handleFeedback = (messageId: string, isGood: boolean) => {
    console.log(
      `Feedback for message ${messageId}: ${isGood ? "Good" : "Bad"}`
    );
    // ここで実際のフィードバック処理を実装
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={student.avatar} />
            <AvatarFallback>
              {student.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-medium">{student.name}のチャット</h1>
            <p className="text-sm text-muted-foreground">
              添削・レビューモード
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            <div
              className={`flex ${
                message.sender === "student" ? "justify-end" : "justify-start"
              }`}
            >
              <div className={`max-w-[70%] space-y-2`}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {message.sender === "student" ? "若手社員" : "AI"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.timestamp)}
                  </span>
                </div>

                <Card
                  className={`${
                    message.sender === "student"
                      ? "bg-primary text-primary-foreground ml-4"
                      : "bg-card mr-4"
                  }`}
                >
                  <CardContent className="p-3">
                    {editingMessageId === message.id ? (
                      <div className="space-y-3">
                        <label className="text-xs font-medium text-muted-foreground">
                          AIの回答を添削
                        </label>
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="min-h-20 text-sm"
                          placeholder="AIの回答を添削してください..."
                        />
                        <label className="text-xs font-medium text-muted-foreground">
                          コメント (若手社員に表示されます)
                        </label>
                        <Textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="min-h-16 text-sm"
                          placeholder="なぜこのように添削したか、補足情報などを入力します..."
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Save className="h-3 w-3 mr-1" />
                            保存
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3 mr-1" />
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm whitespace-pre-line">
                          {message.content}
                        </p>

                        {message.sender === "ai" && message.canEdit && (
                          <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                            <span className="text-xs font-medium">
                              品質評価:
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFeedback(message.id, true)}
                              className="h-7 px-2"
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              良い
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFeedback(message.id, false)}
                              className="h-7 px-2"
                            >
                              <ThumbsDown className="h-3 w-3 mr-1" />
                              悪い
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                handleEditMessage(message.id, message.content)
                              }
                              className="h-7 px-2 ml-auto"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              添削
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="border-t bg-muted/50 px-4 py-3">
        <p className="text-sm text-muted-foreground text-center">
          💡 AIの回答をクリックして添削することで、知識ベースが改善されます
        </p>
      </div>
    </div>
  );
}
