import React from 'react';

import AuthPage from '../src/interfaceAdapters/pages/entitle/AuthPage';

export default function Page() {
  return (
    <main className="min-h-screen bg-background p-6">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Retention Engine UI</h1>
          <p className="text-muted-foreground">Entitle 用の認証・サンプルページです。</p>
        </header>
        <AuthPage />
      </section>
    </main>
  );
}
