import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Bell, MessageSquare, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

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

interface FeedbackNotificationCenterProps {
  feedbacks: MentorFeedback[];
  onMarkAsReviewed: (feedbackId: string) => void;
}

export function FeedbackNotificationCenter({ feedbacks, onMarkAsReviewed }: FeedbackNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const pendingCount = feedbacks.filter(f => f.status === 'pending').length;
  const recentFeedbacks = feedbacks
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

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
        return '未確認';
      case 'reviewed':
        return '確認済み';
      case 'applied':
        return '適用済み';
      default:
        return '';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            メンター添削通知
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingCount}件未確認
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4">
          <div className="space-y-3">
            {recentFeedbacks.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    まだメンターからの添削はありません
                  </p>
                </CardContent>
              </Card>
            ) : (
              recentFeedbacks.map((feedback) => (
                <Card key={feedback.id} className={`cursor-pointer transition-colors ${
                  feedback.status === 'pending' ? 'border-orange-200 bg-orange-50/50' : ''
                }`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1 text-xs">
                          {getStatusIcon(feedback.status)}
                          {getStatusText(feedback.status)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {feedback.mentorName}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {feedback.timestamp.toLocaleDateString()}
                      </span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-2">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">元の回答:</span>
                      <p className="mt-1 text-muted-foreground">
                        {truncateText(feedback.originalText)}
                      </p>
                    </div>
                    
                    <div className="text-xs">
                      <span className="font-medium text-green-700">修正版:</span>
                      <p className="mt-1 text-green-800">
                        {truncateText(feedback.correctedText)}
                      </p>
                    </div>

                    {feedback.feedback && (
                      <div className="text-xs">
                        <span className="font-medium">コメント:</span>
                        <p className="mt-1 text-muted-foreground">
                          {truncateText(feedback.feedback, 80)}
                        </p>
                      </div>
                    )}

                    {feedback.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsReviewed(feedback.id);
                          }}
                        >
                          確認済みにする
                        </Button>
                        <Button 
                          size="sm" 
                          className="text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to specific message in chat
                            setIsOpen(false);
                          }}
                        >
                          チャットで確認
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}