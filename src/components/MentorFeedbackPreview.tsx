import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Eye, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';

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

interface MentorFeedbackPreviewProps {
  messageId: string;
  feedback?: MentorFeedback;
}

export function MentorFeedbackPreview({ feedback }: MentorFeedbackPreviewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!feedback) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'reviewed':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'applied':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '確認待ち';
      case 'reviewed':
        return '確認済み';
      case 'applied':
        return '適用済み';
      default:
        return '';
    }
  };

  const getDiffHighlights = (original: string, corrected: string) => {
    // Simple diff highlighting - in a real app, you'd use a proper diff library
    const originalWords = original.split(' ');
    const correctedWords = corrected.split(' ');
    
    return {
      original: originalWords.map((word, index) => 
        correctedWords[index] !== word ? 
          <span key={index} className="bg-red-100 text-red-800 px-1 rounded">{word}</span> : 
          <span key={index}>{word}</span>
      ).reduce((acc, curr) => <>{acc} {curr}</>),
      corrected: correctedWords.map((word, index) => 
        originalWords[index] !== word ? 
          <span key={index} className="bg-green-100 text-green-800 px-1 rounded">{word}</span> : 
          <span key={index}>{word}</span>
      ).reduce((acc, curr) => <>{acc} {curr}</>)
    };
  };

  const highlights = getDiffHighlights(feedback.originalText, feedback.correctedText);

  return (
    <div className="mt-2">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Badge 
            variant="secondary" 
            className="text-xs flex items-center gap-1 cursor-pointer hover:bg-secondary/80"
            role="button"
          >
            {getStatusIcon(feedback.status)}
            メンター添削あり
          </Badge>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              メンター添削内容
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Status and Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getStatusIcon(feedback.status)}
                  {getStatusText(feedback.status)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {feedback.mentorName} • {feedback.timestamp.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Original vs Corrected */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    元のAI回答
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{highlights.original}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    修正版
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{highlights.corrected}</p>
                </CardContent>
              </Card>
            </div>

            {/* Mentor's Feedback */}
            {feedback.feedback && (
              <>
                <Separator />
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">メンターからのコメント</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">{feedback.feedback}</p>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                閉じる
              </Button>
              {feedback.status === 'pending' && (
                <>
                  <Button variant="outline">
                    後で確認
                  </Button>
                  <Button>
                    修正を確認
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
