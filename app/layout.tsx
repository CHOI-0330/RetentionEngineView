export const metadata = {
  title: "Retention Engine UI",
  description: "View-only components prepared for Next.js",
};

import "../src/index.css";
import React from "react";
import Link from "next/link";
import AppUserMenu from "../src/components/AppUserMenu";
import { SessionProvider } from "../src/components/SessionProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-background text-foreground">
        <SessionProvider>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
          >
            コンテンツへスキップ
          </a>
          <header className="border-b bg-card fixed inset-x-0 top-0 z-50">
            <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
              <div className="flex items-center justify-between">
                <Link href="/" className="text-sm font-semibold hover:underline">
                  Retention Engine UI
                </Link>
                <div className="flex items-center gap-4">
                  <AppUserMenu />
                </div>
              </div>
            </div>
          </header>
          {/* spacer for fixed header */}
          <div aria-hidden className="h-12" />
          <div id="content">{children}</div>
        </SessionProvider>
      </body>
    </html>
  );
}
