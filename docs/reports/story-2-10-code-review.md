# Story 2-10 Code Review Report

**Date**: 2026-02-06
**Feature**: 자동 히어링 KC 생성 (Automatic Hearing KC Generation)
**Reviewers**: BMAD Party Mode (Amelia, Winston, Mary, Bob)

---

## Summary

| Metric | Score |
|--------|-------|
| Code Quality | 7.5/10 |
| Type Safety | 8.5/10 |
| React Patterns | 7/10 |
| Error Handling | 4/10 |
| Accessibility | 6/10 |
| Performance | 8/10 |

---

## Critical Issues (Must Fix Before Merge)

### 1. Memory Leak: setTimeout Without Cleanup

**File**: `src/interfaceAdapters/hooks/useTriggerDetection.ts`
**Lines**: 239-241, 288-290

**Problem**:
```typescript
// Current: No cleanup on unmount
setTimeout(() => {
  setSavedMessage(null);
}, 2000);
```

**Solution**:
```typescript
// Use useEffect with cleanup
useEffect(() => {
  if (!savedMessage) return;
  const timeoutId = setTimeout(() => setSavedMessage(null), 2000);
  return () => clearTimeout(timeoutId);
}, [savedMessage]);
```

**Impact**: Memory leak in long-running sessions, stale setter calls after unmount

---

### 2. Module-Level State Counter

**File**: `src/interfaceAdapters/hooks/useTriggerDetection.ts`
**Line**: 113

**Problem**:
```typescript
// Module-level counter - SSR unsafe, HMR doesn't reset
let triggerIdCounter = 0;
```

**Solution**:
```typescript
// Use useRef for per-instance counter
const counterRef = useRef(0);

// In recordTrigger:
id: `trigger-${conversationId}-${++counterRef.current}`
```

**Impact**: ID collisions in multi-instance scenarios, SSR issues in Next.js

---

## Major Issues (Should Fix / Tech Debt)

### 3. Missing Error Handling

**Impact**: Silent failures, poor UX
**Files**: saveTrigger, saveTriggers, saveSessionKC functions

**Recommendation**: Add try/catch with toast notifications
```typescript
try {
  await gateway.saveKnowledgeCard(...);
  toast.success('保存しました');
} catch (error) {
  toast.error('保存に失敗しました');
}
```

**Status**: Create separate Tech Debt ticket

---

### 4. Hard-coded Confidence Score (0.8)

**File**: `src/interfaceAdapters/hooks/useTriggerDetection.ts:274`

**Recommendation**: Use server-provided `importance` value
```typescript
confidence: kc.importance ? parseFloat(kc.importance) : 0.8,
```

**Status**: Create separate Tech Debt ticket

---

### 5. V1/V2 State Synchronization

**Description**: Race condition between V1 triggers[] and V2 hearingSession

**Future Consideration** (Winston's proposal):
```typescript
interface UnifiedTriggerState {
  mode: 'v1-realtime' | 'v2-hearing';
  triggerMsgId: string;
  status: 'pending' | 'hearing' | 'ready' | 'saved';
  candidate?: KCCandidate;
}
```

**Status**: Evaluate in next sprint

---

## Action Items

### Blocking (Before Merge)
- [ ] Fix setTimeout cleanup with useEffect
- [ ] Convert triggerIdCounter to useRef
- [ ] Write unit tests for fixes

### Non-Blocking (Post-Merge)
- [ ] Tech Debt: Error handling improvements (2h)
- [ ] Refactor: V1/V2 state model unification review (4h+)

---

## BMAD Party Vote Result

| Agent | Vote |
|-------|------|
| 🏗️ Winston | Approve (Critical fixes only) |
| 💻 Amelia | Approve (30min estimate) |
| 📊 Mary | Approve (with Error Handling ticket) |
| 🏃 Bob | Approve (Unanimous) |

**Decision**: Fix Critical issues, merge, then address Tech Debt separately.
