import React from 'react';
import Link from 'next/link';

import AuthPagePresenter from '../Presenter/Entitle/AuthPagePresenter';

export default function Page() {
  return (
    <main className="min-h-screen bg-background p-6">
      <section className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Retention Engine UI</h1>
          <p className="text-muted-foreground">Entitle 用の認証・サンプルページです。</p>
          <div className="flex gap-4 text-sm">
            <Link className="underline" href="/student">
              新入社員画面
            </Link>
            <Link className="underline" href="/mentor">
              メンター画面
            </Link>
          </div>
        </header>
        <AuthPagePresenter />
      </section>
    </main>
  );
}
