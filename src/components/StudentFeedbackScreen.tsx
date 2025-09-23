import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Edit } from 'lucide-react';

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

interface StudentFeedbackScreenProps {
  mentorFeedbacks: MentorFeedback[];
}

export function StudentFeedbackScreen({ mentorFeedbacks }: StudentFeedbackScreenProps) {

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <div className="p-4 space-y-4">
      {mentorFeedbacks.length > 0 ? (
        mentorFeedbacks.map((feedback) => (
          <Card key={feedback.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">添削フィードバック</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {feedback.mentorName}先生より • {formatDate(feedback.timestamp)}
                  </p>
                </div>
                <Badge variant={feedback.status === 'pending' ? 'destructive' : 'secondary'}>
                  {feedback.status === 'pending' ? '未読' : '確認済み'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">元のAIの回答:</h4>
                <p className="text-sm bg-muted/40 p-3 rounded-md text-muted-foreground">
                  {feedback.originalText}
                </p>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">メンターの提案:</h4>
                <p className="text-sm bg-green-100/50 dark:bg-green-900/30 p-3 rounded-md">
                  {feedback.correctedText}
                </p>
              </div>
              {feedback.feedback && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">コメント:</h4>
                  <p className="text-sm bg-blue-100/50 dark:bg-blue-900/30 p-3 rounded-md">
                    {feedback.feedback}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="p-8 text-center">
          <Edit className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">受信したフィードバックはありません</h3>
          <p className="text-muted-foreground">
            メンターからのフィードバックはここに表示されます。
          </p>
        </Card>
      )}
    </div>
  );
}
