# 프론트엔드 최적화 보고서

**작성일**: 2025-12-19
**작성자**: Claude Code
**프로젝트**: RetentionEngineView
**업데이트**: Phase 5 완료 (전체 최적화 완료)

---

## 1. 개요

Clean Architecture 기반 프론트엔드 애플리케이션의 렌더링 성능 및 사용자 경험 최적화를 수행했습니다.

## 2. 수행 작업

### 2.1 React.memo 적용 (Phase 1)

불필요한 리렌더링 방지를 위해 View 컴포넌트에 `React.memo` HOC를 적용했습니다.

| 파일 | 적용 컴포넌트 | 라인 수 |
|------|--------------|--------|
| `MentorStudentChatView.tsx` | `MentorFeedbackSection` | 502줄 |
| `AuthView.tsx` | `AuthView` | 320줄 |
| `MentorAssignmentView.tsx` | `AssignedNewhireList`, `NewhireSelectForm`, `MentorAssignmentView` | 213줄 |
| `ProfileView.tsx` | `ProfileView` | 129줄 |

**기존에 memo 적용된 컴포넌트:**
- `MentorDashboardView.tsx` - 7개 서브컴포넌트
- `StudentDashboardView.tsx` - 다수 서브컴포넌트
- `AvatarSettingsView.tsx` - 전체 컴포넌트

### 2.2 React Query - Profile/MBTI API (Phase 2)

Profile/MBTI API에 React Query를 적용하여 캐싱 및 상태 관리를 개선했습니다.

**새로 생성된 파일:**
- `src/interfaceAdapters/hooks/queries/useProfileQuery.ts`

**주요 개선사항:**
- 자동 캐싱 (1분 staleTime)
- Optimistic Updates로 즉각적인 UI 반응
- 백그라운드 리페칭

### 2.3 Suspense Boundaries (Phase 2)

Next.js App Router의 loading.tsx를 활용하여 자동 Suspense 경계를 추가했습니다.

**새로 생성된 파일:**
- `src/components/PageLoading.tsx` - 공통 로딩 컴포넌트
- `app/student/loading.tsx`
- `app/mentor/loading.tsx`
- `app/profile/loading.tsx`
- `app/student/chat/[convId]/loading.tsx`
- `app/mentor/chat/[convId]/loading.tsx`

**제공 컴포넌트:**
- `PageLoading` - 스피너 + 메시지
- `CardSkeleton` - 카드 스켈레톤
- `ListSkeleton` - 리스트 스켈레톤
- `DashboardSkeleton` - 대시보드 스켈레톤

### 2.4 React Query - Feedback API (Phase 3)

Feedback API에 React Query를 적용하여 피드백 조회/생성/수정의 캐싱 및 상태 관리를 개선했습니다.

**새로 생성된 파일:**
- `src/interfaceAdapters/hooks/queries/useFeedbackQuery.ts`

**제공 훅:**
| 훅 | 용도 | 기능 |
|----|------|------|
| `useFeedbacksQuery` | 피드백 목록 조회 | 캐싱 (30초 staleTime) |
| `useCreateFeedback` | 피드백 생성 | Optimistic Update |
| `useUpdateFeedback` | 피드백 수정 | Optimistic Update |
| `feedbackKeys` | 쿼리 키 관리 | 캐시 무효화 지원 |

### 2.5 React Query - MentorAssignment API (Phase 4)

MentorAssignment API에 React Query를 적용하여 멘토 할당 관리의 캐싱 및 상태 관리를 개선했습니다.

**새로 생성된 파일:**
- `src/interfaceAdapters/hooks/queries/useMentorAssignmentQuery.ts`

**제공 훅:**
| 훅 | 용도 | 기능 |
|----|------|------|
| `useStudentSummariesQuery` | 담당 학생 요약 조회 | 캐싱 (30초 staleTime) |
| `useAvailableNewhiresQuery` | 할당 가능 신입사원 조회 | 캐싱 (30초 staleTime) |
| `useCreateAssignment` | 멘토 할당 생성 | Optimistic Update |
| `mentorAssignmentKeys` | 쿼리 키 관리 | 캐시 무효화 지원 |

**주요 개선사항:**
- 학생 목록/신입사원 목록 자동 캐싱
- 할당 생성 시 Optimistic Update
- 할당 완료 후 양쪽 쿼리 자동 무효화

### 2.6 Dynamic Import (Phase 5)

큰 모달 컴포넌트에 Dynamic Import를 적용하여 초기 번들 크기를 줄였습니다.

**적용 파일:**
- `src/views/studentChat/MessageBubble.tsx`

**적용 컴포넌트:**
- `SourceDetailModal` - 파일 검색 결과 상세 모달

**구현 방식:**
```typescript
// Dynamic Import with lazy loading
const SourceDetailModal = lazy(() =>
  import("../../components/SourceDetailModal").then((m) => ({
    default: m.SourceDetailModal,
  }))
);

// Suspense wrapper (모달이 열릴 때만 로드)
{isSourceModalOpen && (
  <Suspense fallback={null}>
    <SourceDetailModal ... />
  </Suspense>
)}
```

**효과:**
- `/student` 페이지 크기: 18.1 kB → 17.7 kB (-400B)
- 모달은 사용자 클릭 시에만 로드

### 2.7 Image Optimization 검토 (Phase 5)

이미지 최적화 설정을 검토했습니다.

**현재 설정 (next.config.js):**
```javascript
images: {
  remotePatterns: [{ protocol: 'https', hostname: '**' }],
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```

**현재 이미지 사용 패턴:**
| 위치 | 방식 | 최적화 상태 |
|------|------|-----------|
| AIAvatar | Radix UI AvatarImage | API 동적 URL |
| ImageSlider | CSS backgroundImage | Unsplash 최적화 쿼리 사용 |
| 일반 Avatar | AvatarFallback (텍스트) | 이미지 없음 |

**결론:** 현재 구조는 적절하며, next/image 전환은 선택적입니다.

### 2.8 기존 최적화 현황

#### 번들 분할 (next.config.js)
```javascript
splitChunks: {
  radix: { priority: 30 },      // UI 라이브러리
  supabase: { priority: 25 },   // 백엔드 클라이언트
  charts: { priority: 20 },     // 차트 라이브러리
  vendors: { priority: 10 },    // 기타 node_modules
}
```

#### 패키지 최적화 (Tree-shaking)
- lucide-react (아이콘)
- @radix-ui/* (UI 컴포넌트)
- recharts (차트) - 현재 미사용, tree-shaking됨
- date-fns (날짜)

## 3. 빌드 결과

### 최종 빌드 (Phase 5 완료 후)
```
Route (app)                             Size     First Load JS
┌ ○ /                                   10.5 kB         298 kB
├ ○ /dev/preview                        2.63 kB         290 kB
├ ƒ /mentor                             612 B           261 kB
├ ƒ /mentor/chat/[convId]               619 B           261 kB
├ ○ /profile                            592 B           261 kB
├ ƒ /student                            17.7 kB         305 kB
├ ƒ /student/ai-settings                590 B           261 kB
├ ƒ /student/chat/[convId]              620 B           261 kB
└ ƒ /student/profile                    616 B           261 kB

+ First Load JS shared by all           356 kB
  ├ chunks/vendors-*.js                 258 kB
  ├ css/*.css                           95.5 kB
  └ other shared chunks                 2.16 kB
```

### 번들 크기 변화
| 항목 | 초기 | 최종 | 변화 |
|-----|------|------|------|
| First Load JS (shared) | 352 kB | 356 kB | +4 kB (+1.1%) |
| vendors chunk | 254 kB | 258 kB | +4 kB |
| /student 페이지 | 18.1 kB | 17.7 kB | -400 B |
| CSS | 95.5 kB | 95.5 kB | 동일 |

**분석**: React Query 훅 추가로 인한 미미한 증가는 UX 개선 대비 허용 가능한 수준입니다. Dynamic Import로 개별 페이지 크기는 감소했습니다.

## 4. 현재 아키텍처 강점

### Clean Architecture 적용
```
View (React) → Presenter (Hook) → Service → UseCase → Gateway → API
```

### 캐싱 전략 (React Query)
| API | 훅 | staleTime |
|-----|-----|----------|
| Messages | useMessagesQuery | 0 (항상 최신) |
| Conversations | useConversationsQuery | 30초 |
| Profile/MBTI | useMbtiQuery | 1분 |
| Feedback | useFeedbacksQuery | 30초 |
| MentorAssignment | useStudentSummariesQuery | 30초 |

### 코드 스플리팅
- Next.js App Router 기반 자동 코드 스플리팅
- Webpack splitChunks 설정으로 벤더 분리
- Dynamic Import로 모달 컴포넌트 분리

## 5. 향후 개선 권장사항

### 단기 (Low Effort, High Impact) - ✅ 모두 완료
1. ~~**React Query 확대**: Profile/MBTI API에 적용~~ ✅
2. ~~**Suspense Boundaries**: 페이지별 로딩 UI 개선~~ ✅
3. ~~**Feedback API React Query**: 피드백 캐싱 및 Optimistic Updates~~ ✅
4. ~~**MentorAssignment API React Query**: 멘토 할당 관리 최적화~~ ✅
5. ~~**Dynamic Import**: 모달 컴포넌트 lazy loading~~ ✅

### 중기 (Medium Effort)
1. **차트 컴포넌트 활용 시 Dynamic Import**: 현재 미사용이지만 추가 시 적용 필요
2. **next/image 전환**: 아바타 이미지에 next/image 적용 (선택적)
3. **React Query Devtools**: 개발 환경에서 캐시 디버깅 도구 추가

### 장기 (High Effort)
1. **RSC (React Server Components)**: 서버 컴포넌트 전환 검토
2. **Edge Runtime**: API 라우트 엣지 배포
3. **Streaming SSR**: 점진적 페이지 렌더링

## 6. 장기 과제 상세 가이드 (학생 엔지니어용)

아래 내용은 향후 필요성 검토 시 참고하기 위한 기술 설명입니다.

### 6.1 RSC (React Server Components)

**한 줄 요약**: 서버에서 렌더링해서 JavaScript 코드를 덜 보내는 기술

**현재 방식의 문제점**:
```
[서버] → [HTML + 대량의 JS] → [브라우저가 JS 실행] → 화면 표시
```
- 모든 React 컴포넌트가 브라우저에서 실행됨
- JavaScript 번들이 커짐 (현재 356 kB)
- 모바일/저사양 기기에서 느림

**RSC 적용 후**:
```
[서버에서 컴포넌트 실행] → [결과 HTML + 최소 JS] → 빠른 화면 표시
```

**적용 예시**:
```typescript
// 기존: 클라이언트 컴포넌트 (JS 번들에 포함)
'use client';
export function StudentList({ students }) {
  return students.map(s => <StudentCard key={s.id} student={s} />);
}

// RSC: 서버 컴포넌트 (JS 번들에 미포함)
// 'use client' 없음 = 서버 컴포넌트
export async function StudentList() {
  const students = await db.query('SELECT * FROM students');
  return students.map(s => <StudentCard key={s.id} student={s} />);
}
```

**언제 도입 검토?**
- 번들 크기가 500KB 이상으로 커질 때
- 초기 로딩 속도가 3초 이상일 때
- 데이터 fetching이 복잡해질 때

**난이도**: 높음 (기존 코드 구조 변경 필요)

---

### 6.2 Edge Runtime

**한 줄 요약**: API를 전 세계 서버에서 실행해서 응답을 빠르게

**현재 방식**:
```
[한국 사용자] → [도쿄 서버] → DB 조회 → 응답 (100ms)
[미국 사용자] → [도쿄 서버] → DB 조회 → 응답 (300ms) ← 멀어서 느림
```

**Edge Runtime 적용 후**:
```
[한국 사용자] → [서울 엣지] → 응답 (50ms)
[미국 사용자] → [미국 엣지] → 응답 (50ms) ← 가까워서 빠름
```

**적용 예시**:
```typescript
// app/api/hello/route.ts
export const runtime = 'edge';  // 이 한 줄 추가

export async function GET() {
  return Response.json({ message: 'Hello from Edge!' });
}
```

**주의사항**:
- Node.js 전용 라이브러리 사용 불가 (fs, crypto 일부 등)
- DB 연결 방식 변경 필요 (HTTP 기반 클라이언트)
- 현재 Supabase 사용 중이라 비교적 적용 쉬움

**언제 도입 검토?**
- 글로벌 서비스 확장 시
- API 응답 시간이 200ms 이상일 때
- 실시간 기능(채팅 등)의 지연이 문제될 때

**난이도**: 중간 (API 라우트별 점진적 적용 가능)

---

### 6.3 Streaming SSR

**한 줄 요약**: 페이지를 한 번에 보내지 않고 조각조각 보내서 빨리 보여주는 기술

**현재 방식**:
```
[서버] 전체 페이지 렌더링 완료 (2초) → [브라우저] 한 번에 표시
사용자: 2초간 빈 화면...
```

**Streaming SSR 적용 후**:
```
[서버] 헤더 완료 (0.1초) → [브라우저] 헤더 먼저 표시
[서버] 메인 콘텐츠 완료 (0.5초) → [브라우저] 메인 추가 표시
[서버] 댓글 완료 (2초) → [브라우저] 댓글 추가 표시
사용자: 0.1초부터 뭔가 보임!
```

**적용 예시** (현재 Suspense가 이미 준비됨):
```typescript
// app/student/page.tsx
export default function StudentPage() {
  return (
    <div>
      <Header />  {/* 즉시 표시 */}

      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />  {/* 데이터 로드 후 표시 */}
      </Suspense>

      <Suspense fallback={<ChatSkeleton />}>
        <RecentChats />  {/* 별도로 데이터 로드 후 표시 */}
      </Suspense>
    </div>
  );
}
```

**현재 프로젝트 상태**:
- ✅ Suspense Boundaries 이미 적용됨 (Phase 2)
- ✅ loading.tsx 파일들 생성됨
- ⏳ 서버 컴포넌트 전환 시 Streaming 자동 활성화

**언제 도입 검토?**
- RSC 도입과 함께 자연스럽게 적용
- 페이지 내 여러 데이터 소스가 있을 때
- 일부 섹션이 특히 느릴 때

**난이도**: RSC와 함께 적용 시 자동 (단독 적용은 복잡)

---

### 6.4 도입 우선순위 권장

| 순위 | 기술 | 이유 |
|-----|------|------|
| 1 | Edge Runtime | 점진적 적용 가능, 즉각적인 효과 |
| 2 | RSC | Next.js 14+ 최적화의 핵심 |
| 3 | Streaming SSR | RSC와 함께 자동 적용됨 |

**실제 도입 시기 판단 기준**:
- 현재 성능에 문제가 없다면 → 유지
- 번들 크기 500KB 초과 → RSC 검토
- 글로벌 확장 → Edge Runtime 검토
- 복잡한 대시보드 추가 → Streaming 검토

---

## 7. 결론

이번 최적화를 통해:
- ✅ 모든 주요 View 컴포넌트에 React.memo 적용 완료
- ✅ Profile/MBTI API에 React Query 적용 완료
- ✅ Feedback API에 React Query 적용 완료
- ✅ MentorAssignment API에 React Query 적용 완료
- ✅ 5개 주요 페이지에 Suspense Boundaries (loading.tsx) 추가
- ✅ SourceDetailModal에 Dynamic Import 적용
- ✅ Image Optimization 설정 검토 완료
- ✅ TypeScript 빌드 검증 완료
- ✅ 번들 크기 양호 (356 kB shared, 258 kB vendors)

### 성과 요약
| 항목 | 이전 | 이후 | 변화 |
|-----|------|------|------|
| React.memo 적용 View | 4개 | 8개 | +4 |
| React Query 적용 API | 2개 | 5개 | +3 |
| Suspense loading.tsx | 0개 | 5개 | +5 |
| Dynamic Import 컴포넌트 | 0개 | 1개 | +1 |
| 번들 크기 | 352 kB | 356 kB | +1.1% |

현재 아키텍처는 Clean Architecture를 잘 따르고 있으며, 프로덕션 수준의 최적화가 적용되어 있습니다.

---

## 변경 파일 목록

**Phase 1 (React.memo):**
- `src/views/MentorStudentChatView.tsx`
- `src/views/AuthView.tsx`
- `src/views/MentorAssignmentView.tsx`
- `src/views/ProfileView.tsx`

**Phase 2 (React Query + Suspense):**
- `src/interfaceAdapters/hooks/queries/useProfileQuery.ts` (신규)
- `src/interfaceAdapters/hooks/queries/index.ts`
- `src/interfaceAdapters/presenters/useProfilePresenter.ts`
- `src/components/PageLoading.tsx` (신규)
- `app/student/loading.tsx` (신규)
- `app/mentor/loading.tsx` (신규)
- `app/profile/loading.tsx` (신규)
- `app/student/chat/[convId]/loading.tsx` (신규)
- `app/mentor/chat/[convId]/loading.tsx` (신규)

**Phase 3 (Feedback API React Query):**
- `src/interfaceAdapters/hooks/queries/useFeedbackQuery.ts` (신규)
- `src/interfaceAdapters/hooks/queries/index.ts`

**Phase 4 (MentorAssignment API React Query):**
- `src/interfaceAdapters/hooks/queries/useMentorAssignmentQuery.ts` (신규)
- `src/interfaceAdapters/hooks/queries/index.ts`

**Phase 5 (Dynamic Import + Image 검토):**
- `src/views/studentChat/MessageBubble.tsx`

---

## React Query 훅 사용 가이드

### Profile/MBTI
```typescript
import { useMbtiQuery, useUpdateMbti } from "@/src/interfaceAdapters/hooks/queries";

const { data: mbti, isLoading } = useMbtiQuery({ userId, accessToken });
const updateMutation = useUpdateMbti({ userId, accessToken });
```

### Feedback
```typescript
import { useFeedbacksQuery, useCreateFeedback } from "@/src/interfaceAdapters/hooks/queries";

const { data } = useFeedbacksQuery({ msgId, accessToken });
const createMutation = useCreateFeedback({ accessToken, authorId, authorRole });
```

### MentorAssignment
```typescript
import {
  useStudentSummariesQuery,
  useAvailableNewhiresQuery,
  useCreateAssignment
} from "@/src/interfaceAdapters/hooks/queries";

const { data: summaries } = useStudentSummariesQuery({ mentorId, accessToken });
const { data: newhires } = useAvailableNewhiresQuery({ accessToken });
const assignMutation = useCreateAssignment({ accessToken, mentorId });
```
