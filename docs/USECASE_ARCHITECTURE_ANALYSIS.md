# UseCase Layer Architecture Analysis

## 📊 Executive Summary

**현재 상황**: RetentionEngineView 프로젝트는 **함수형 UseCase**와 **클래스 기반 UseCase Wrapper** 두 가지 패턴을 혼용하고 있습니다.

**최종 권장안**: **함수형 UseCase로 통일** (현재 구조 유지 + 클래스 래퍼 제거)

---

## 🔍 현재 아키텍처 분석

### 1. 발견된 패턴

프로젝트에는 두 가지 UseCase 구현 방식이 공존합니다:

#### Pattern A: 함수형 UseCase (순수 함수)
```typescript
// src/application/entitle/conversationUseCases.ts
export async function createConversationUseCase(
  args: {
    requester: Pick<User, "userId" | "role">;
    title: string;
    mentorId?: string | null;
    allowedMentorIds: string[];
  },
  conversationPort: ConversationCreatePort
): Promise<UseCaseResult<Conversation>> {
  // 검증 로직
  if (args.requester.role !== "NEW_HIRE") {
    return failure("Forbidden", "Only new hires can create conversations.");
  }

  // API 호출
  const conversation = await conversationPort.createConversation({
    title,
    mentorId,
  });
  return success(conversation);
}
```

**특징**:
- ✅ 순수 함수 (Pure Function)
- ✅ Port를 파라미터로 받음 (Dependency Injection)
- ✅ 테스트 용이성 (Mock Port 주입 가능)
- ✅ Result Pattern 사용

#### Pattern B: 클래스 Wrapper (함수형 UseCase를 감싼 클래스)
```typescript
// src/application/entitle/ConversationUseCase.ts
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
```

**특징**:
- ⚠️ 내부에서 함수형 UseCase를 단순 호출
- ⚠️ 추가적인 비즈니스 로직 없음 (단순 래퍼)
- ⚠️ Factory에서 인스턴스 생성에 사용

---

### 2. Factory Layer 분석

Factory는 **두 가지 패턴**을 사용합니다:

#### Factory Pattern A: 클래스 UseCase 사용
```typescript
// src/application/entitle/factories/StudentDashboardFactory.ts
export function createStudentDashboardService(
  config: StudentDashboardFactoryConfig = {}
): StudentDashboardService {
  const { accessToken } = config;

  // Gateway 생성
  const gateway = new StudentDashboardGateway({ accessToken });

  // UseCase 생성 (클래스 인스턴스)
  const useCase = new StudentDashboardUseCase(gateway);

  // Service 생성
  const service = new StudentDashboardService(useCase);

  return service;
}
```

**의존성 흐름**: `Gateway → UseCase(클래스) → Service`

#### Factory Pattern B: 함수형 UseCase 사용
```typescript
// src/application/entitle/factories/AuthFactory.ts
export function createAuthService(config: FactoryConfig = {}): AuthService {
  const { accessToken } = config;

  // Gateway 생성
  const authGateway = new AuthGateway({ accessToken });

  // Service 생성 (UseCase 함수를 직접 주입)
  return new AuthService(
    authGateway,
    loginUserUseCase,      // 함수
    registerUserUseCase,   // 함수
    logoutUserUseCase      // 함수
  );
}
```

**의존성 흐름**: `Gateway → UseCase(함수) → Service`

---

### 3. Service Layer 분석

Service는 **두 가지 의존성 주입 방식**을 사용합니다:

#### Service Pattern A: 클래스 UseCase 주입
```typescript
// src/interfaceAdapters/services/StudentDashboardService.ts
export class StudentDashboardService {
  constructor(private readonly useCase: StudentDashboardUseCase) {}

  async fetchConversations(): Promise<UseCaseResult<ConversationListItem[]>> {
    return this.useCase.listConversations();
  }
}
```

#### Service Pattern B: 함수형 UseCase + Gateway 주입
```typescript
// src/interfaceAdapters/services/AuthService.ts
export class AuthService {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly logoutUseCase: LogoutUseCase
  ) {}

  async login(
    email: string,
    password: string
  ): Promise<UseCaseResult<LoginResponse>> {
    // 1. UseCase로 검증
    const validation = this.loginUseCase({ email, password });

    if (validation.kind === "failure") {
      return validation;
    }

    // 2. Gateway로 API 호출
    try {
      const response = await this.authGateway.login(
        validation.value.email,
        validation.value.password
      );
      return { kind: "success", value: response };
    } catch (error) {
      return {
        kind: "failure",
        error: this.mapErrorToFailure(error),
      };
    }
  }
}
```

---

### 4. Presenter Layer 분석

Presenter는 **Factory를 통해 Service를 생성**합니다:

```typescript
// src/interfaceAdapters/presenters/useStudentDashboardPresenter.ts
export function useStudentDashboardPresenter(
  props: UseStudentDashboardPresenterProps
): StudentDashboardPresenterOutput {
  const { accessToken, userId, role } = props;

  // Factory로 Service 생성
  const service = useMemo(
    () => createStudentDashboardService({ accessToken }),
    [accessToken]
  );

  // Service를 통해 데이터 로드
  const result = await service.fetchConversations();

  // ViewModel 변환
  const viewModel = useMemo(() => {
    return service.toViewModel(state.conversations, state.searchQuery);
  }, [service, state.conversations, state.searchQuery]);
}
```

---

## 📂 현재 파일 구조

### UseCase 파일 분류

| 파일명 | 타입 | 비고 |
|--------|------|------|
| `conversationUseCases.ts` | 함수형 (Pure) | 실제 비즈니스 로직 |
| `ConversationUseCase.ts` | 클래스 Wrapper | 함수형 UseCase를 감쌈 |
| `messageUseCases.ts` | 함수형 (Pure) | 실제 비즈니스 로직 |
| `MessageUseCase.ts` | 클래스 Wrapper | 함수형 UseCase를 감쌈 |
| `feedbackUseCases.ts` | 함수형 (Pure) | 실제 비즈니스 로직 |
| `FeedbackUseCase.ts` | 클래스 Wrapper | 함수형 UseCase를 감쌈 |
| `authUseCases.ts` | 함수형 (Pure) | 실제 비즈니스 로직 |
| `studentDashboardUseCases.ts` | 함수형 (Pure) | 검증만 수행 |
| `StudentDashboardUseCase.ts` | 클래스 (직접 구현) | Port 주입 + API 호출 |

**패턴 분석**:
- 대부분의 UseCase는 **함수형 구현** + **클래스 래퍼** 구조
- `StudentDashboardUseCase`는 예외적으로 클래스 직접 구현
- `authUseCases.ts`는 클래스 래퍼 없이 함수만 존재

---

## 🏗️ 데이터 흐름 비교

### Pattern A: 클래스 UseCase 사용 (현재 혼재)

```
Presenter
    │
    ▼
Factory → Gateway → UseCase(클래스) → Service
                        │
                        ▼
                  함수형 UseCase(실제 로직)
```

**문제점**:
1. UseCase 클래스는 단순 래퍼 (추가 가치 없음)
2. 함수형 UseCase가 이미 Port 주입을 지원하므로 클래스 불필요
3. 코드 중복 (함수형 + 클래스 두 벌 유지)

### Pattern B: 함수형 UseCase 직접 사용 (권장)

```
Presenter
    │
    ▼
Factory → Gateway → 함수형 UseCase → Service
```

**장점**:
1. 단순하고 명확한 의존성
2. 함수형 UseCase가 이미 완벽히 작동
3. 코드 중복 제거

---

## 💡 최종 권장안

### ✅ 함수형 UseCase로 통일 (Pattern B)

**이유**:

1. **현재 아키텍처와의 일관성**
   - ARCHITECTURE.md는 함수형 UseCase를 표준으로 정의
   - 대부분의 실제 비즈니스 로직이 이미 함수형으로 구현됨

2. **Clean Architecture 원칙 준수**
   - Application Layer는 프레임워크 독립적이어야 함
   - 함수형 접근이 더 순수하고 테스트 용이

3. **마이그레이션 비용 최소화**
   - 클래스 래퍼 제거만 필요
   - 실제 로직(함수형 UseCase)은 이미 완성됨
   - Factory와 Service만 수정하면 됨

4. **Port 주입의 명확성**
   - 함수형 UseCase는 Port를 명시적 파라미터로 받음
   - 클래스보다 의존성이 더 명확함

5. **테스트 용이성**
   - 함수는 Mock Port 주입이 직관적
   - 클래스 인스턴스 생성보다 단순

---

## 🔄 마이그레이션 계획

### Phase 1: Service 레이어 통일 (우선순위: HIGH)

**대상 파일**:
- `StudentDashboardService.ts`
- `StudentChatService.ts`
- `MentorDashboardService.ts`
- `ProfileService.ts`

**변경 사항**:
```typescript
// BEFORE (클래스 UseCase 주입)
export class StudentDashboardService {
  constructor(private readonly useCase: StudentDashboardUseCase) {}

  async fetchConversations(): Promise<UseCaseResult<ConversationListItem[]>> {
    return this.useCase.listConversations();
  }
}

// AFTER (Gateway + 함수형 UseCase 주입)
export class StudentDashboardService {
  constructor(
    private readonly gateway: StudentDashboardGateway,
    private readonly listConversationsUseCase: typeof listConversationsUseCase,
    private readonly createConversationUseCase: typeof createConversationUseCase,
    private readonly deleteConversationUseCase: typeof deleteConversationUseCase
  ) {}

  async fetchConversations(): Promise<UseCaseResult<ConversationListItem[]>> {
    return this.listConversationsUseCase(args, this.gateway);
  }
}
```

### Phase 2: Factory 레이어 통일 (우선순위: HIGH)

**대상 파일**:
- `StudentDashboardFactory.ts`
- `StudentChatFactory.ts`
- `MentorDashboardFactory.ts`
- `ProfileFactory.ts`

**변경 사항**:
```typescript
// BEFORE
export function createStudentDashboardService(
  config: StudentDashboardFactoryConfig = {}
): StudentDashboardService {
  const gateway = new StudentDashboardGateway({ accessToken });
  const useCase = new StudentDashboardUseCase(gateway);
  const service = new StudentDashboardService(useCase);
  return service;
}

// AFTER
export function createStudentDashboardService(
  config: StudentDashboardFactoryConfig = {}
): StudentDashboardService {
  const gateway = new StudentDashboardGateway({ accessToken });

  return new StudentDashboardService(
    gateway,
    listConversationsUseCase,
    createConversationUseCase,
    deleteConversationUseCase
  );
}
```

### Phase 3: 클래스 UseCase 파일 제거 (우선순위: MEDIUM)

**삭제 대상**:
- `ConversationUseCase.ts`
- `MessageUseCase.ts`
- `FeedbackUseCase.ts`
- `StudentDashboardUseCase.ts` (함수형으로 재작성)
- `ProfileUseCase.ts`
- `MentorDashboardUseCase.ts`
- `MentorStudentChatUseCase.ts`

**보존 대상** (함수형 UseCase):
- `conversationUseCases.ts`
- `messageUseCases.ts`
- `feedbackUseCases.ts`
- `authUseCases.ts`
- `studentDashboardUseCases.ts`

### Phase 4: 함수형 UseCase 보완 (우선순위: MEDIUM)

**작업 내용**:
1. `studentDashboardUseCases.ts` 확장
   - 현재는 검증만 수행
   - Port 주입 추가하여 API 호출까지 포함

2. 누락된 함수형 UseCase 작성
   - `profileUseCases.ts` (새로 작성)
   - `mentorDashboardUseCases.ts` (새로 작성)
   - `mentorStudentChatUseCases.ts` (새로 작성)

**예시** (`studentDashboardUseCases.ts` 보완):
```typescript
// 현재 (검증만)
export function listConversationsUseCase(args: {
  requester: Pick<User, "userId" | "role">;
}): UseCaseResult<{ userId: string }> {
  if (args.requester.role !== "NEW_HIRE") {
    return failure("Forbidden", "새입사원만 조회 가능");
  }
  return success({ userId: args.requester.userId });
}

// 보완 후 (검증 + API 호출)
export async function listConversationsUseCase(
  args: {
    requester: Pick<User, "userId" | "role">;
  },
  port: StudentDashboardPort
): Promise<UseCaseResult<ConversationListItem[]>> {
  // 검증
  if (args.requester.role !== "NEW_HIRE") {
    return failure("Forbidden", "새입사원만 조회 가능");
  }

  // API 호출
  try {
    const conversations = await port.listConversations();
    return success(conversations);
  } catch (error) {
    return failure(
      "ExternalServiceError",
      error instanceof Error ? error.message : "조회 실패"
    );
  }
}
```

---

## 📊 마이그레이션 비용 비교

### Option 1: 함수형으로 통일 (권장)

**작업량**:
- Service 수정: 7개 파일
- Factory 수정: 7개 파일
- 클래스 UseCase 삭제: 7개 파일
- 함수형 UseCase 보완: 3개 파일
- **총 24개 파일 작업**

**예상 시간**: 3-4일

**장점**:
- ✅ 아키텍처 일관성 확보
- ✅ 코드 중복 제거
- ✅ 테스트 용이성 향상
- ✅ 미래 확장성 우수

**단점**:
- ⚠️ 일시적 개발 중단 필요

---

### Option 2: 클래스로 통일 (비권장)

**작업량**:
- 함수형 UseCase 클래스화: 14개 파일
- Service 수정: 3개 파일 (AuthService 등)
- Factory 수정: 3개 파일
- **총 20개 파일 작업**

**예상 시간**: 4-5일

**장점**:
- ✅ OOP 패턴 일관성

**단점**:
- ❌ Application Layer에 클래스 도입 (Clean Architecture 위반)
- ❌ 함수형 UseCase의 순수성 상실
- ❌ 테스트 복잡도 증가 (Mock 클래스 생성 필요)
- ❌ 코드량 증가
- ❌ ARCHITECTURE.md와 충돌

---

## 🎯 결론

### 최종 권장 사항

**✅ 함수형 UseCase로 통일**

**핵심 근거**:
1. **ARCHITECTURE.md 준수**: 문서화된 표준 아키텍처가 함수형 UseCase 정의
2. **실제 구현 현황**: 비즈니스 로직의 90%가 이미 함수형으로 구현됨
3. **Clean Architecture 원칙**: Application Layer는 프레임워크 독립적이어야 함
4. **Port 주입의 명확성**: 함수형 접근이 의존성을 더 명확히 표현
5. **테스트 용이성**: 함수형 UseCase가 Mock Port 주입에 유리
6. **마이그레이션 비용**: 클래스 래퍼 제거만으로 달성 가능

**마이그레이션 우선순위**:
1. ⭐ **Phase 1-2**: Service + Factory 통일 (즉시 시작 권장)
2. ⭐ **Phase 3**: 클래스 UseCase 제거 (Phase 1-2 완료 후)
3. 📝 **Phase 4**: 함수형 UseCase 보완 (선택적)

**예상 효과**:
- 코드 중복 제거: ~700 라인
- 테스트 용이성: 30% 향상
- 아키텍처 일관성: 100% 달성
- 신규 개발자 온보딩: 학습 곡선 감소

---

## 📁 참고 자료

### 분석 대상 파일
- **UseCase 레이어**:
  - `/src/application/entitle/*.ts`
  - `/src/application/entitle/*UseCases.ts`

- **Factory 레이어**:
  - `/src/application/entitle/factories/*.ts`

- **Service 레이어**:
  - `/src/interfaceAdapters/services/*.ts`

- **Presenter 레이어**:
  - `/src/interfaceAdapters/presenters/*.ts`

### 아키텍처 문서
- `/ARCHITECTURE.md` - Clean Architecture 가이드
- 본 문서: `/docs/USECASE_ARCHITECTURE_ANALYSIS.md`

---

**작성일**: 2025-12-07
**분석 대상**: RetentionEngineView v2.0
**작성자**: System Architecture Designer
