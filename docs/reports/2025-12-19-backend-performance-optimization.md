# 백엔드 성능 최적화 보고서

**작성일**: 2025-12-19
**작업 범위**: 백엔드 API 최적화 + 프론트엔드 무한 스크롤 구현

---

## 1. 개요

StudentChat 기능의 성능을 개선하기 위해 백엔드 API 최적화와 프론트엔드 무한 스크롤(Infinite Scroll) 구현을 완료했습니다.

---

## 2. 완료된 작업

### Phase 1-4: 백엔드 최적화
- 메시지 조회 API에 cursor 기반 페이지네이션 적용
- 쿼리 최적화 및 인덱스 활용

### Phase 5-1: 백엔드 페이지네이션 API
- `GET /conversations/:convId/messages` 엔드포인트에 페이지네이션 파라미터 추가
  - `cursor`: 마지막 메시지의 created_at
  - `limit`: 페이지당 메시지 수 (기본값 30)
- nextCursor 계산 로직 수정 (Critical 이슈 해결)

### Phase 5-2: useInfiniteQuery 훅
- `useInfiniteMessagesQuery` 훅 구현
- React Query의 useInfiniteQuery 활용
- 초기 데이터(Bootstrap) 지원으로 불필요한 API 호출 방지

### Phase 5-3: 프론트엔드 무한 스크롤 UI

#### 5-3-1: types.ts 수정
```typescript
export interface InfiniteScrollState {
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
  loadOlderMessages: () => void;
}

export interface StudentChatViewProps {
  // ... 기존 props
  infiniteScroll?: InfiniteScrollState;
}
```

#### 5-3-2: Presenter 통합
- `useStudentChatPresenter.ts`에 `useInfiniteMessagesQuery` 통합
- Bootstrap 데이터와 Infinite Query 데이터 병합 로직

#### 5-3-3: StudentChatPage 수정
- `infiniteScroll` props를 View에 전달

#### 5-3-4: StudentChatView 스크롤 이벤트
- 스크롤 상단 100px 이내 도달 시 과거 메시지 로드 트리거
- 스크롤 위치 복원 로직 (과거 메시지 로드 후)
- `shouldScrollToBottom` 상태로 새 메시지/과거 메시지 구분

#### 5-3-5: MessageList 로딩 인디케이터
- 과거 메시지 로딩 중 스피너 표시
- "会話の始まりです" 표시 (hasOlderMessages=false 일 때)

### Critical/Medium 이슈 수정
- **Critical**: nextCursor 계산 시 reverse() 전 원본 배열 사용
- **Medium**: llm.controller.ts의 documentUpload에 @Throttle 데코레이터 추가

---

## 3. 수정된 파일 목록

### 프론트엔드 (RetentionEngineView)
| 파일 | 변경 내용 |
|------|----------|
| `src/views/studentChat/types.ts` | InfiniteScrollState 인터페이스 추가 |
| `src/interfaceAdapters/presenters/useStudentChatPresenter.ts` | useInfiniteMessagesQuery 통합 |
| `src/interfaceAdapters/pages/entitle/StudentChatPage.tsx` | infiniteScroll props 전달 |
| `src/views/studentChat/StudentChatView.tsx` | 스크롤 이벤트 감지 및 위치 복원 |
| `src/views/studentChat/MessageList.tsx` | 로딩 인디케이터 및 "회화 시작" 표시 |

### 백엔드 (retention-engine-server)
| 파일 | 변경 내용 |
|------|----------|
| `src/llm/llm.controller.ts` | documentUpload에 @Throttle 추가 |

---

## 4. 주요 코드 변경

### MessageList.tsx - 로딩 인디케이터
```tsx
{/* 過去メッセージ読み込み中インジケータ */}
{isLoadingOlder && (
  <div className="flex items-center justify-center py-4">
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    <span className="ml-2 text-sm text-muted-foreground">
      過去のメッセージを読み込み中...
    </span>
  </div>
)}

{/* 会話の始まり表示 */}
{!hasOlderMessages && messages.length > 0 && !isLoadingOlder && (
  <div className="flex items-center justify-center py-4">
    <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2">
      <span className="text-xs text-muted-foreground">
        会話の始まりです
      </span>
    </div>
  </div>
)}
```

### StudentChatView.tsx - 스크롤 이벤트
```tsx
const handleScroll = useCallback(() => {
  const viewport = scrollAreaRef.current;
  if (!viewport || !infiniteScroll) return;

  const { scrollTop } = viewport;

  // 上端100px以内でトリガー
  if (
    scrollTop < 100 &&
    infiniteScroll.hasOlderMessages &&
    !infiniteScroll.isLoadingOlder
  ) {
    previousScrollHeightRef.current = viewport.scrollHeight;
    setShouldScrollToBottom(false);
    infiniteScroll.loadOlderMessages();
  }
}, [infiniteScroll]);
```

---

## 5. 테스트 결과

| 항목 | 결과 |
|------|------|
| TypeScript 타입 체크 | ✅ 통과 |
| Next.js 빌드 | ✅ 성공 |
| 채팅 페이지 로드 | ✅ 정상 |
| 메시지 목록 표시 | ✅ 정상 |
| "会話の始まりです" 표시 | ✅ 정상 |
| 로딩 인디케이터 | ✅ 구현 완료 |

---

## 6. 기대 효과

1. **초기 로딩 시간 단축**: 최신 30개 메시지만 로드
2. **메모리 사용량 감소**: 필요한 만큼만 메시지 로드
3. **UX 개선**: 끊김 없는 스크롤 경험
4. **API 부하 감소**: Rate limiting + 페이지네이션

---

## 7. 향후 개선 사항

- [ ] 메시지 캐시 TTL 최적화
- [ ] 가상 스크롤(Virtual Scroll) 구현 검토
- [ ] 프리페칭(Prefetching) 전략 개선

---

**작성자**: Claude Code (AI Assistant)
