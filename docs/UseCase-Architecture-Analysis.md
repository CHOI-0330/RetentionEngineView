# UseCase Architecture Analysis Report

**Project:** RetentionEngineView
**Analysis Date:** 2025-12-07
**Location:** `/src/application/entitle/`

## Executive Summary

RetentionEngineView 프로젝트는 **함수형 UseCase**와 **클래스 래퍼** 두 가지 패턴을 혼용하는 혼합 아키텍처를 채택하고 있습니다. 이는 Clean Architecture 원칙을 따르면서도 점진적 마이그레이션 전략을 반영한 설계로 보이나, 일부 불일치와 중복이 존재합니다.

---

## 1. Current Architecture Overview

### 1.1 File Structure

```
src/application/entitle/
├── [Class Wrappers] (8 files)
│   ├── ConversationUseCase.ts      → conversationUseCases.ts를 래핑
│   ├── MessageUseCase.ts           → messageUseCases.ts를 래핑
│   ├── FeedbackUseCase.ts          → feedbackUseCases.ts를 래핑
│   ├── StudentDashboardUseCase.ts  → 독립적 (래핑 없음)
│   ├── MentorDashboardUseCase.ts   → 독립적 (래핑 없음)
│   ├── ProfileUseCase.ts           → 독립적 (래핑 없음)
│   ├── LLMUseCase.ts               → 독립적 (래핑 없음)
│   └── MentorStudentChatUseCase.ts → 독립적 (래핑 없음)
│
├── [Functional UseCases] (6 files)
│   ├── conversationUseCases.ts     ← ConversationUseCase에 의해 래핑됨
│   ├── messageUseCases.ts          ← MessageUseCase에 의해 래핑됨
│   ├── feedbackUseCases.ts         ← FeedbackUseCase에 의해 래핑됨
│   ├── studentDashboardUseCases.ts → 별도 검증 함수 (Dashboard용)
│   ├── authUseCases.ts             → 단독 함수형 (래퍼 없음)
│   └── useCases.ts                 → 레거시 순수 함수 모음
│
├── [Support Files]
│   ├── ports.ts                    → Port 인터페이스 정의
│   ├── models.ts                   → 공통 타입 정의
│   ├── index.ts                    → Public API 엑스포트
│   └── initialDataUseCase.ts       → 초기 데이터 로딩
│
└── factories/                      → 의존성 주입 팩토리
    ├── StudentChatFactory.ts       → 클래스 UseCase 조합
    ├── MentorDashboardFactory.ts
    ├── StudentDashboardFactory.ts
    └── ...
```

### 1.2 Architecture Patterns

#### Pattern 1: 함수형 + 클래스 래퍼 (Wrapper Pattern)

**구조:**
```typescript
// 1. 함수형 UseCase (conversationUseCases.ts)
export async function createConversationUseCase(
  args: {...},
  conversationPort: ConversationCreatePort
): Promise<UseCaseResult<Conversation>> {
  // 검증 로직
  // API 호출
}

// 2. 클래스 래퍼 (ConversationUseCase.ts)
export class ConversationUseCase {
  constructor(private readonly port: ConversationCreatePort) {}

  async create(args: {...}): Promise<UseCaseResult<Conversation>> {
    return createConversationUseCase(args, this.port);
  }
}
```

**적용 범위:**
- ✅ Conversation (3개 메서드: create, delete, list)
- ✅ Message (5개 메서드: createUser, begin, finalize, cancel, list)
- ✅ Feedback (3개 메서드: create, list, update)

#### Pattern 2: 독립적 클래스 UseCase (Independent Class)

**구조:**
```typescript
export class StudentDashboardUseCase {
  constructor(private readonly port: StudentDashboardUseCasePort) {}

  async listConversations(): Promise<UseCaseResult<...>> {
    // 직접 검증 및 API 호출 구현
  }
}
```

**적용 범위:**
- ✅ StudentDashboard (3개 메서드)
- ✅ MentorDashboard (4개 메서드)
- ✅ Profile (2개 메서드: getMbti, updateMbti)
- ✅ LLM (1개 메서드: generate)
- ✅ MentorStudentChat (2개 메서드)

#### Pattern 3: 순수 함수형 UseCase (Pure Functional)

**구조:**
```typescript
export function registerUserUseCase(
  input: RegisterUserInput
): UseCaseResult<{...}> {
  // 검증만 수행 (Port 없음)
}
```

**적용 범위:**
- ✅ authUseCases.ts (register, login, logout)
- ✅ studentDashboardUseCases.ts (검증 전용 함수)
- ✅ useCases.ts (레거시 순수 함수)

---

## 2. Clean Architecture Compliance Analysis

### 2.1 Dependency Rule ✅ PASS

```
[Presentation]
      ↓
[Application (UseCase)]
      ↓
[Domain (Entities)]
```

**검증 결과:**
- ✅ UseCase는 Domain에만 의존 (User, Conversation, Message 등)
- ✅ Port 인터페이스를 통해 Gateway 추상화
- ✅ 외부 의존성 없음 (인프라 레이어 분리됨)

### 2.2 Port & Adapter Pattern ✅ PASS

**Port 정의 (ports.ts):**
```typescript
export interface MessagePort {
  createUserMessage(...): Promise<Message>;
  beginAssistantMessage(...): Promise<Message>;
  // ...
}
```

**Adapter 구현 (MessageGateway):**
```typescript
export class MessageGateway implements MessagePort {
  async createUserMessage(...): Promise<Message> {
    // 실제 API 호출
  }
}
```

**검증 결과:**
- ✅ 모든 외부 의존성이 Port로 추상화됨
- ✅ Gateway가 Port를 구현
- ✅ UseCase는 Port에만 의존

### 2.3 Single Responsibility ⚠️ PARTIAL

**문제점:**
1. **studentDashboardUseCases.ts의 역할 중복**
   - `StudentDashboardUseCase` (클래스): 전체 비즈니스 로직 + API 호출
   - `studentDashboardUseCases.ts` (함수): 검증만 수행

   ```typescript
   // StudentDashboardUseCase.ts (포괄적)
   async listConversations(): Promise<UseCaseResult<ConversationListItem[]>> {
     try {
       const conversations = await this.port.listConversations();
       return { kind: "success", value: conversations };
     } catch (error) { ... }
   }

   // studentDashboardUseCases.ts (검증만)
   export function listConversationsUseCase(args: {
     requester: Pick<User, "userId" | "role">;
   }): UseCaseResult<{ userId: string }> {
     if (args.requester.role !== "NEW_HIRE") {
       return failure("Forbidden", "...");
     }
     return success({ userId: args.requester.userId });
   }
   ```

2. **useCases.ts 레거시 함수의 불명확한 위치**
   - 일부 함수는 새로운 함수형 파일로 이동됨
   - 일부는 여전히 useCases.ts에 남아있음

---

## 3. Pattern Comparison

### 3.1 함수형 + 래퍼 vs 독립 클래스

| 측면 | 함수형 + 래퍼 | 독립 클래스 |
|------|---------------|-------------|
| **코드 중복** | 높음 (함수 + 클래스) | 낮음 (클래스만) |
| **테스트 용이성** | 우수 (함수 단독 테스트 가능) | 보통 (모킹 필요) |
| **의존성 주입** | 함수: 명시적 Port 전달<br>클래스: Constructor 주입 | Constructor 주입만 |
| **유연성** | 높음 (함수형 사용 가능) | 보통 (클래스 필수) |
| **일관성** | 낮음 (두 방식 혼재) | 높음 (클래스만) |
| **마이그레이션** | 점진적 전환 가능 | 한 번에 전환 |

### 3.2 장점 분석

#### 함수형 + 래퍼 패턴의 장점

1. **점진적 마이그레이션**
   ```typescript
   // Step 1: 함수형 UseCase 작성 (기존 코드 유지)
   export function createConversationUseCase(...) { ... }

   // Step 2: 클래스 래퍼 추가 (의존성 주입 지원)
   export class ConversationUseCase {
     async create(...) {
       return createConversationUseCase(..., this.port);
     }
   }

   // Step 3: Factory에서 클래스 사용
   const useCase = new ConversationUseCase(gateway);
   ```

2. **테스트 유연성**
   ```typescript
   // 함수만 테스트 (빠름, 간단)
   test('create conversation validation', () => {
     const result = createConversationUseCase(args, mockPort);
     expect(result.kind).toBe('success');
   });

   // 클래스 테스트 (통합)
   test('ConversationUseCase integration', async () => {
     const useCase = new ConversationUseCase(mockPort);
     await useCase.create(args);
   });
   ```

3. **함수형 프로그래밍 활용**
   ```typescript
   // 함수 조합 가능
   const pipeline = compose(
     createConversationUseCase,
     validatePermissions,
     normalizeInput
   );
   ```

#### 독립 클래스 패턴의 장점

1. **코드 간결성**
   - 함수 중복 없음
   - 클래스 하나로 통합

2. **의존성 관리 명확성**
   ```typescript
   export class ProfileUseCase {
     constructor(private readonly port: ProfileUseCasePort) {}

     async getMbti(args: {...}): Promise<UseCaseResult<...>> {
       // Port 사용이 명확함
     }
   }
   ```

3. **OOP 디자인 패턴 활용**
   - Strategy, Template Method 등 적용 가능

### 3.3 단점 분석

#### 함수형 + 래퍼 패턴의 단점

1. **코드 중복**
   ```typescript
   // conversationUseCases.ts
   export async function createConversationUseCase(...) { ... }
   export async function deleteConversationUseCase(...) { ... }
   export async function listConversationsUseCase(...) { ... }

   // ConversationUseCase.ts (거의 동일한 코드)
   export class ConversationUseCase {
     async create(...) { return createConversationUseCase(...); }
     async delete(...) { return deleteConversationUseCase(...); }
     async list(...) { return listConversationsUseCase(...); }
   }
   ```

2. **유지보수 부담**
   - 함수 시그니처 변경 시 클래스도 수정 필요
   - 두 파일 동기화 필요

3. **일관성 부족**
   - 어떤 UseCase는 래퍼 있음, 어떤 것은 없음
   - 개발자가 두 방식 모두 이해해야 함

#### 독립 클래스 패턴의 단점

1. **테스트 복잡도**
   ```typescript
   // 함수형: Port 직접 전달 (간단)
   const result = await createUserMessageUseCase(args, mockPort);

   // 클래스: Constructor 모킹 필요 (복잡)
   const useCase = new MessageUseCase(mockPort);
   const result = await useCase.createUserMessage(args);
   ```

2. **함수형 활용 제한**
   - 함수 조합 불가
   - 순수 함수 테스트 불가

---

## 4. Identified Issues

### 4.1 불일치 및 중복 문제

#### Issue 1: StudentDashboard 역할 분리 불명확

**문제:**
- `StudentDashboardUseCase.ts` (클래스): 전체 로직 + API 호출
- `studentDashboardUseCases.ts` (함수): 검증만 수행
- 두 파일이 서로를 import 하지 않음 → 완전히 별개

**영향:**
- 검증 로직 중복 가능성
- 코드 재사용성 낮음
- 개발자 혼란

#### Issue 2: authUseCases.ts의 고립

**문제:**
- 클래스 래퍼 없음
- Factory에서 직접 함수 사용
- 다른 UseCase와 패턴 불일치

**현재 사용 방식:**
```typescript
// 다른 UseCase (클래스)
const messageUseCase = new MessageUseCase(messageGateway);
await messageUseCase.createUserMessage(...);

// authUseCases (함수형만)
import { loginUserUseCase } from './authUseCases';
const result = loginUserUseCase({ email, password });
```

#### Issue 3: useCases.ts 레거시 파일의 모호한 역할

**문제:**
- 일부 함수는 새 파일로 이동됨
- 일부는 여전히 useCases.ts에 남음
- index.ts에서 "Legacy UseCases"로 표시

**예시:**
```typescript
// index.ts
export {
  // 레거시 (useCases.ts)
  buildPromptForConversationUseCase,
  validateFeedbackRulesUseCase,
  // ...
} from "./useCases";

// 새로운 함수 (conversationUseCases.ts)
export {
  createConversationUseCase,
  deleteConversationUseCase,
  // ...
} from "./conversationUseCases";
```

### 4.2 Port 정의 위치 불일치

**문제:**
```typescript
// ports.ts에 정의된 Port
export interface MessagePort { ... }
export interface FeedbackPort { ... }

// conversationUseCases.ts에 정의된 Port
export interface ConversationCreatePort { ... }

// StudentDashboardUseCase.ts에 정의된 Port
export interface StudentDashboardUseCasePort { ... }
```

**영향:**
- Port 정의 위치가 파일마다 다름
- 전체 Port 파악 어려움
- 중앙 관리 불가

---

## 5. Recommendations

### 5.1 단기 개선안 (Quick Wins)

#### 1. Port 정의 통합

**Before:**
```typescript
// conversationUseCases.ts
export interface ConversationCreatePort { ... }

// StudentDashboardUseCase.ts
export interface StudentDashboardUseCasePort { ... }
```

**After:**
```typescript
// ports.ts (모든 Port를 여기로)
export interface ConversationCreatePort { ... }
export interface StudentDashboardUseCasePort { ... }
export interface ProfileUseCasePort { ... }
// ...
```

**Benefits:**
- 중앙 집중식 Port 관리
- 의존성 파악 용이
- 재사용성 향상

#### 2. studentDashboardUseCases.ts 역할 명확화

**Option A: 검증 함수로 축소**
```typescript
// studentDashboardUseCases.ts → studentDashboardValidations.ts
export function validateListConversationsPermission(
  requester: Pick<User, "role">
): boolean {
  return requester.role === "NEW_HIRE";
}

// StudentDashboardUseCase.ts에서 사용
async listConversations(): Promise<UseCaseResult<...>> {
  if (!validateListConversationsPermission(this.requester)) {
    return failure("Forbidden", "...");
  }
  // ...
}
```

**Option B: 함수형 UseCase로 전환 (래퍼 패턴)**
```typescript
// studentDashboardUseCases.ts (Port 기반 함수형 UseCase)
export async function listConversationsUseCase(
  args: {...},
  port: StudentDashboardUseCasePort
): Promise<UseCaseResult<...>> {
  // 검증 + API 호출
}

// StudentDashboardUseCase.ts (래퍼)
export class StudentDashboardUseCase {
  async listConversations(...) {
    return listConversationsUseCase(..., this.port);
  }
}
```

#### 3. authUseCases에 클래스 래퍼 추가

**Before:**
```typescript
// authUseCases.ts (함수만)
export function registerUserUseCase(...) { ... }
export function loginUserUseCase(...) { ... }
```

**After:**
```typescript
// authUseCases.ts (함수형 유지)
export async function registerUserUseCase(
  input: RegisterUserInput,
  authPort: AuthPort
): Promise<UseCaseResult<...>> { ... }

// AuthUseCase.ts (새로 추가)
export class AuthUseCase {
  constructor(private readonly port: AuthPort) {}

  async register(input: RegisterUserInput) {
    return registerUserUseCase(input, this.port);
  }
}
```

### 5.2 중기 개선안 (Strategic)

#### 1. 패턴 선택 기준 수립

**제안 기준:**

| 조건 | 권장 패턴 | 이유 |
|------|-----------|------|
| 복잡한 비즈니스 로직 | 함수형 + 래퍼 | 함수 단위 테스트 용이 |
| 단순 CRUD | 독립 클래스 | 코드 간결성 |
| 외부 API 호출 | 함수형 + 래퍼 | Port 추상화 명확 |
| 검증만 수행 | 순수 함수 | 의존성 없음 |

**적용 예시:**
```typescript
// 복잡한 로직 → 함수형 + 래퍼
conversationUseCases.ts + ConversationUseCase.ts

// 단순 CRUD → 독립 클래스
ProfileUseCase.ts (getMbti, updateMbti만)

// 검증만 → 순수 함수
validations/conversationValidations.ts
```

#### 2. useCases.ts 레거시 마이그레이션

**마이그레이션 계획:**

```typescript
// Step 1: 새 파일로 함수 이동
useCases.ts → conversationUseCases.ts
            → messageUseCases.ts
            → feedbackUseCases.ts

// Step 2: 클래스 래퍼 추가
ConversationUseCase.ts
MessageUseCase.ts
FeedbackUseCase.ts

// Step 3: index.ts에서 레거시 제거
export { ... } from './conversationUseCases'; // ✅ 새로운 방식
// export { ... } from './useCases'; // ❌ 제거

// Step 4: useCases.ts 삭제
```

#### 3. 디렉토리 구조 개선

**Before:**
```
src/application/entitle/
├── ConversationUseCase.ts
├── conversationUseCases.ts
├── MessageUseCase.ts
├── messageUseCases.ts
├── authUseCases.ts
├── useCases.ts
└── ports.ts
```

**After:**
```
src/application/entitle/
├── ports/
│   ├── index.ts                    # 모든 Port 엑스포트
│   ├── ConversationPort.ts
│   ├── MessagePort.ts
│   └── AuthPort.ts
│
├── useCases/
│   ├── conversation/
│   │   ├── conversationUseCases.ts  # 함수형
│   │   └── ConversationUseCase.ts   # 클래스 래퍼
│   │
│   ├── message/
│   │   ├── messageUseCases.ts
│   │   └── MessageUseCase.ts
│   │
│   ├── auth/
│   │   ├── authUseCases.ts
│   │   └── AuthUseCase.ts
│   │
│   └── index.ts                     # 모든 UseCase 엑스포트
│
├── validations/                     # 순수 검증 함수
│   ├── conversationValidations.ts
│   ├── messageValidations.ts
│   └── index.ts
│
└── models.ts                        # 공통 타입
```

**Benefits:**
- 파일 위치가 명확함
- 관련 파일끼리 그룹화
- import 경로 단순화

### 5.3 장기 개선안 (Long-term)

#### 1. 함수형 중심 아키텍처로 전환 (권장)

**이유:**
- 테스트 용이성 최대화
- 함수 조합 가능
- 순수성 보장 (Side Effect 분리)

**제안 구조:**
```typescript
// 1. 순수 함수 (검증만)
export function validateCreateConversation(
  args: {...}
): UseCaseResult<ValidatedConversationInput> {
  // 검증만 수행 (Port 없음)
}

// 2. Port 기반 함수 (I/O 처리)
export async function createConversation(
  validated: ValidatedConversationInput,
  port: ConversationPort
): Promise<Conversation> {
  return await port.createConversation(validated);
}

// 3. 조합 함수
export async function createConversationUseCase(
  args: {...},
  port: ConversationPort
): Promise<UseCaseResult<Conversation>> {
  const validated = validateCreateConversation(args);
  if (validated.kind === 'failure') return validated;

  try {
    const result = await createConversation(validated.value, port);
    return success(result);
  } catch (error) {
    return failure('ExternalServiceError', error.message);
  }
}

// 4. 클래스 래퍼 (DI 지원)
export class ConversationUseCase {
  constructor(private readonly port: ConversationPort) {}

  async create(args: {...}) {
    return createConversationUseCase(args, this.port);
  }
}
```

**Benefits:**
- 각 함수의 책임이 명확함
- 순수 함수는 독립 테스트 가능
- I/O 함수는 모킹 테스트
- 클래스는 Factory에서 사용

#### 2. Result 타입 개선 (Railway Oriented Programming)

**현재:**
```typescript
export type UseCaseResult<T> =
  | { kind: "success"; value: T }
  | { kind: "failure"; error: UseCaseFailure };
```

**개선안:**
```typescript
// Result 모나드 패턴
export class Result<T, E = UseCaseFailure> {
  static success<T>(value: T): Result<T, never> {
    return new Result('success', value);
  }

  static failure<E>(error: E): Result<never, E> {
    return new Result('failure', undefined, error);
  }

  // Functor: map
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.kind === 'success') {
      return Result.success(fn(this.value!));
    }
    return Result.failure(this.error!);
  }

  // Monad: flatMap
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this.kind === 'success') {
      return fn(this.value!);
    }
    return Result.failure(this.error!);
  }

  // Error handling: mapError
  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this.kind === 'failure') {
      return Result.failure(fn(this.error!));
    }
    return Result.success(this.value!);
  }
}

// 사용 예시
const result = await createConversationUseCase(args, port)
  .map(conv => ({ ...conv, displayTitle: conv.title.toUpperCase() }))
  .mapError(err => ({ ...err, timestamp: new Date() }));
```

**Benefits:**
- 함수 체이닝 가능
- 에러 핸들링 일관성
- 타입 안전성 향상

---

## 6. Migration Strategy

### 6.1 Phase 1: 표준화 (1-2주)

**목표:** 현재 코드 정리 및 패턴 통일

**Tasks:**
1. ✅ 모든 Port를 ports.ts로 이동
2. ✅ studentDashboardUseCases.ts → validations로 변경
3. ✅ authUseCases에 AuthUseCase 클래스 래퍼 추가
4. ✅ useCases.ts 함수들을 새 파일로 분리
5. ✅ 테스트 코드 업데이트

**예상 영향:**
- 기존 코드 동작 변경 없음
- import 경로 일부 변경 필요
- 테스트 코드 수정 필요

### 6.2 Phase 2: 구조 개선 (2-3주)

**목표:** 디렉토리 구조 재구성

**Tasks:**
1. ✅ ports/ 디렉토리 생성 및 Port 파일 이동
2. ✅ useCases/ 디렉토리 생성 및 도메인별 분리
3. ✅ validations/ 디렉토리 생성 및 순수 검증 함수 이동
4. ✅ index.ts 엑스포트 경로 업데이트
5. ✅ Factory 파일 업데이트

**예상 영향:**
- import 경로 대대적 변경
- 린터/빌드 설정 업데이트 필요
- 문서 업데이트

### 6.3 Phase 3: 함수형 전환 (3-4주)

**목표:** 순수 함수 중심 아키텍처로 전환

**Tasks:**
1. ✅ 검증 로직을 순수 함수로 분리
2. ✅ I/O 처리 함수 분리
3. ✅ UseCase 함수를 조합 함수로 재작성
4. ✅ Result 모나드 도입
5. ✅ 전체 테스트 재작성

**예상 영향:**
- 코드 구조 전면 변경
- 테스트 커버리지 대폭 향상
- 함수 재사용성 증가

---

## 7. Clean Architecture Best Practices

### 7.1 준수하고 있는 원칙 ✅

1. **의존성 역전 원칙 (Dependency Inversion)**
   ```typescript
   // UseCase는 Port 인터페이스에만 의존
   export class MessageUseCase {
     constructor(private readonly port: MessagePort) {} // ✅ 인터페이스
   }

   // Gateway가 Port를 구현
   export class MessageGateway implements MessagePort { ... } // ✅
   ```

2. **단일 책임 원칙 (Single Responsibility)**
   ```typescript
   // UseCase: 비즈니스 로직만
   // Gateway: API 호출만
   // Factory: 의존성 조합만
   ```

3. **인터페이스 분리 원칙 (Interface Segregation)**
   ```typescript
   // 각 UseCase별 Port 분리
   export interface MessagePort { ... }
   export interface FeedbackPort { ... }
   export interface ConversationPort { ... }
   ```

### 7.2 개선이 필요한 부분 ⚠️

1. **개방-폐쇄 원칙 (Open-Closed Principle)**

   **문제:**
   ```typescript
   // 새로운 검증 규칙 추가 시 함수 수정 필요
   export function validateCreateConversation(args: {...}) {
     if (args.title.length === 0) { ... }
     if (args.title.length > 120) { ... }
     if (args.mentorId && !allowed) { ... }
     // 새 규칙 추가 → 함수 수정 (❌ OCP 위반)
   }
   ```

   **개선안: Strategy 패턴**
   ```typescript
   // 검증 규칙을 객체로 분리
   interface ValidationRule<T> {
     validate(input: T): UseCaseResult<void>;
   }

   class TitleNotEmptyRule implements ValidationRule<CreateConversationInput> {
     validate(input) {
       return input.title.length > 0
         ? success(undefined)
         : failure('ValidationError', '...');
     }
   }

   class TitleLengthRule implements ValidationRule<CreateConversationInput> {
     validate(input) {
       return input.title.length <= 120
         ? success(undefined)
         : failure('ValidationError', '...');
     }
   }

   // 새 규칙 추가 시 클래스만 추가 (✅ OCP 준수)
   const rules: ValidationRule<CreateConversationInput>[] = [
     new TitleNotEmptyRule(),
     new TitleLengthRule(),
     new MentorSelectionRule(),
     // new CustomRule(), ← 기존 코드 수정 없이 추가
   ];

   export function validateCreateConversation(input) {
     for (const rule of rules) {
       const result = rule.validate(input);
       if (result.kind === 'failure') return result;
     }
     return success(input);
   }
   ```

2. **리스코프 치환 원칙 (Liskov Substitution)**

   **현재 상태:**
   - 클래스 UseCase들이 공통 인터페이스 없음
   - 각각 독립적으로 설계됨

   **개선안: 공통 인터페이스 도입**
   ```typescript
   // 공통 UseCase 인터페이스
   export interface UseCase<TInput, TOutput> {
     execute(input: TInput): Promise<UseCaseResult<TOutput>>;
   }

   // 모든 UseCase가 구현
   export class ConversationUseCase implements UseCase<CreateConversationInput, Conversation> {
     async execute(input: CreateConversationInput) {
       return this.create(input);
     }

     async create(args: {...}) { ... }
   }

   // 사용처에서 교체 가능
   function executeUseCase<I, O>(
     useCase: UseCase<I, O>,
     input: I
   ): Promise<UseCaseResult<O>> {
     return useCase.execute(input); // ✅ LSP 준수
   }
   ```

---

## 8. Testing Strategy

### 8.1 현재 테스트 가능성

#### 함수형 UseCase (우수 ✅)

```typescript
// 순수 함수 → 모킹 불필요
test('validate conversation creation', () => {
  const mockPort: ConversationCreatePort = {
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    listConversations: vi.fn(),
  };

  const result = createConversationUseCase(
    {
      requester: { userId: 'u1', role: 'NEW_HIRE' },
      title: 'Test',
      mentorId: null,
      allowedMentorIds: [],
    },
    mockPort
  );

  expect(result.kind).toBe('success');
  expect(mockPort.createConversation).toHaveBeenCalledWith({
    title: 'Test',
    mentorId: null,
  });
});
```

#### 클래스 UseCase (보통 ⚠️)

```typescript
// Constructor 모킹 필요
test('ConversationUseCase.create', async () => {
  const mockPort: ConversationCreatePort = {
    createConversation: vi.fn().mockResolvedValue({ convId: 'c1', ... }),
    deleteConversation: vi.fn(),
    listConversations: vi.fn(),
  };

  const useCase = new ConversationUseCase(mockPort);

  const result = await useCase.create({
    requester: { userId: 'u1', role: 'NEW_HIRE' },
    title: 'Test',
    mentorId: null,
    allowedMentorIds: [],
  });

  expect(result.kind).toBe('success');
});
```

### 8.2 권장 테스트 전략

#### 1. 계층별 테스트

```typescript
// Layer 1: 순수 검증 함수 (Unit Test)
describe('Conversation Validations', () => {
  test('title must not be empty', () => {
    const result = validateConversationTitle('');
    expect(result.kind).toBe('failure');
  });

  test('title must not exceed 120 characters', () => {
    const result = validateConversationTitle('a'.repeat(121));
    expect(result.kind).toBe('failure');
  });
});

// Layer 2: 함수형 UseCase (Integration Test)
describe('conversationUseCases', () => {
  test('create conversation with valid input', async () => {
    const mockPort = createMockConversationPort();
    const result = await createConversationUseCase(validInput, mockPort);
    expect(result.kind).toBe('success');
  });
});

// Layer 3: 클래스 래퍼 (E2E Test)
describe('ConversationUseCase', () => {
  test('full creation flow', async () => {
    const useCase = new ConversationUseCase(realGateway);
    const result = await useCase.create(validInput);
    expect(result.kind).toBe('success');
  });
});
```

#### 2. 테스트 헬퍼 활용

```typescript
// tests/helpers/mockPorts.ts
export function createMockConversationPort(
  overrides?: Partial<ConversationCreatePort>
): ConversationCreatePort {
  return {
    createConversation: vi.fn().mockResolvedValue({ convId: 'c1', ... }),
    deleteConversation: vi.fn().mockResolvedValue(undefined),
    listConversations: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

// 사용
test('create conversation', async () => {
  const mockPort = createMockConversationPort({
    createConversation: vi.fn().mockResolvedValue(customConversation),
  });
  // ...
});
```

---

## 9. Conclusion

### 9.1 현재 아키텍처 평가

| 항목 | 평가 | 점수 |
|------|------|------|
| **Clean Architecture 준수** | ✅ 우수 | 9/10 |
| **의존성 관리** | ✅ 우수 | 9/10 |
| **테스트 용이성** | ⚠️ 보통 | 7/10 |
| **코드 일관성** | ⚠️ 개선 필요 | 6/10 |
| **유지보수성** | ⚠️ 보통 | 7/10 |
| **확장성** | ✅ 우수 | 8/10 |

**종합 평가: 7.7/10 (양호)**

### 9.2 핵심 권장사항

#### 우선순위 1 (즉시 적용) ⭐⭐⭐

1. **모든 Port를 ports.ts로 통합**
   - 현재 분산된 Port 정의를 중앙화
   - 의존성 파악 용이

2. **studentDashboardUseCases.ts 역할 명확화**
   - 검증 전용 함수로 변경 또는
   - 함수형 UseCase로 전환 (래퍼 패턴 적용)

3. **authUseCases에 클래스 래퍼 추가**
   - 다른 UseCase와 일관성 확보
   - Factory 패턴 통일

#### 우선순위 2 (1개월 내) ⭐⭐

4. **useCases.ts 레거시 마이그레이션**
   - 함수들을 도메인별 파일로 분리
   - 레거시 파일 제거

5. **디렉토리 구조 개선**
   - ports/, useCases/, validations/ 분리
   - 관련 파일 그룹화

#### 우선순위 3 (장기) ⭐

6. **함수형 중심 아키텍처 전환**
   - 순수 함수 + 조합 함수 + 클래스 래퍼
   - Result 모나드 도입

7. **OCP 준수를 위한 Strategy 패턴 적용**
   - 검증 규칙 객체화
   - 확장 가능한 구조

### 9.3 마이그레이션 로드맵

```
Phase 1 (1-2주): 표준화
  ├─ Port 통합
  ├─ studentDashboard 정리
  └─ authUseCases 래퍼 추가

Phase 2 (2-3주): 구조 개선
  ├─ 디렉토리 재구성
  ├─ useCases.ts 마이그레이션
  └─ index.ts 정리

Phase 3 (3-4주): 함수형 전환
  ├─ 순수 함수 분리
  ├─ Result 모나드 도입
  └─ 테스트 재작성

Phase 4 (1-2주): 최종 검토
  ├─ 코드 리뷰
  ├─ 문서 업데이트
  └─ 성능 측정
```

---

## Appendix

### A. Pattern Examples

#### A.1 함수형 + 래퍼 전체 예시

```typescript
// ============================================
// conversationUseCases.ts (함수형)
// ============================================

import type { Conversation, User } from "../../domain/core";
import type { UseCaseResult } from "./models";

export interface ConversationCreatePort {
  createConversation(input: { title: string; mentorId?: string | null }): Promise<Conversation>;
  deleteConversation(convId: string): Promise<void>;
  listConversations(): Promise<Conversation[]>;
}

const success = <T>(value: T): UseCaseResult<T> => ({ kind: "success", value });
const failure = (kind: string, message: string): UseCaseResult<never> => ({
  kind: "failure",
  error: { kind, message },
});

export async function createConversationUseCase(
  args: {
    requester: Pick<User, "userId" | "role">;
    title: string;
    mentorId?: string | null;
    allowedMentorIds: string[];
  },
  port: ConversationCreatePort
): Promise<UseCaseResult<Conversation>> {
  // 검증
  if (args.requester.role !== "NEW_HIRE") {
    return failure("Forbidden", "Only new hires can create conversations.");
  }

  const title = args.title.trim();
  if (title.length === 0) {
    return failure("ValidationError", "Conversation title must not be empty.");
  }

  // API 호출
  try {
    const conversation = await port.createConversation({ title, mentorId: args.mentorId });
    return success(conversation);
  } catch (error) {
    return failure("ValidationError", error.message);
  }
}

// ============================================
// ConversationUseCase.ts (클래스 래퍼)
// ============================================

import type { Conversation, User } from "../../domain/core";
import type { UseCaseResult } from "./models";
import type { ConversationCreatePort } from "./conversationUseCases";
import { createConversationUseCase } from "./conversationUseCases";

export class ConversationUseCase {
  constructor(private readonly port: ConversationCreatePort) {}

  async create(args: {
    requester: Pick<User, "userId" | "role">;
    title: string;
    mentorId?: string | null;
    allowedMentorIds: string[];
  }): Promise<UseCaseResult<Conversation>> {
    return createConversationUseCase(args, this.port);
  }
}

// ============================================
// Factory에서 사용
// ============================================

const conversationGateway = new ConversationGateway({ accessToken });
const conversationUseCase = new ConversationUseCase(conversationGateway);

// Service로 전달
const service = new StudentChatService(
  initialDataUseCase,
  conversationUseCase, // ← 클래스 인스턴스
  messageUseCase,
  llmUseCase,
  feedbackUseCase
);
```

#### A.2 독립 클래스 예시

```typescript
// ============================================
// ProfileUseCase.ts (독립 클래스)
// ============================================

import type { MbtiType } from "../../domain/mbti.types";
import { isValidMbtiType } from "../../domain/mbti.types";
import type { UseCaseResult } from "./models";

export interface ProfileUseCasePort {
  fetchMbti(userId: string): Promise<MbtiType | null>;
  updateMbti(userId: string, mbti: MbtiType): Promise<void>;
}

export class ProfileUseCase {
  constructor(private readonly port: ProfileUseCasePort) {}

  async getMbti(args: { userId: string }): Promise<UseCaseResult<MbtiType | null>> {
    if (!args.userId || args.userId.trim().length === 0) {
      return {
        kind: "failure",
        error: { kind: "ValidationError", message: "ユーザーIDが不正です" },
      };
    }

    try {
      const mbti = await this.port.fetchMbti(args.userId);
      return { kind: "success", value: mbti };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "MBTIの取得に失敗しました",
        },
      };
    }
  }

  async updateMbti(args: {
    userId: string;
    mbti: MbtiType;
  }): Promise<UseCaseResult<void>> {
    if (!args.userId || args.userId.trim().length === 0) {
      return {
        kind: "failure",
        error: { kind: "ValidationError", message: "ユーザーIDが不正です" },
      };
    }

    if (!isValidMbtiType(args.mbti)) {
      return {
        kind: "failure",
        error: { kind: "ValidationError", message: "無効なMBTIタイプです" },
      };
    }

    try {
      await this.port.updateMbti(args.userId, args.mbti);
      return { kind: "success", value: undefined };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "MBTIの更新に失敗しました",
        },
      };
    }
  }
}
```

### B. File Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                          Presentation Layer                       │
│  (React Components, Services)                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │ uses
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Application Layer                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Factories (DI)                                              ││
│  │  - StudentChatFactory.ts                                    ││
│  │  - MentorDashboardFactory.ts                                ││
│  └─────────────┬───────────────────────────────────────────────┘│
│                │ creates                                          │
│                ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ UseCases (Classes)                                          ││
│  │  - ConversationUseCase                                      ││
│  │  - MessageUseCase                                           ││
│  │  - FeedbackUseCase                                          ││
│  │  - ProfileUseCase                                           ││
│  └─────────────┬───────────────────────────────────────────────┘│
│                │ wraps                                            │
│                ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ UseCases (Functions)                                        ││
│  │  - createConversationUseCase()                              ││
│  │  - createUserMessageUseCase()                               ││
│  │  - createFeedbackUseCase()                                  ││
│  └─────────────┬───────────────────────────────────────────────┘│
│                │ depends on                                       │
│                ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Ports (Interfaces)                                          ││
│  │  - ConversationCreatePort                                   ││
│  │  - MessagePort                                              ││
│  │  - FeedbackPort                                             ││
│  └─────────────┬───────────────────────────────────────────────┘│
└────────────────┼────────────────────────────────────────────────┘
                 │ implemented by
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Interface Adapters Layer                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Gateways (Adapters)                                         ││
│  │  - ConversationGateway                                      ││
│  │  - MessageGateway                                           ││
│  │  - FeedbackGateway                                          ││
│  └─────────────┬───────────────────────────────────────────────┘│
└────────────────┼────────────────────────────────────────────────┘
                 │ calls
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                          │
│  (API, Database, External Services)                              │
└─────────────────────────────────────────────────────────────────┘
```

### C. Code Metrics

#### 파일 수 및 라인 수 (대략)

| 파일 유형 | 파일 수 | 평균 라인 수 | 총 라인 수 |
|-----------|---------|--------------|------------|
| 클래스 UseCase | 8 | 80 | 640 |
| 함수형 UseCase | 6 | 150 | 900 |
| Ports | 1 | 90 | 90 |
| Models | 1 | 30 | 30 |
| Factories | 8 | 60 | 480 |
| **합계** | **24** | **95** | **2,140** |

#### 중복도 분석

| 패턴 | 중복 라인 수 | 중복률 |
|------|--------------|--------|
| 함수형 + 래퍼 | ~300 라인 | 14% |
| Port 정의 분산 | ~50 라인 | 2% |
| 검증 로직 중복 | ~100 라인 | 5% |
| **총 중복** | **~450 라인** | **21%** |

**개선 여지:**
- 함수형 + 래퍼 패턴 통일 시 중복 14% 제거 가능
- Port 통합 시 2% 개선
- 검증 함수 재사용 시 5% 개선
- **총 21% 중복 제거 가능**

---

**End of Report**

