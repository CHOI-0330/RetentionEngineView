# Factory와 Service 레이어의 UseCase 사용 패턴 분석

## 분석 일자: 2025-12-07

## 전체 요약

RetentionEngineView 프로젝트는 **두 가지 UseCase 패턴을 혼용**하고 있습니다:
- **클래스 기반 UseCase (PascalCase)**: 6개 모듈
- **함수형 UseCase (camelCase)**: 1개 모듈

---

## 1. Factory별 UseCase 사용 현황

### 1.1 AuthFactory (함수형 UseCase 사용)

**파일**: `/src/application/entitle/factories/AuthFactory.ts`

**사용하는 UseCase**:
```typescript
import {
  loginUserUseCase,      // 함수형 (camelCase)
  registerUserUseCase,   // 함수형 (camelCase)
  logoutUserUseCase,     // 함수형 (camelCase)
} from "../authUseCases";
```

**생성 패턴**:
```typescript
export function createAuthService(config: FactoryConfig = {}): AuthService {
  const authGateway = new AuthGateway({ accessToken });

  // 함수형 UseCase는 그대로 전달
  return new AuthService(
    authGateway,
    loginUserUseCase,      // 함수 자체를 전달
    registerUserUseCase,
    logoutUserUseCase
  );
}
```

**특징**:
- UseCase가 순수 함수로 구현됨
- 인스턴스 생성 없이 함수 자체를 Service에 주입
- 상태(state)를 가지지 않음

---

### 1.2 StudentChatFactory (클래스 UseCase 사용)

**파일**: `/src/application/entitle/factories/StudentChatFactory.ts`

**사용하는 UseCase**:
```typescript
import { InitialDataUseCase } from "../initialDataUseCase";
import { ConversationUseCase } from "../ConversationUseCase";
import { MessageUseCase } from "../MessageUseCase";
import { LLMUseCase } from "../LLMUseCase";
import { FeedbackUseCase } from "../FeedbackUseCase";
```

**생성 패턴**:
```typescript
export function createStudentChatService(config = {}): StudentChatService {
  // Gateway 생성
  const conversationGateway = new ConversationGateway({ accessToken });
  const messageGateway = new MessageGateway({ accessToken });
  const llmGateway = new LLMGateway({ accessToken });
  const feedbackGateway = new FeedbackGateway({ accessToken });

  // 클래스 UseCase 인스턴스 생성
  const initialDataUseCase = new InitialDataUseCase(
    conversationGateway,
    conversationGateway
  );
  const conversationUseCase = new ConversationUseCase(conversationGateway);
  const messageUseCase = new MessageUseCase(messageGateway);
  const llmUseCase = new LLMUseCase(llmGateway);
  const feedbackUseCase = new FeedbackUseCase(feedbackGateway);

  // Service에 인스턴스 주입
  return new StudentChatService(
    initialDataUseCase,
    conversationUseCase,
    messageUseCase,
    llmUseCase,
    feedbackUseCase
  );
}
```

**특징**:
- UseCase가 클래스로 구현됨
- `new` 키워드로 인스턴스를 생성하여 주입
- Gateway를 생성자에서 받아 내부 상태로 관리

---

### 1.3 MentorStudentChatFactory (클래스 UseCase 사용)

**파일**: `/src/application/entitle/factories/MentorStudentChatFactory.ts`

**사용하는 UseCase**:
```typescript
import { MentorStudentChatUseCase } from "../MentorStudentChatUseCase";
```

**생성 패턴**:
```typescript
export function createMentorStudentChatService(
  config: MentorStudentChatFactoryConfig
): MentorStudentChatService {
  const gateway = new MentorStudentChatGateway({ accessToken, convId });
  const useCase = new MentorStudentChatUseCase(gateway);
  const service = new MentorStudentChatService(useCase);

  return service;
}
```

---

### 1.4 AvatarSettingsFactory (Gateway 직접 사용)

**파일**: `/src/application/entitle/factories/AvatarSettingsFactory.ts`

**사용하는 UseCase**: **없음 (Gateway 직접 주입)**

**생성 패턴**:
```typescript
export function createAvatarSettingsService(
  config: AvatarSettingsFactoryConfig = {}
): AvatarSettingsService {
  const gateway = new AvatarGateway({ accessToken: config.accessToken });

  // UseCase 없이 Gateway만 전달
  return new AvatarSettingsService(gateway);
}
```

**특징**:
- UseCase 레이어를 건너뛰고 Gateway를 직접 Service에 주입
- 단순한 CRUD 작업에는 UseCase가 불필요할 수 있음을 보여줌

---

### 1.5 MentorDashboardFactory (클래스 UseCase 사용)

**파일**: `/src/application/entitle/factories/MentorDashboardFactory.ts`

**사용하는 UseCase**:
```typescript
import { MentorDashboardUseCase } from "../MentorDashboardUseCase";
```

**생성 패턴**:
```typescript
export function createMentorDashboardService(
  config: MentorDashboardFactoryConfig = {}
): MentorDashboardService {
  const gateway = new MentorDashboardGateway({ accessToken });
  const useCase = new MentorDashboardUseCase(gateway);
  const service = new MentorDashboardService(useCase);

  return service;
}
```

---

### 1.6 StudentDashboardFactory (클래스 UseCase 사용)

**파일**: `/src/application/entitle/factories/StudentDashboardFactory.ts`

**사용하는 UseCase**:
```typescript
import { StudentDashboardUseCase } from "../StudentDashboardUseCase";
```

**생성 패턴**: MentorDashboardFactory와 동일한 패턴

---

### 1.7 ProfileFactory (클래스 UseCase 사용)

**파일**: `/src/application/entitle/factories/ProfileFactory.ts`

**사용하는 UseCase**:
```typescript
import { ProfileUseCase } from "../ProfileUseCase";
```

**생성 패턴**: MentorDashboardFactory와 동일한 패턴

---

## 2. Service별 UseCase 사용 현황

### 2.1 AuthService (함수형 UseCase 사용)

**파일**: `/src/interfaceAdapters/services/AuthService.ts`

**생성자 시그니처**:
```typescript
export class AuthService {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly loginUseCase: LoginUseCase,      // 함수 타입
    private readonly registerUseCase: RegisterUseCase, // 함수 타입
    private readonly logoutUseCase: LogoutUseCase     // 함수 타입
  ) {}
}
```

**UseCase 타입 정의**:
```typescript
type LoginUseCase = (input: {
  email: string;
  password: string;
}) => UseCaseResult<{ email: string; password: string }>;

type RegisterUseCase = (input: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}) => UseCaseResult<{
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}>;
```

**사용 방법**:
```typescript
async login(email: string, password: string): Promise<UseCaseResult<LoginResponse>> {
  // 1. UseCase를 함수로 호출 (동기적)
  const validation = this.loginUseCase({ email, password });

  if (validation.kind === "failure") {
    return validation;
  }

  // 2. Gateway로 실제 API 호출 (비동기적)
  const response = await this.authGateway.login(
    validation.value.email,
    validation.value.password
  );

  return { kind: "success", value: response };
}
```

**특징**:
- UseCase는 **순수 함수**로 **동기적 검증만** 수행
- Gateway가 **비동기 작업** 담당
- UseCase와 Gateway의 역할이 명확하게 분리됨

---

### 2.2 StudentChatService (클래스 UseCase 사용)

**파일**: `/src/interfaceAdapters/services/StudentChatService.ts`

**생성자 시그니처**:
```typescript
export class StudentChatService {
  constructor(
    private readonly initialDataUseCase: InitialDataUseCase,
    private readonly conversationUseCase: ConversationUseCase,
    private readonly messageUseCase: MessageUseCase,
    private readonly llmUseCase?: LLMUseCase,
    private readonly feedbackUseCase?: FeedbackUseCase
  ) {}
}
```

**사용 방법**:
```typescript
async fetchInitialData(
  requester: Pick<User, "userId" | "role">,
  convId?: string
): Promise<UseCaseResult<StudentChatBootstrap>> {
  // UseCase 인스턴스의 메서드 호출
  return this.initialDataUseCase.execute(requester, convId);
}

async createConversation(
  requester: Pick<User, "userId" | "role">,
  title: string,
  allowedMentorIds: string[] = []
): Promise<UseCaseResult<Conversation>> {
  // 다른 UseCase의 메서드 호출
  return this.conversationUseCase.create({
    requester,
    title,
    allowedMentorIds,
  });
}
```

**특징**:
- UseCase가 **클래스 인스턴스**로 주입됨
- **메서드 호출** 방식으로 사용
- UseCase가 Gateway를 내부에서 관리하며 **비동기 작업 포함**

---

### 2.3 MentorStudentChatService (클래스 UseCase 사용)

**파일**: `/src/interfaceAdapters/services/MentorStudentChatService.ts`

**생성자 시그니처**:
```typescript
export class MentorStudentChatService {
  constructor(private readonly useCase: MentorStudentChatUseCase) {}
}
```

**사용 방법**:
```typescript
async fetchChatDetail(): Promise<UseCaseResult<MentorChatBootstrapData>> {
  return this.useCase.fetchChatDetail();
}

async createFeedback(
  input: CreateFeedbackInput
): Promise<UseCaseResult<CreateFeedbackResult>> {
  return this.useCase.createFeedback(input);
}
```

---

### 2.4 AvatarSettingsService (UseCase 없이 Gateway 직접 사용)

**파일**: `/src/interfaceAdapters/services/AvatarSettingsService.ts`

**생성자 시그니처**:
```typescript
export class AvatarSettingsService {
  constructor(private readonly gateway: AvatarGateway) {}
}
```

**사용 방법**:
```typescript
async fetchSettings(): Promise<AvatarSettings> {
  return this.gateway.fetchSettings();
}

async updateSettings(gender: AvatarGender, personalityPreset: AvatarPersonality): Promise<void> {
  return this.gateway.updateSettings({ gender, personalityPreset });
}
```

**특징**:
- **UseCase 레이어가 없음**
- Gateway를 직접 호출
- ViewModel 변환만 Service에서 담당

---

### 2.5 MentorDashboardService (클래스 UseCase 사용)

**파일**: `/src/interfaceAdapters/services/MentorDashboardService.ts`

**생성자 시그니처**:
```typescript
export class MentorDashboardService {
  constructor(private readonly useCase: MentorDashboardUseCase) {}
}
```

**사용 방법**:
```typescript
async fetchStudentSummaries(
  mentorId: string
): Promise<UseCaseResult<StudentSummary[]>> {
  return this.useCase.listStudentSummaries({ mentorId });
}
```

---

### 2.6 StudentDashboardService (클래스 UseCase 사용)

**파일**: `/src/interfaceAdapters/services/StudentDashboardService.ts`

**사용 방법**: MentorDashboardService와 동일한 패턴

---

### 2.7 ProfileService (클래스 UseCase 사용)

**파일**: `/src/interfaceAdapters/services/ProfileService.ts`

**사용 방법**: MentorDashboardService와 동일한 패턴

---

## 3. 클래스 vs 함수형 UseCase 비교

### 3.1 통계

| 항목 | 클래스 UseCase | 함수형 UseCase | UseCase 없음 |
|------|---------------|---------------|-------------|
| **Factory** | 5개 | 1개 | 1개 |
| **Service** | 5개 | 1개 | 1개 |
| **비율** | **71.4%** | **14.3%** | **14.3%** |

### 3.2 함수형 UseCase (camelCase)

**파일**: `/src/application/entitle/authUseCases.ts`

```typescript
export const loginUserUseCase = (
  input: LoginUserInput
): UseCaseResult<{ email: string; password: string }> => {
  const email = input.email.trim();
  const password = input.password;

  if (!isValidEmail(email)) {
    return failure("ValidationError", "Invalid email format.");
  }

  if (!isValidPassword(password)) {
    return failure("ValidationError", "Invalid password.");
  }

  return success({ email, password });
};
```

**장점**:
- 순수 함수로 테스트 용이
- 상태 없음 (stateless)
- 동기적 검증에 최적
- 함수 조합 가능

**단점**:
- 복잡한 로직 표현 어려움
- 비동기 작업 처리 복잡
- 여러 의존성 주입 어려움

---

### 3.3 클래스 UseCase (PascalCase)

**예시**: `InitialDataUseCase`, `ConversationUseCase`, `MessageUseCase`

```typescript
export class ConversationUseCase {
  constructor(private readonly conversationGateway: ConversationGateway) {}

  async create(input: CreateConversationInput): Promise<UseCaseResult<Conversation>> {
    // 검증 + Gateway 호출 + 비즈니스 로직
    const validation = this.validateInput(input);
    if (validation.kind === "failure") return validation;

    return this.conversationGateway.createConversation(input);
  }

  async delete(input: DeleteConversationInput): Promise<UseCaseResult<void>> {
    // ...
  }
}
```

**장점**:
- 복잡한 비즈니스 로직 표현 가능
- 비동기 작업 자연스럽게 처리
- 여러 Gateway 조합 가능
- 상태 관리 가능

**단점**:
- 테스트 시 인스턴스 생성 필요
- 의존성 주입 복잡도 증가

---

## 4. 의존성 주입 패턴 분석

### 4.1 전체 의존성 체인

```
Factory → Gateway → UseCase → Service → Presenter
```

### 4.2 함수형 UseCase 패턴 (AuthFactory)

```typescript
// 1. Factory에서 생성
const authGateway = new AuthGateway({ accessToken });

// 2. 함수 자체를 Service에 전달
return new AuthService(
  authGateway,
  loginUserUseCase,     // 함수
  registerUserUseCase,  // 함수
  logoutUserUseCase     // 함수
);

// 3. Service에서 함수 호출
const validation = this.loginUseCase({ email, password });

// 4. Gateway로 실제 작업
await this.authGateway.login(email, password);
```

**특징**: **UseCase와 Gateway가 분리**되어 각자의 책임이 명확

---

### 4.3 클래스 UseCase 패턴 (StudentChatFactory)

```typescript
// 1. Factory에서 Gateway 생성
const conversationGateway = new ConversationGateway({ accessToken });

// 2. Gateway를 UseCase에 주입
const conversationUseCase = new ConversationUseCase(conversationGateway);

// 3. UseCase를 Service에 주입
return new StudentChatService(
  initialDataUseCase,
  conversationUseCase,
  messageUseCase
);

// 4. Service에서 UseCase 메서드 호출
return this.conversationUseCase.create({ requester, title });
```

**특징**: **UseCase가 Gateway를 캡슐화**하여 검증+실행을 모두 담당

---

### 4.4 Gateway 직접 주입 패턴 (AvatarSettingsFactory)

```typescript
// 1. Factory에서 Gateway만 생성
const gateway = new AvatarGateway({ accessToken });

// 2. Gateway를 Service에 직접 주입
return new AvatarSettingsService(gateway);

// 3. Service에서 Gateway 직접 호출
return this.gateway.fetchSettings();
```

**특징**: **UseCase 레이어 생략**, 단순한 CRUD에 적합

---

## 5. 주요 발견 사항

### 5.1 패턴 혼용

- **대부분 클래스 UseCase 사용** (71.4%)
- **Auth 모듈만 함수형 UseCase** 사용
- **Avatar 모듈은 UseCase 없음**

### 5.2 역할 분리

**함수형 UseCase (Auth)**:
- UseCase: **동기적 검증**
- Gateway: **비동기 API 호출**
- Service: **두 레이어 조합**

**클래스 UseCase (나머지)**:
- UseCase: **검증 + API 호출 + 비즈니스 로직**
- Gateway: **HTTP 통신**
- Service: **UseCase 호출 + ViewModel 변환**

### 5.3 일관성 부족

현재 프로젝트는 **세 가지 패턴이 혼재**되어 있습니다:
1. **함수형 UseCase** (Auth)
2. **클래스 UseCase** (대부분)
3. **UseCase 없음** (Avatar)

---

## 6. 권장 사항

### 6.1 패턴 통일

**옵션 1**: 모든 모듈을 **클래스 UseCase로 통일**
- 복잡한 비즈니스 로직 처리 용이
- 비동기 작업 자연스럽게 처리
- 현재 71.4%가 이미 클래스 방식

**옵션 2**: **검증 복잡도**에 따라 선택
- **단순 검증**: 함수형 UseCase
- **복잡한 로직**: 클래스 UseCase
- **단순 CRUD**: UseCase 생략

### 6.2 AuthService 리팩토링 고려

현재 AuthService는 **UseCase와 Gateway를 모두 주입**받고 있습니다:

```typescript
constructor(
  private readonly authGateway: AuthGateway,        // Gateway
  private readonly loginUseCase: LoginUseCase,      // UseCase
  private readonly registerUseCase: RegisterUseCase,
  private readonly logoutUseCase: LogoutUseCase
)
```

**개선안**: UseCase가 Gateway를 내부에서 관리하도록 변경

```typescript
// 변경 전
Service(Gateway, UseCase, UseCase, UseCase)

// 변경 후
Service(UseCase, UseCase, UseCase)
```

---

## 7. 결론

RetentionEngineView 프로젝트는:
- **클래스 기반 UseCase가 주류** (71.4%)
- **함수형 UseCase는 Auth 모듈에만 사용** (14.3%)
- **Avatar 모듈은 UseCase 레이어 생략** (14.3%)
- **Factory 패턴으로 의존성 주입 일관되게 처리**
- **Service는 UseCase를 조합하여 ViewModel 변환 담당**

패턴 통일을 통해 코드 일관성과 유지보수성을 높일 수 있습니다.
