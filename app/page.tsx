import React from "react";

import AuthPage from "../src/interfaceAdapters/pages/entitle/AuthPage";

// 메인 페이지 배경 이미지
const HERO_IMAGE = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1920&q=80";

export default function Page() {
  return (
    // Tailwind CSS を使用した基本的なレイアウト
    <main className="min-h-screen w-full md:grid md:grid-cols-2">
      {/* Left Column: Hero / Branding */}
      <section
        className="hidden md:flex flex-col justify-between p-10 text-primary-foreground lg:p-16 relative overflow-hidden"
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* 로고 */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="size-8 rounded-lg bg-white flex items-center justify-center">
            <div className="size-4 rounded-full bg-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            Retention Engine
          </span>
        </div>

        {/* 메인 텍스트 - 심플한 그라데이션 배경 */}
        <div className="relative z-10 space-y-4 max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
            建設業の人材定着をAIがサポート
          </h1>
          <p className="text-lg text-white leading-relaxed" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
            新入社員の早期離職を防ぎ、組織の生産性を向上させます。
          </p>
        </div>

        {/* 푸터 */}
        <div className="relative z-10 text-sm text-white/90" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
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
