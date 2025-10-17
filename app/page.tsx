import React from 'react';
import Link from 'next/link';

export default function Page() {
  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Retention Engine UI (View-only)</h1>
        <p className="text-muted-foreground">Next.js ルーティングのサンプル。UIのみ、ロジックなし。</p>
        <div className="flex gap-4">
          <Link className="underline" href="/student">/student</Link>
          <Link className="underline" href="/mentor">/mentor</Link>
        </div>
      </div>
    </main>
  );
}

