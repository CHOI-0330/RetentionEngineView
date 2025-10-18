import React from 'react';
import Link from 'next/link';

import AuthPagePresenter from '../Presenter/Entitle/AuthPagePresenter';

export default function Page() {
  return (
    <main className="min-h-screen bg-background p-6">
      <section className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Retention Engine UI</h1>
          <p className="text-muted-foreground">Entitle용 인증/샘플 페이지입니다.</p>
          <div className="flex gap-4 text-sm">
            <Link className="underline" href="/student">
              학생 화면
            </Link>
            <Link className="underline" href="/mentor">
              멘토 화면
            </Link>
          </div>
        </header>
        <AuthPagePresenter />
      </section>
    </main>
  );
}
