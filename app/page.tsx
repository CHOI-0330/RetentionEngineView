import React from "react";

import AuthPage from "../src/interfaceAdapters/pages/entitle/AuthPage";

export default function Page() {
  return (
    // Tailwind CSS を使用した基本的なレイアウト
    <main className="min-h-screen w-full md:grid md:grid-cols-2">
      {/* Left Column: Hero / Branding */}
      <section className="hidden md:flex flex-col justify-between bg-muted p-10 text-primary-foreground lg:p-16 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light" />
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="size-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <div className="size-4 rounded-full bg-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Retention Engine
          </span>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            AIメンターシップで成長を支援
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            新入社員のオンボーディングからスキルアップまで。
            <br />
            AIメンターがあなたの成長を強力にサポートします。
          </p>
        </div>

        <div className="relative z-10 text-sm text-white/60">
          &copy; 2024 Retention Engine. All rights reserved.
        </div>
      </section>

      {/* Right Column: Auth Form */}
      <section className="flex items-center justify-center p-6 lg:p-10 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden space-y-2 text-center mb-8">
            <h1 className="text-2xl font-bold text-primary">
              Retention Engine
            </h1>
            <p className="text-muted-foreground">AIメンターシッププラットフォーム</p>
          </div>
          <AuthPage />
        </div>
      </section>
    </main>
  );
}
