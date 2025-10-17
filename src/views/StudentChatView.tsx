import React from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Card } from "../components/ui/card";
import { MentorFeedbackPreview } from "../components/MentorFeedbackPreview";
import { Send, RotateCcw, Lightbulb, User } from "lucide-react";

type Sender = "student" | "ai";

export interface ChatMessage {
  id: string;
  content: string;
  sender: Sender;
  timestamp: Date;
}

export interface MentorFeedback {
  id: string;
  messageId: string;
  originalText: string;
  correctedText: string;
  feedback: string;
  mentorName: string;
  timestamp: Date;
  status: "pending" | "reviewed" | "applied";
}

interface StudentChatViewProps {
  messages: ChatMessage[];
  newMessage: string;
  onChangeNewMessage: (value: string) => void;
  onSend: () => void;
  mentorFeedbacks?: MentorFeedback[];
}

export function StudentChatView({
  messages,
  newMessage,
  onChangeNewMessage,
  onSend,
  mentorFeedbacks = [],
}: StudentChatViewProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col h-[70vh] bg-background rounded-md overflow-hidden border">
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

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === "student" ? "justify-end" : "justify-start"}`}
          >
            {message.sender === "ai" && (
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
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
                <p className="leading-relaxed">{message.content}</p>
                <div
                  className={`text-xs mt-2 opacity-70 ${
                    message.sender === "student"
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </Card>

              {message.sender === "ai" && (
                <MentorFeedbackPreview
                  messageId={message.id}
                  feedback={mentorFeedbacks.find((f) => f.messageId === message.id)}
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

      <div className="border-t bg-white p-4">
        <div className="flex gap-2 mb-3">
          <Button variant="outline" size="sm" className="rounded-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            再質問
          </Button>
          <Button variant="outline" size="sm" className="rounded-full">
            <Lightbulb className="h-4 w-4 mr-2" />
            分かりやすく説明
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => onChangeNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="質問を入力するか、会話を続けてください..."
            className="flex-1 rounded-full bg-input-background border-0"
          />
          <Button onClick={onSend} disabled={!newMessage.trim()} size="icon" className="rounded-full">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

