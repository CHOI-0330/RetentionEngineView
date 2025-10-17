"use client";
import React from 'react';
import { StudentChatView } from '../../src/views/StudentChatView';

export default function StudentPage() {
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <StudentChatView
          messages={[
            { id: '1', content: 'こんにちは！二次方程式について教えてください。', sender: 'student', timestamp: new Date() },
            { id: '2', content: 'もちろんです！まずは一般形から説明しますね。', sender: 'ai', timestamp: new Date() },
          ]}
          newMessage=""
          onChangeNewMessage={() => {}}
          onSend={() => {}}
          mentorFeedbacks={[
            {
              id: 'feedback-2',
              messageId: '2',
              originalText: 'もちろんです！まずは一般形から説明しますね。',
              correctedText: 'こんにちは！二次方程式について説明します。一般形はax² + bx + c = 0です。',
              feedback: '丁寧な導入を追加し、一般形を明確化しました。',
              mentorName: '田中先生',
              timestamp: new Date(),
              status: 'reviewed',
            },
          ]}
        />
      </div>
    </main>
  );
}

