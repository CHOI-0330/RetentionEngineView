import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Loader2 } from "lucide-react";

interface MentorChatMessage {
  id: string;
  role: "NEW_HIRE" | "ASSISTANT";
  content: string;
  createdAt: Date;
  status?: "DRAFT" | "PARTIAL" | "DONE" | "CANCELLED";
  feedbacks: {
    id: string;
    authorName: string;
    content: string;
    createdAt: Date;
  }[];
}

interface MentorStudentChatViewProps {
  conversationTitle: string;
  studentName: string;
  mentorName: string;
  messages: MentorChatMessage[];
  feedbackDrafts: Record<string, string>;
  feedbackSubmitting: Record<string, boolean>;
  feedbackErrors: Record<string, string | null | undefined>;
  onFeedbackDraftChange: (messageId: string, value: string) => void;
  onSubmitFeedback: (messageId: string) => void;
}

const MentorStudentChatView = ({
  conversationTitle,
  studentName,
  mentorName,
  messages,
  feedbackDrafts,
  feedbackSubmitting,
  feedbackErrors,
  onFeedbackDraftChange,
  onSubmitFeedback,
}: MentorStudentChatViewProps) => {
  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border bg-card px-6 py-4">
        <h1 className="text-xl font-semibold">{conversationTitle}</h1>
        <p className="text-sm text-muted-foreground">
          学生: {studentName} / メンター: {mentorName}
        </p>
      </header>

      <section className="rounded-2xl border bg-card p-6">
        <div className="space-y-4">
          {messages.map((message) => {
            const isStudent = message.role === "NEW_HIRE";
            return (
              <div
                key={message.id}
                className={`flex w-full flex-col ${isStudent ? "items-end" : "items-start"}`}
              >
                <Card className={isStudent ? "max-w-[70%] bg-primary text-primary-foreground" : "max-w-[70%] bg-muted"}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                      <span>{isStudent ? "New Hire" : "Assistant"}</span>
                      <span>{message.createdAt.toLocaleString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    {message.status && (
                      <Badge variant="outline" className="text-xs">
                        {message.status.toLowerCase()}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
                {message.feedbacks.length ? (
                  <div className="mt-3 w-full max-w-[70%] space-y-3 rounded-md bg-muted/40 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Feedback</p>
                    {message.feedbacks.map((feedback) => (
                      <div key={feedback.id} className="rounded-md border bg-background p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{feedback.authorName}</span>
                          <span>{feedback.createdAt.toLocaleString()}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap leading-relaxed">{feedback.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                {message.role === "ASSISTANT" ? (
                  <div className="mt-3 w-full max-w-[70%] rounded-md border bg-background p-3">
                    <form
                      className="space-y-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        onSubmitFeedback(message.id);
                      }}
                    >
                      <div className="space-y-1">
                        <Label htmlFor={`mentor-feedback-${message.id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
                          学生へのフィードバック
                        </Label>
                        <Textarea
                          id={`mentor-feedback-${message.id}`}
                          value={feedbackDrafts[message.id] ?? ""}
                          onChange={(event) => onFeedbackDraftChange(message.id, event.target.value)}
                          rows={3}
                          placeholder="気づきやアドバイスを入力してください"
                        />
                      </div>
                      {feedbackErrors[message.id] ? (
                        <p className="text-sm text-destructive">{feedbackErrors[message.id]}</p>
                      ) : null}
                      <div className="flex justify-end">
                        <Button type="submit" size="sm" disabled={feedbackSubmitting[message.id] ?? false}>
                          {feedbackSubmitting[message.id] ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 送信中...
                            </>
                          ) : (
                            "フィードバックを送信"
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </div>
            );
          })}
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだメッセージがありません。</p>
          ) : null}
        </div>
      </section>
    </div>
  );
};

export default MentorStudentChatView;
