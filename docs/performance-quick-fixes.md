# 성능 최적화 Quick Fix 가이드

RetentionEngineView 프로젝트의 즉시 적용 가능한 성능 개선 사항입니다.

---

## 🚀 Step 1: Next.js Config 생성 (5분)

### next.config.js 생성

프로젝트 루트에 `next.config.js` 파일을 생성하세요:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이미지 최적화 설정
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7일
  },

  // Webpack 최적화
  webpack: (config, { isServer }) => {
    // Tree-shaking 활성화
    config.optimization.sideEffects = false;

    // Radix UI 번들 분리 (클라이언트 사이드만)
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          radixui: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            chunks: 'async',
            priority: 9,
          },
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'lucide-icons',
            chunks: 'all',
            priority: 8,
          },
        },
      };
    }

    return config;
  },

  // 실험적 기능 - 패키지 최적화
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      'lucide-react',
    ],
  },

  // 압축 활성화
  compress: true,

  // X-Powered-By 헤더 제거 (보안)
  poweredByHeader: false,

  // 리액트 strict mode
  reactStrictMode: true,

  // SWC minify 사용 (Terser보다 빠름)
  swcMinify: true,
};

module.exports = nextConfig;
```

**적용 후 빌드**:
```bash
npm run build
```

**예상 효과**: 번들 크기 10-15% 감소

---

## 🚀 Step 2: Bundle Analyzer 설치 (3분)

### 1. 패키지 설치

```bash
npm install --save-dev @next/bundle-analyzer
```

### 2. next.config.js 수정

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // ... 기존 설정
};

module.exports = withBundleAnalyzer(nextConfig);
```

### 3. package.json에 스크립트 추가

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "analyze": "ANALYZE=true npm run build"
  }
}
```

### 4. 번들 분석 실행

```bash
npm run analyze
```

브라우저에서 자동으로 분석 리포트가 열립니다.

---

## 🚀 Step 3: 주요 라우트 코드 스플리팅 (15분)

### 1. StudentChatView 동적 import

**파일**: `app/student/chat/[convId]/page.tsx`

```typescript
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// 로딩 컴포넌트
const ChatLoadingSkeleton = () => (
  <div className="flex h-[calc(100vh-3.5rem)] flex-col p-6 gap-4">
    <Skeleton className="h-12 w-full" />
    <div className="flex-1 space-y-4">
      <Skeleton className="h-20 w-3/4" />
      <Skeleton className="h-20 w-2/3 ml-auto" />
      <Skeleton className="h-20 w-3/4" />
    </div>
    <Skeleton className="h-16 w-full" />
  </div>
);

// 동적 import
const StudentChatView = dynamic(
  () => import('@/views/studentChat/StudentChatView').then(mod => ({
    default: mod.StudentChatView
  })),
  {
    loading: () => <ChatLoadingSkeleton />,
    ssr: true, // SEO를 위해 SSR 유지
  }
);

export default function StudentChatPage({ params }: { params: { convId: string } }) {
  // ... 기존 로직
  return <StudentChatView {...props} />;
}
```

### 2. Chart 컴포넌트 lazy loading

**파일**: `src/components/ui/chart.tsx` 사용하는 곳

```typescript
import dynamic from 'next/dynamic';

// Chart는 클라이언트 전용으로 동적 로딩
const ChartContainer = dynamic(
  () => import('@/components/ui/chart').then(mod => ({
    default: mod.ChartContainer
  })),
  {
    ssr: false, // 차트는 SSR 불필요
    loading: () => <div className="h-[300px] animate-pulse bg-muted rounded-lg" />
  }
);

const ChartTooltip = dynamic(
  () => import('@/components/ui/chart').then(mod => ({
    default: mod.ChartTooltip
  })),
  { ssr: false }
);
```

### 3. Calendar 컴포넌트 lazy loading

```typescript
import dynamic from 'next/dynamic';

const Calendar = dynamic(
  () => import('@/components/ui/calendar').then(mod => ({
    default: mod.Calendar
  })),
  {
    ssr: false,
    loading: () => <div className="h-[280px] w-[280px] animate-pulse bg-muted rounded-md" />
  }
);
```

**예상 효과**: First Load JS 202 kB → 120-140 kB (30-40% 감소)

---

## 🚀 Step 4: Next.js Image 적용 (10분)

### 1. AIAvatar 컴포넌트 개선

**파일**: `src/components/chat/AIAvatar.tsx`

```typescript
"use client";

import React, { memo } from "react";
import Image from "next/image"; // ✅ Next.js Image 사용
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { cn } from "../ui/utils";
import type { AvatarEmotion, AvatarUrls } from "../../domain/core";

export interface AIAvatarProps {
  avatars: AvatarUrls | null;
  emotion?: AvatarEmotion;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "size-8",   // 32px
  md: "size-10",  // 40px
  lg: "size-12",  // 48px
};

const SIZE_PIXELS = {
  sm: 32,
  md: 40,
  lg: 48,
};

/**
 * AIメンターアバターコンポーネント (Next.js Image 최적화 적용)
 */
export const AIAvatar = memo(function AIAvatar({
  avatars,
  emotion = "neutral",
  size = "md",
  className,
}: AIAvatarProps) {
  const sizeClass = SIZE_MAP[size];
  const sizePixels = SIZE_PIXELS[size];

  // 아바터가 없는 경우
  if (!avatars) {
    return (
      <Avatar className={cn(sizeClass, className)}>
        <AvatarFallback className="bg-primary/10 text-primary">
          AI
        </AvatarFallback>
      </Avatar>
    );
  }

  const imageUrl = avatars[emotion] || avatars.neutral;

  return (
    <Avatar className={cn(sizeClass, "transition-all duration-200", className)}>
      {/* ✅ Next.js Image 사용 */}
      <div className="relative w-full h-full overflow-hidden rounded-full">
        <Image
          src={imageUrl}
          alt={`AI mentor - ${emotion}`}
          width={sizePixels}
          height={sizePixels}
          quality={75}
          loading="lazy"
          className="object-cover"
          sizes={`${sizePixels}px`}
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        />
      </div>
      <AvatarFallback className="bg-primary/10 text-primary">
        AI
      </AvatarFallback>
    </Avatar>
  );
});

export default AIAvatar;
```

### 2. next.config.js에 이미지 도메인 추가

Supabase Storage를 사용 중이라면:

```javascript
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
};
```

**예상 효과**:
- 이미지 크기 30-50% 감소
- LCP 20-30% 개선
- 자동 WebP/AVIF 변환

---

## 🚀 Step 5: useCallback 최적화 (10분)

### 1. StudentDashboardPage 개선

**파일**: `src/interfaceAdapters/pages/entitle/StudentDashboardPage.tsx`

```typescript
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

const StudentDashboardPage = () => {
  const router = useRouter();

  const { state: sessionState, session } = useSessionGuard({
    requiredRole: "NEW_HIRE",
  });

  const presenter = useStudentDashboardPresenter({
    accessToken: session?.accessToken,
    userId: session?.userId,
    role: session?.role,
  });

  // ✅ useCallback 적용
  const handleNavigateToConversation = useCallback(
    (convId: string) => {
      router.push(`/student/chat/${encodeURIComponent(convId)}`);
    },
    [router] // router는 stable하므로 안전
  );

  // ... 나머지 로직

  return (
    <StudentDashboardView
      heading={heading}
      viewModel={presenter.viewModel}
      // ... props
      onNavigateToConversation={handleNavigateToConversation}
    />
  );
};
```

### 2. StudentDashboardView 핸들러 최적화

**파일**: `src/views/StudentDashboardView.tsx`

```typescript
const StudentDashboardView = ({
  heading,
  viewModel,
  isLoading,
  isCreating,
  error,
  newTitle,
  isDeleting,
  actions,
  onNavigateToConversation,
}: StudentDashboardViewProps) => {

  // ✅ useCallback으로 함수 메모이제이션
  const handleCreateConversation = useCallback(() => {
    const title = newTitle.trim() || "新しい会話";
    void actions.createConversation(title);
  }, [newTitle, actions.createConversation]);

  const handleDeleteConversation = useCallback((convId: string) => {
    const confirmed = window.confirm(
      "この会話を削除しますか？この操作は取り消せません。"
    );
    if (confirmed) {
      void actions.deleteConversation(convId);
    }
  }, [actions.deleteConversation]);

  // ... 나머지 렌더링
};
```

**예상 효과**: 불필요한 리렌더링 20-30% 감소

---

## 🚀 Step 6: Radix UI 미사용 패키지 제거 (5분)

### 사용 빈도 확인 후 제거

```bash
# 사용 빈도 낮은 패키지 제거 (분석 결과 기반)
npm uninstall @radix-ui/react-aspect-ratio
npm uninstall @radix-ui/react-toggle-group
npm uninstall @radix-ui/react-menubar
```

**제거 전 확인**:
```bash
# 해당 패키지 사용처 검색
grep -r "aspect-ratio" src/
grep -r "toggle-group" src/
grep -r "menubar" src/
```

실제로 사용 중이 아니면 제거 가능합니다.

**예상 효과**: 번들 크기 5-8% 감소

---

## 📊 성능 측정

### Before/After 비교

최적화 전후를 측정하세요:

```bash
# 1. 최적화 전 빌드
npm run build

# 2. Quick Fix 적용

# 3. 최적화 후 빌드
npm run build

# 4. 번들 분석
npm run analyze
```

### Lighthouse 측정

```bash
# 개발 서버 실행
npm run dev

# 다른 터미널에서
npx lighthouse http://localhost:3000/student/dashboard --view
```

### Chrome DevTools

1. DevTools 열기 (F12)
2. Performance 탭
3. 새로고침 + 프로파일링
4. Coverage 탭에서 미사용 코드 확인

---

## ✅ Quick Wins 체크리스트

### 즉시 적용 (30분 이내)

- [ ] next.config.js 생성 및 기본 설정
- [ ] Bundle analyzer 설치
- [ ] StudentChatView 동적 import
- [ ] Chart 컴포넌트 lazy loading
- [ ] AIAvatar Next.js Image 적용

### 당일 적용 (1-2시간)

- [ ] MentorChatView 동적 import
- [ ] Calendar lazy loading
- [ ] useCallback 주요 핸들러 적용
- [ ] Radix UI 미사용 패키지 제거
- [ ] 이미지 도메인 설정

### 성능 측정

- [ ] 빌드 전후 First Load JS 비교
- [ ] Lighthouse 점수 측정
- [ ] Web Vitals 모니터링 설정
- [ ] Coverage 분석 (미사용 코드 확인)

---

## 🎯 예상 개선 효과

| 항목 | Before | After | 개선율 |
|-----|--------|-------|-------|
| First Load JS (/student/chat) | 202 kB | 120-140 kB | 30-40% ↓ |
| First Load JS (/) | 154 kB | 100-120 kB | 22-35% ↓ |
| 이미지 로딩 속도 | 기준 | 1.5-2x 빠름 | 50-100% ↑ |
| LCP | ~3.5s* | ~2.0-2.5s | 29-43% ↑ |
| 번들 크기 (총) | 100% | 65-75% | 25-35% ↓ |

*추정치

---

## 🚨 주의사항

### 1. 동적 import 시 주의

- SEO가 중요한 페이지는 `ssr: true` 유지
- 로딩 상태를 반드시 제공 (Skeleton)
- 너무 많은 청크 분할은 오히려 성능 저하 가능

### 2. Next.js Image 주의

- 외부 이미지는 `remotePatterns` 설정 필수
- 이미지 크기(width/height) 반드시 지정
- 레이아웃 시프트 방지 위해 `placeholder` 사용 권장

### 3. useCallback 과용 금지

- 단순한 함수는 메모이제이션 불필요
- 의존성 배열 정확히 관리
- React DevTools Profiler로 실제 효과 측정

---

## 📞 도움말

### 문제 발생 시

1. **빌드 에러**: `rm -rf .next && npm run build`
2. **이미지 로딩 실패**: next.config.js 도메인 설정 확인
3. **번들 분석 안 됨**: `@next/bundle-analyzer` 재설치

### 추가 최적화 필요 시

`docs/performance-bottleneck-analysis.md` 참고하여 Phase 2, 3 진행

---

**작성일**: 2025-12-19
**예상 작업 시간**: 30분 ~ 2시간
**난이도**: ⭐⭐ (중하)
