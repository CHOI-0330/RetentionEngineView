"use client";
import React from 'react';
import { MentorDashboardView } from '../../src/views/MentorDashboardView';

export default function MentorPage() {
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <MentorDashboardView
          students={[{
            id: '1',
            name: '田中 愛美',
            avatar: undefined,
            lastActivity: new Date(Date.now() - 5 * 60 * 1000),
            status: 'active',
            recentChat: {
              summary: '二次方程式の公式の応用について質問',
              aiResponse: '弾道運動や最適化などに利用できます。',
              subject: '数学',
              timestamp: new Date(),
              needsReview: true,
            },
            totalChats: 15,
          }]}
          searchQuery=""
          onChangeSearch={() => {}}
          onViewStudentChat={() => {}}
          onFeedback={() => {}}
        />
      </div>
    </main>
  );
}

