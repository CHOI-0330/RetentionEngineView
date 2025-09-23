import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar";
import { Card } from "./ui/card";
import { MentorFeedbackPreview } from "./MentorFeedbackPreview";
import { Send, RotateCcw, Lightbulb, User } from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: "student" | "ai";
  timestamp: Date;
}

interface MentorFeedback {
  id: string;
  messageId: string;
  originalText: string;
  correctedText: string;
  feedback: string;
  mentorName: string;
  timestamp: Date;
  status: "pending" | "reviewed" | "applied";
}

interface StudentChatScreenProps {
  mentorFeedbacks?: MentorFeedback[];
  onUpdateFeedback?: (feedbacks: MentorFeedback[]) => void;
}

export function StudentChatScreen({
  mentorFeedbacks: propFeedbacks,
  onUpdateFeedback,
}: StudentChatScreenProps = {}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "こんにちは！二次方程式の理解に苦労しています。教えてもらえますか？",
      sender: "student",
      timestamp: new Date(Date.now() - 300000),
    },
    {
      id: "2",
      content:
        "もちろんです！二次方程式は2次の多項式で、通常ax² + bx + c = 0の形で表されます。簡単な例から始めましょう：x² - 5x + 6 = 0。これは因数分解または二次方程式の公式で解くことができます。",
      sender: "ai",
      timestamp: new Date(Date.now() - 240000),
    },
    {
      id: "3",
      content: "因数分解の方法を教えてもらえますか？",
      sender: "student",
      timestamp: new Date(Date.now() - 180000),
    },
    {
      id: "4",
      content:
        "もちろん！x² - 5x + 6 = 0を因数分解するには、積が6で和が-5になる2つの数を見つける必要があります。その数は-2と-3です。つまり：(x - 2)(x - 3) = 0となり、x = 2またはx = 3が解になります。",
      sender: "ai",
      timestamp: new Date(Date.now() - 120000),
    },
  ]);

  // Use props or fallback to mock data
  const mentorFeedbacks = propFeedbacks || [
    {
      id: "feedback-2",
      messageId: "2",
      originalText:
        "もちろんです！二次方程式は2次の多項式で、通常ax² + bx + c = 0の形で表されます。簡単な例から始めましょう：x² - 5x + 6 = 0。これは因数分解または二次方程式の公式で解くことができます。",
      correctedText:
        "こんにちは！二次方程式について説明させていただきますね。二次方程式は最高次の項が2次（x²）の方程式で、一般形はax² + bx + c = 0で表されます（a≠0）。具体例として x² - 5x + 6 = 0 を使って、因数分解と二次方程式の公式の両方の解法を見てみましょう。",
      feedback:
        "より丁寧な導入と、一般形の条件（a≠0）を明記することで理解が深まります。また、具体例を使って複数の解法を提示することで、学習者の選択肢を広げています。",
      mentorName: "田中先生",
      timestamp: new Date(Date.now() - 200000),
      status: "pending",
    },
    {
      id: "feedback-4",
      messageId: "4",
      originalText:
        "もちろん！x² - 5x + 6 = 0を因数分解するには、積が6で和が-5になる2つの数を見つける必要があります。その数は-2と-3です。つまり：(x - 2)(x - 3) = 0となり、x = 2またはx = 3が解になります。",
      correctedText:
        "因数分解の手順を詳しく説明しますね。x² - 5x + 6 = 0 では、定数項6と一次項の係数-5に注目します。積が6で和が-5になる2つの数を探すと、-2と-3です。確認：(-2) × (-3) = 6 ✓、(-2) + (-3) = -5 ✓。よって (x - 2)(x - 3) = 0 となり、x = 2 または x = 3 が解です。検算も大切ですね。",
      feedback:
        "手順を段階的に説明し、確認作業を明示することで、学習者が自分でも同じプロセスを辿れるようになります。検算の大切さも伝えています。",
      mentorName: "田中先生",
      timestamp: new Date(Date.now() - 60000),
      status: "reviewed",
    },
  ];

  const [newMessage, setNewMessage] = useState("");

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender: "student",
        timestamp: new Date(),
      };
      setMessages([...messages, message]);
      setNewMessage("");

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "あなたの質問を理解しました。この概念をより深く理解していただけるよう、詳しく説明いたします。",
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-medium">数学 - 二次方程式</h1>
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === "student" ? "justify-end" : "justify-start"}`}
          >
            {message.sender === "ai" && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  AI
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 max-w-[70%]">
              <Card
                className={`p-3 ${
                  message.sender === "student"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card"
                }`}
              >
                <p className="leading-relaxed">
                  {message.content}
                </p>
                <div
                  className={`text-xs mt-2 opacity-70 ${
                    message.sender === "student"
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </Card>

              {/* Mentor Feedback Preview for AI messages */}
              {message.sender === "ai" && (
                <MentorFeedbackPreview
                  messageId={message.id}
                  feedback={mentorFeedbacks.find(
                    (f) => f.messageId === message.id,
                  )}
                />
              )}
            </div>

            {message.sender === "student" && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            再質問
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            分かりやすく説明
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="質問を入力するか、会話を続けてください..."
            className="flex-1 rounded-full bg-input-background border-0"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            size="icon"
            className="rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}