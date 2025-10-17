export const metadata = {
  title: 'Retention Engine UI',
  description: 'View-only components prepared for Next.js',
};

import './globals.css';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

