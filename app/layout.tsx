export const metadata = {
  title: "Retention Engine UI",
  description: "View-only components prepared for Next.js",
};

import "../src/index.css";
import React from "react";
import Link from "next/link";
import AppUserMenu from "../src/components/AppUserMenu";
import { SessionProvider } from "../src/components/SessionProvider";
import { cn } from "../src/components/ui/utils";
import { Toaster } from "../src/components/ui/sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased"
        )}
      >
        <SessionProvider>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
          >
            コンテンツへスキップ
          </a>
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between sm:px-6">
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="text-sm font-bold tracking-tight hover:text-primary transition-colors"
                >
                  Retention Engine
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <AppUserMenu />
              </div>
            </div>
          </header>
          <div id="content" className="relative overflow-hidden">
            {children}
          </div>
          <Toaster richColors position="top-center" />
        </SessionProvider>
      </body>
    </html>
  );
}
