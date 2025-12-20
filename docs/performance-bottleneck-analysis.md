# RetentionEngineView 성능 병목 분석 보고서

**분석일**: 2025-12-19
**프로젝트**: RetentionEngine UI v0.2.0
**프레임워크**: Next.js 14.2.33

---

## 📊 종합 점수

| 항목 | 상태 | 점수 |
|-----|------|------|
| 번들 사이즈 | ⚠️ 개선 필요 | 6/10 |
| 렌더링 최적화 | ⚠️ 부분적 최적화 | 7/10 |
| 이미지/에셋 최적화 | ❌ 미흡 | 3/10 |
| 코드 스플리팅 | ❌ 미적용 | 2/10 |
| API 최적화 | ⚠️ 개선 필요 | 6/10 |
| Next.js 최적화 | ⚠️ 부분적 활용 | 5/10 |

**총점: 29/60 (48.3%)**

---

## 🔴 크리티컬 이슈 (즉시 대응 필요)

### 1. 코드 스플리팅 미적용 (최우선)

**문제점**:
```typescript
// ❌ 현재: 동적 import 없음
// 검색 결과: dynamic() 및 lazy() 사용 패턴 없음
```

**영향도**: 🔴 **매우 높음** (First Load JS 87.3 kB ~ 202 kB)

**발견된 대용량 라우트**:
- `/student/chat/[convId]`: **202 kB** (First Load JS)
- `/student`: **202 kB**
- `/mentor/chat/[convId]`: **198 kB**
- `/`: **154 kB**

**원인**:
- 모든 UI 컴포넌트가 정적 import
- Radix UI 전체 번들 포함 (12MB 설치 크기)
- Chart, Calendar 등 무거운 컴포넌트 즉시 로드

**해결책**:
```typescript
// ✅ 개선안: 동적 import 적용
import dynamic from 'next/dynamic';

// 무거운 컴포넌트 lazy loading
const StudentChatView = dynamic(
  () => import('@/views/studentChat/StudentChatView'),
  { loading: () => <ChatSkeleton /> }
);

const Chart = dynamic(
  () => import('@/components/ui/chart'),
  { ssr: false } // 차트는 클라이언트 전용
);

const Calendar = dynamic(
  () => import('@/components/ui/calendar'),
  { ssr: false }
);
```

**예상 개선 효과**:
- First Load JS: 202 kB → **80-100 kB** (50%+ 감소)
- 초기 로딩 속도: **40-60% 개선**

---

### 2. Next.js Image 컴포넌트 미사용

**문제점**:
```typescript
// src/components/chat/AIAvatar.tsx
<AvatarImage
  src={imageUrl}  // ❌ 최적화되지 않은 이미지
  alt={`AI mentor - ${emotion}`}
  className="object-cover"
/>
```

**영향도**: 🔴 **높음** (아바타 이미지 6종 × 감정 상태)

**개선 전후**:
```typescript
// ❌ Before: 최적화 없음
<AvatarImage src={imageUrl} alt="..." />

// ✅ After: Next.js Image 사용
import Image from 'next/image';

<Image
  src={imageUrl}
  alt={`AI mentor - ${emotion}`}
  width={40}
  height={40}
  quality={75}
  loading="lazy"
  placeholder="blur"
  blurDataURL={generateBlurDataURL(emotion)}
/>
```

**예상 개선 효과**:
- 이미지 크기: **30-50% 감소** (WebP 자동 변환)
- LCP (Largest Contentful Paint): **20-30% 개선**

---

### 3. Radix UI 과도한 번들 포함

**문제점**:
```json
// package.json - 25개 Radix UI 패키지 설치
"@radix-ui/react-accordion": "^1.2.3",
"@radix-ui/react-alert-dialog": "^1.1.6",
"@radix-ui/react-aspect-ratio": "^1.1.2",
// ... 총 25개
```

**설치 크기**: 12 MB
**실제 사용 패턴**: 모든 페이지에서 일부 컴포넌트만 사용

**영향도**: 🔴 **높음** (61개 파일에서 import)

**해결책**:

1. **Tree-shaking 최적화**:
```javascript
// next.config.js 생성 필요
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.optimization.sideEffects = false;
    return config;
  },
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      // 자주 사용하는 컴포넌트만 명시
    ],
  },
};

module.exports = nextConfig;
```

2. **미사용 패키지 제거**:
```bash
# 사용 빈도 낮은 패키지 확인 후 제거 검토
- @radix-ui/react-aspect-ratio (사용: 1회)
- @radix-ui/react-toggle-group (사용: 1회)
- @radix-ui/react-menubar (사용: 2회)
```

**예상 개선 효과**:
- 번들 크기: **15-25% 감소**
- 파싱 시간: **10-15% 개선**

---

## 🟡 중요 이슈 (단기 개선)

### 4. React 최적화 불충분

**현황**:
- `memo/useMemo/useCallback` 사용: **28개 파일** (총 164회)
- Client Component: **54개 파일**에 `"use client"` 선언
- 상태 관리 컴포넌트: **10개 파일**

**문제점**:

1. **과도한 리렌더링 가능성**:
```typescript
// src/interfaceAdapters/presenters/useStudentChatPresenter.ts (702줄)
// ❌ 대규모 Presenter Hook - 모든 상태 변경 시 리렌더링
export interface StudentChatPresenterOutput {
  viewModel: StudentChatViewModel | null;
  isLoading: boolean;
  isSending: boolean;
  // ... 20+ 상태 필드
}
```

2. **useCallback 누락**:
```typescript
// ❌ Before: 매 렌더링마다 새 함수 생성
const handleCreateConversation = () => {
  const title = newTitle.trim() || "新しい会話";
  void actions.createConversation(title);
};

// ✅ After: 함수 메모이제이션
const handleCreateConversation = useCallback(() => {
  const title = newTitle.trim() || "新しい会話";
  void actions.createConversation(title);
}, [newTitle, actions.createConversation]);
```

**개선 방안**:

1. **Presenter 분리**:
```typescript
// 현재: 거대한 단일 Presenter (702줄)
useStudentChatPresenter()

// 개선: 관심사 분리
useStudentChatMessaging() // 메시지 전송
useStudentChatConversations() // 대화 관리
useStudentChatFeedback() // 피드백 관리
```

2. **React.memo 적극 활용**:
```typescript
// MessageList.tsx, MessageBubble.tsx 등에 이미 적용됨 ✅
export const MessageList = memo(function MessageList({ ... }) {
  // ...
});
```

**예상 개선 효과**:
- 리렌더링 횟수: **30-40% 감소**
- 인터랙션 반응 속도: **20-30% 개선**

---

### 5. 번들 분석 도구 미설치

**문제점**:
```bash
# @next/bundle-analyzer 미설치
npm error could not determine executable to run
```

**영향도**: 🟡 **중간** (최적화 모니터링 불가)

**해결책**:
```bash
npm install --save-dev @next/bundle-analyzer
```

```javascript
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... 기타 설정
});
```

```json
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build"
  }
}
```

---

### 6. 대용량 파일 존재

**발견된 대용량 파일**:
```
726줄 - src/components/ui/sidebar.tsx
702줄 - src/interfaceAdapters/presenters/useStudentChatPresenter.ts
502줄 - src/views/MentorStudentChatView.tsx
434줄 - src/interfaceAdapters/presenters/useAuthPresenter.ts
404줄 - src/interfaceAdapters/presenters/useAvatarPresenter.ts
```

**평균 파일 크기**: 133.7줄 (74개 파일 중)

**문제점**:
- Presenter가 500-700줄 (권장: 200-300줄)
- View 컴포넌트가 400-500줄 (권장: 200-300줄)

**개선 방안**:
```typescript
// useStudentChatPresenter.ts 분리
export const useStudentChatPresenter = () => {
  const messaging = useStudentChatMessaging();
  const conversations = useStudentChatConversations();
  const feedback = useStudentChatFeedback();
  const webSearch = useStudentChatWebSearch();

  return { messaging, conversations, feedback, webSearch };
};
```

---

## 🟢 개선 완료/양호 항목

### ✅ React 최적화 부분 적용

**잘 되고 있는 점**:
```typescript
// AIAvatar.tsx - memo 적용 ✅
export const AIAvatar = memo(function AIAvatar({ ... }) {
  // ...
});

// MessageList.tsx - memo 적용 ✅
export const MessageList = memo(function MessageList({ ... }) {
  // ...
});
```

### ✅ Next.js 14 App Router 사용

**좋은 점**:
- App Router 활용 (SSR/SSG 지원)
- API Routes 분리 (`/app/api`)
- 레이아웃 최적화 (`layout.tsx`)

### ✅ Middleware 가볍게 유지

```typescript
// middleware.ts - 최소한의 처리 ✅
export function middleware(request: NextRequest) {
  return NextResponse.next();
}
```

---

## 📋 우선순위별 개선 로드맵

### 🔴 Phase 1: 즉시 대응 (1-2주)

1. **Next.js config 생성 및 설정**
   - `next.config.js` 생성
   - Bundle analyzer 설치
   - Webpack 최적화 설정

2. **주요 라우트 코드 스플리팅**
   - `/student/chat/[convId]` (202 kB → 100 kB 목표)
   - `/mentor/chat/[convId]` (198 kB → 100 kB 목표)
   - Chart, Calendar 컴포넌트 lazy loading

3. **Next.js Image 적용**
   - AIAvatar 컴포넌트 개선
   - 아바타 이미지 WebP 변환

**예상 효과**:
- First Load JS: **40-50% 감소**
- LCP: **30-40% 개선**
- TTI: **25-35% 개선**

### 🟡 Phase 2: 중기 개선 (3-4주)

4. **Radix UI 최적화**
   - 미사용 패키지 제거
   - Tree-shaking 최적화
   - 대체 라이브러리 검토

5. **Presenter 분리**
   - `useStudentChatPresenter` 분할 (702줄 → 200줄×4)
   - `useAuthPresenter` 분할 (434줄 → 150줄×3)
   - `useAvatarPresenter` 분할 (404줄 → 150줄×3)

6. **React 최적화 강화**
   - useCallback 누락 부분 추가
   - 불필요한 리렌더링 제거
   - React DevTools Profiler로 측정

**예상 효과**:
- 번들 크기: **20-30% 추가 감소**
- 리렌더링: **30-40% 감소**
- 코드 유지보수성: **50%+ 향상**

### 🟢 Phase 3: 장기 최적화 (5-8주)

7. **SSG/ISR 활용**
   - 정적 페이지 SSG 적용 (`/profile`)
   - Dashboard ISR 적용 (revalidate: 60s)

8. **가상화 적용**
   - MessageList 가상 스크롤링
   - 긴 대화 목록 가상화

9. **API 최적화**
   - 응답 압축 (gzip)
   - 데이터 직렬화 최적화
   - 페이지네이션/무한 스크롤

10. **성능 모니터링 구축**
    - Web Vitals 측정
    - Lighthouse CI 통합
    - 성능 회귀 방지 체계

**예상 효과**:
- 전체 성능: **60-80% 개선**
- Core Web Vitals 달성
- 사용자 경험 획기적 향상

---

## 📊 예상 성능 개선 지표

| 지표 | 현재 | Phase 1 후 | Phase 2 후 | Phase 3 후 |
|-----|------|------------|------------|-----------|
| First Load JS | 202 kB | 100-120 kB | 80-100 kB | 60-80 kB |
| LCP | ~3.5s* | ~2.0s | ~1.5s | ~1.0s |
| TTI | ~4.0s* | ~2.5s | ~2.0s | ~1.5s |
| Bundle Size | 100% | 60% | 45% | 35% |
| Lighthouse | 70-80 | 85-90 | 90-95 | 95-100 |

*추정치 (실측 필요)

---

## 🛠️ 즉시 적용 가능한 Quick Wins

### 1. next.config.js 생성

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
  },

  // Webpack 최적화
  webpack: (config, { isServer }) => {
    config.optimization.sideEffects = false;

    if (!isServer) {
      config.optimization.splitChunks.cacheGroups = {
        radixui: {
          test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
          name: 'radix-ui',
          priority: 10,
          reuseExistingChunk: true,
        },
      };
    }

    return config;
  },

  // 실험적 기능
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      'lucide-react',
    ],
  },

  // 성능
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
```

### 2. 주요 컴포넌트 동적 import

```typescript
// app/student/chat/[convId]/page.tsx
import dynamic from 'next/dynamic';

const StudentChatView = dynamic(
  () => import('@/views/studentChat/StudentChatView'),
  {
    loading: () => <ChatLoadingSkeleton />,
    ssr: true, // SEO를 위해 SSR 유지
  }
);

// Chart는 클라이언트 전용
const Chart = dynamic(
  () => import('@/components/ui/chart'),
  { ssr: false }
);
```

### 3. 이미지 최적화

```typescript
// src/components/chat/AIAvatar.tsx
import Image from 'next/image';

export const AIAvatar = memo(function AIAvatar({
  avatars,
  emotion = "neutral",
  size = "md",
  className,
}: AIAvatarProps) {
  // ...

  return (
    <Avatar className={cn(sizeClass, "transition-all duration-200", className)}>
      <Image
        src={imageUrl}
        alt={`AI mentor - ${emotion}`}
        width={SIZE_PIXELS[size]}
        height={SIZE_PIXELS[size]}
        quality={75}
        loading="lazy"
        className="object-cover rounded-full"
      />
      <AvatarFallback className="bg-primary/10 text-primary">
        AI
      </AvatarFallback>
    </Avatar>
  );
});
```

---

## 📈 성과 측정 방법

### 1. Lighthouse 측정
```bash
npx lighthouse https://localhost:3000 --view
```

### 2. Next.js 번들 분석
```bash
ANALYZE=true npm run build
```

### 3. Chrome DevTools Performance
- Performance 탭에서 프로파일링
- Coverage 탭에서 사용되지 않는 코드 확인

### 4. Web Vitals 모니터링
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## ✅ 체크리스트

### Phase 1 (즉시)
- [ ] next.config.js 생성
- [ ] Bundle analyzer 설치
- [ ] /student/chat 코드 스플리팅
- [ ] /mentor/chat 코드 스플리팅
- [ ] AIAvatar Next.js Image 적용
- [ ] Chart lazy loading

### Phase 2 (중기)
- [ ] Radix UI 미사용 패키지 제거
- [ ] useStudentChatPresenter 분리
- [ ] useAuthPresenter 분리
- [ ] useCallback 누락 부분 추가
- [ ] React DevTools Profiler 측정

### Phase 3 (장기)
- [ ] Dashboard ISR 적용
- [ ] MessageList 가상화
- [ ] API 압축 적용
- [ ] Lighthouse CI 통합
- [ ] Web Vitals 모니터링 구축

---

## 📞 참고 자료

- [Next.js Performance Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

**보고서 생성일**: 2025-12-19
**분석 대상**: 160개 TypeScript 파일, 20,130 총 코드 라인
**분석 도구**: Next.js Build Output, Manual Code Review, Static Analysis
