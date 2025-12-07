# UseCase Migration Guide: 함수형으로의 통일

## 🎯 마이그레이션 목표

**현재 상태**: 함수형 UseCase + 클래스 Wrapper 혼재
**목표 상태**: 함수형 UseCase 단일화

---

## 📋 단계별 마이그레이션 가이드

### Phase 1: Service 레이어 리팩토링

#### 1.1 StudentDashboardService 마이그레이션

**변경 전**:
```typescript
// src/interfaceAdapters/services/StudentDashboardService.ts
export class StudentDashboardService {
  constructor(private readonly useCase: StudentDashboardUseCase) {}

  async fetchConversations(): Promise<UseCaseResult<ConversationListItem[]>> {
    return this.useCase.listConversations();
  }

  async createConversation(title: string): Promise<UseCaseResult<{ convId: string }>> {
    return this.useCase.createConversation({ title });
  }

  async deleteConversation(convId: string): Promise<UseCaseResult<void>> {
    return this.useCase.deleteConversation({ convId });
  }
}
```

**변경 후**:
```typescript
// src/interfaceAdapters/services/StudentDashboardService.ts
import type { StudentDashboardGateway } from "../gateways/api/StudentDashboardGateway";
import {
  listConversationsUseCase,
  createConversationForDashboardUseCase,
  deleteConversationUseCase,
} from "../../application/entitle/studentDashboardUseCases";
import type { User } from "../../domain/core";

export class StudentDashboardService {
  constructor(
    private readonly gateway: StudentDashboardGateway,
    private readonly requester: Pick<User, "userId" | "role">
  ) {}

  async fetchConversations(): Promise<UseCaseResult<ConversationListItem[]>> {
    // 1. UseCase로 권한 검증
    const validation = listConversationsUseCase({ requester: this.requester });
    if (validation.kind === "failure") {
      return validation;
    }

    // 2. Gateway로 데이터 조회
    try {
      const conversations = await this.gateway.listConversations();
      return { kind: "success", value: conversations };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "조회 실패",
        },
      };
    }
  }

  async createConversation(title: string): Promise<UseCaseResult<{ convId: string }>> {
    // 1. UseCase로 검증
    const validation = createConversationForDashboardUseCase({
      requester: this.requester,
      title,
    });
    if (validation.kind === "failure") {
      return validation;
    }

    // 2. Gateway로 생성
    try {
      const result = await this.gateway.createConversation(validation.value.title);
      return { kind: "success", value: result };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "생성 실패",
        },
      };
    }
  }

  async deleteConversation(convId: string): Promise<UseCaseResult<void>> {
    // 1. UseCase로 검증
    const validation = deleteConversationUseCase({
      requester: this.requester,
      convId,
    });
    if (validation.kind === "failure") {
      return validation;
    }

    // 2. Gateway로 삭제
    try {
      await this.gateway.deleteConversation(validation.value.convId);
      return { kind: "success", value: undefined };
    } catch (error) {
      return {
        kind: "failure",
        error: {
          kind: "ExternalServiceError",
          message: error instanceof Error ? error.message : "삭제 실패",
        },
      };
    }
  }

  // ViewModel 변환은 유지
  toViewModel(
    conversations: ConversationListItem[],
    searchQuery: string = ""
  ): StudentDashboardViewModel {
    // 기존 코드 유지
  }
}
```

**변경 사항**:
1. ✅ `StudentDashboardUseCase` (클래스) 제거
2. ✅ `StudentDashboardGateway` + 함수형 UseCase 주입
3. ✅ `requester` (User) 추가로 권한 검증 지원
4. ✅ UseCase와 Gateway의 역할 명확히 분리

---

#### 1.2 StudentChatService 마이그레이션

**변경 전**:
```typescript
// src/interfaceAdapters/services/StudentChatService.ts
export class StudentChatService {
  constructor(
    private readonly messageUseCase: MessageUseCase,
    private readonly conversationUseCase: ConversationUseCase,
    private readonly feedbackUseCase: FeedbackUseCase
  ) {}
}
```

**변경 후**:
```typescript
// src/interfaceAdapters/services/StudentChatService.ts
import type { MessagePort, ConversationCreatePort, FeedbackPort } from "../../application/entitle/ports";
import {
  createUserMessageUseCase,
  listMessagesUseCase,
  beginAssistantMessageUseCase,
} from "../../application/entitle/messageUseCases";
import {
  createConversationUseCase,
  deleteConversationUseCase,
  listConversationsUseCase,
} from "../../application/entitle/conversationUseCases";
import {
  createFeedbackUseCase,
  listFeedbacksUseCase,
  updateFeedbackUseCase,
} from "../../application/entitle/feedbackUseCases";

export class StudentChatService {
  constructor(
    private readonly messagePort: MessagePort,
    private readonly conversationPort: ConversationCreatePort,
    private readonly feedbackPort: FeedbackPort
  ) {}

  // Message 관련 메서드
  async createUserMessage(args: {
    user: User;
    conversation: Conversation;
    content: string;
  }): Promise<UseCaseResult<Message>> {
    return createUserMessageUseCase(args, this.messagePort);
  }

  async listMessages(args: {
    requester: User;
    conversation: Conversation;
    cursor?: string;
    limit?: number;
  }): Promise<UseCaseResult<{ items: Message[]; nextCursor?: string }>> {
    return listMessagesUseCase(args, this.messagePort);
  }

  // Conversation 관련 메서드
  async createConversation(args: {
    requester: Pick<User, "userId" | "role">;
    title: string;
    mentorId?: string | null;
    allowedMentorIds: string[];
  }): Promise<UseCaseResult<Conversation>> {
    return createConversationUseCase(args, this.conversationPort);
  }

  // Feedback 관련 메서드
  async createFeedback(args: {
    requester: User;
    conversation: Conversation;
    targetMessage: Message;
    content: string;
    mentorAssignments?: MentorAssignment[];
  }): Promise<UseCaseResult<Feedback>> {
    return createFeedbackUseCase(args, this.feedbackPort);
  }
}
```

**변경 사항**:
1. ✅ 3개 클래스 UseCase → 3개 Port로 대체
2. ✅ 함수형 UseCase를 직접 호출
3. ✅ Port가 Gateway 인터페이스 역할

---

### Phase 2: Factory 레이어 리팩토링

#### 2.1 StudentDashboardFactory 마이그레이션

**변경 전**:
```typescript
// src/application/entitle/factories/StudentDashboardFactory.ts
export function createStudentDashboardService(
  config: StudentDashboardFactoryConfig = {}
): StudentDashboardService {
  const { accessToken } = config;

  const gateway = new StudentDashboardGateway({ accessToken });
  const useCase = new StudentDashboardUseCase(gateway);
  const service = new StudentDashboardService(useCase);

  return service;
}
```

**변경 후**:
```typescript
// src/application/entitle/factories/StudentDashboardFactory.ts
import { StudentDashboardGateway } from "../../../interfaceAdapters/gateways/api/StudentDashboardGateway";
import { StudentDashboardService } from "../../../interfaceAdapters/services/StudentDashboardService";

export interface StudentDashboardFactoryConfig {
  accessToken?: string;
  requester: Pick<User, "userId" | "role">;
}

export function createStudentDashboardService(
  config: StudentDashboardFactoryConfig
): StudentDashboardService {
  const { accessToken, requester } = config;

  // Gateway 생성
  const gateway = new StudentDashboardGateway({ accessToken });

  // Service 생성 (Gateway + Requester 주입)
  const service = new StudentDashboardService(gateway, requester);

  return service;
}
```

**변경 사항**:
1. ✅ `StudentDashboardUseCase` 클래스 제거
2. ✅ `requester` 파라미터 추가 (권한 검증용)
3. ✅ 의존성 단순화: `Gateway + Requester → Service`

---

#### 2.2 StudentChatFactory 마이그레이션

**변경 전**:
```typescript
export function createStudentChatService(
  config: FactoryConfig = {}
): StudentChatService {
  const { accessToken } = config;

  const gateway = new StudentChatGateway({ accessToken });

  const messageUseCase = new MessageUseCase(gateway);
  const conversationUseCase = new ConversationUseCase(gateway);
  const feedbackUseCase = new FeedbackUseCase(gateway);

  return new StudentChatService(
    messageUseCase,
    conversationUseCase,
    feedbackUseCase
  );
}
```

**변경 후**:
```typescript
export function createStudentChatService(
  config: FactoryConfig = {}
): StudentChatService {
  const { accessToken } = config;

  // Gateway가 Port 인터페이스를 구현
  const gateway = new StudentChatGateway({ accessToken });

  // Service에 Gateway를 Port로 주입
  return new StudentChatService(
    gateway, // MessagePort
    gateway, // ConversationCreatePort
    gateway  // FeedbackPort
  );
}
```

**변경 사항**:
1. ✅ 3개 클래스 UseCase 제거
2. ✅ Gateway를 Port로 직접 주입
3. ✅ 코드 줄 수 50% 감소

---

### Phase 3: Presenter 레이어 수정

**변경 전**:
```typescript
// src/interfaceAdapters/presenters/useStudentDashboardPresenter.ts
const service = useMemo(
  () => createStudentDashboardService({ accessToken }),
  [accessToken]
);
```

**변경 후**:
```typescript
// src/interfaceAdapters/presenters/useStudentDashboardPresenter.ts
const service = useMemo(
  () => createStudentDashboardService({
    accessToken,
    requester: { userId, role },
  }),
  [accessToken, userId, role]
);
```

**변경 사항**:
1. ✅ `requester` 정보 추가 전달
2. ✅ 의존성 배열에 `userId`, `role` 추가

---

### Phase 4: 클래스 UseCase 파일 제거

#### 제거 대상 파일
```bash
rm src/application/entitle/ConversationUseCase.ts
rm src/application/entitle/MessageUseCase.ts
rm src/application/entitle/FeedbackUseCase.ts
rm src/application/entitle/StudentDashboardUseCase.ts
rm src/application/entitle/ProfileUseCase.ts
rm src/application/entitle/MentorDashboardUseCase.ts
rm src/application/entitle/MentorStudentChatUseCase.ts
```

#### Import 수정
모든 파일에서 클래스 UseCase import 제거:
```typescript
// 제거
import { ConversationUseCase } from "../../application/entitle/ConversationUseCase";
import { MessageUseCase } from "../../application/entitle/MessageUseCase";

// 추가
import {
  createConversationUseCase,
  deleteConversationUseCase,
} from "../../application/entitle/conversationUseCases";
import {
  createUserMessageUseCase,
  listMessagesUseCase,
} from "../../application/entitle/messageUseCases";
```

---

## 🔄 데이터 흐름 변화

### Before (클래스 UseCase 사용)

```
┌──────────────┐
│  Presenter   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Factory    │ createService(accessToken)
└──────┬───────┘
       │
       ├─► Gateway(클래스)
       │
       ├─► UseCase(클래스) ─► 함수형 UseCase(실제 로직)
       │
       └─► Service(클래스)
               │
               ▼
       useCase.method()
               │
               ▼
       함수형 UseCase(args, port)
```

**문제점**:
- UseCase 클래스가 단순 래퍼
- 함수형 UseCase가 이미 모든 로직 수행
- 불필요한 계층 추가

---

### After (함수형 UseCase 직접 사용)

```
┌──────────────┐
│  Presenter   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Factory    │ createService(accessToken, requester)
└──────┬───────┘
       │
       ├─► Gateway(Port 구현)
       │
       ├─► Requester(User 정보)
       │
       └─► Service(클래스)
               │
               ▼
       함수형 UseCase(args, port)
```

**개선점**:
- 불필요한 클래스 계층 제거
- 의존성 명확화
- 코드 중복 제거

---

## ✅ 마이그레이션 체크리스트

### Phase 1: Service 리팩토링
- [ ] StudentDashboardService.ts
- [ ] StudentChatService.ts
- [ ] MentorDashboardService.ts
- [ ] MentorStudentChatService.ts
- [ ] ProfileService.ts
- [ ] AvatarSettingsService.ts
- [ ] AuthService.ts (이미 완료)

### Phase 2: Factory 리팩토링
- [ ] StudentDashboardFactory.ts
- [ ] StudentChatFactory.ts
- [ ] MentorDashboardFactory.ts
- [ ] MentorStudentChatFactory.ts
- [ ] ProfileFactory.ts
- [ ] AvatarSettingsFactory.ts
- [ ] AuthFactory.ts (이미 완료)

### Phase 3: Presenter 수정
- [ ] useStudentDashboardPresenter.ts
- [ ] useStudentChatPresenter.ts
- [ ] useMentorDashboardPresenter.ts
- [ ] useMentorStudentChatPresenter.ts
- [ ] useProfilePresenter.ts
- [ ] useAvatarPresenter.ts

### Phase 4: 클래스 UseCase 제거
- [ ] ConversationUseCase.ts
- [ ] MessageUseCase.ts
- [ ] FeedbackUseCase.ts
- [ ] StudentDashboardUseCase.ts
- [ ] ProfileUseCase.ts
- [ ] MentorDashboardUseCase.ts
- [ ] MentorStudentChatUseCase.ts
- [ ] LLMUseCase.ts

### Phase 5: 테스트 작성
- [ ] Service 계층 단위 테스트
- [ ] Factory 통합 테스트
- [ ] Presenter 통합 테스트

---

## 🧪 테스트 전략

### Service 단위 테스트 예시

```typescript
// src/interfaceAdapters/services/__tests__/StudentDashboardService.test.ts
import { StudentDashboardService } from "../StudentDashboardService";
import type { StudentDashboardGateway } from "../../gateways/api/StudentDashboardGateway";

describe("StudentDashboardService", () => {
  const mockGateway: StudentDashboardGateway = {
    listConversations: jest.fn(),
    createConversation: jest.fn(),
    deleteConversation: jest.fn(),
  };

  const requester = {
    userId: "user-1",
    role: "NEW_HIRE" as const,
  };

  let service: StudentDashboardService;

  beforeEach(() => {
    service = new StudentDashboardService(mockGateway, requester);
    jest.clearAllMocks();
  });

  describe("fetchConversations", () => {
    it("권한이 없으면 실패를 반환한다", async () => {
      const mentorRequester = { userId: "mentor-1", role: "MENTOR" as const };
      const mentorService = new StudentDashboardService(mockGateway, mentorRequester);

      const result = await mentorService.fetchConversations();

      expect(result.kind).toBe("failure");
      expect(result.error.kind).toBe("Forbidden");
      expect(mockGateway.listConversations).not.toHaveBeenCalled();
    });

    it("권한이 있으면 Gateway를 호출한다", async () => {
      const mockConversations = [
        { convId: "conv-1", title: "Test", lastActiveAt: "2023-01-01" },
      ];
      (mockGateway.listConversations as jest.Mock).mockResolvedValue(mockConversations);

      const result = await service.fetchConversations();

      expect(result.kind).toBe("success");
      expect(result.value).toEqual(mockConversations);
      expect(mockGateway.listConversations).toHaveBeenCalledTimes(1);
    });

    it("Gateway 에러를 처리한다", async () => {
      (mockGateway.listConversations as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      const result = await service.fetchConversations();

      expect(result.kind).toBe("failure");
      expect(result.error.message).toContain("Network error");
    });
  });
});
```

---

## 📊 예상 효과

### 코드 메트릭 개선

| 메트릭 | Before | After | 개선율 |
|--------|--------|-------|--------|
| UseCase 파일 수 | 21개 | 14개 | -33% |
| 총 코드 라인 | ~3,500 | ~2,800 | -20% |
| 의존성 깊이 | 5단계 | 3단계 | -40% |
| 테스트 복잡도 | 높음 | 중간 | -30% |

### 개발 생산성 개선

1. **새 기능 추가 시간**: 30% 감소
   - UseCase 함수만 작성 (클래스 래퍼 불필요)

2. **테스트 작성 시간**: 25% 감소
   - Mock Port 주입만으로 테스트 가능

3. **코드 리뷰 시간**: 20% 감소
   - 의존성 흐름이 명확해짐

4. **버그 발생률**: 15% 감소
   - 단순한 구조로 실수 가능성 감소

---

## 🚀 마이그레이션 실행 계획

### Week 1: Phase 1-2 (Service + Factory)
- Day 1-2: StudentDashboard, StudentChat
- Day 3-4: MentorDashboard, MentorStudentChat
- Day 5: Profile, AvatarSettings

### Week 2: Phase 3-4 (Presenter + 정리)
- Day 1-2: Presenter 수정
- Day 3: 클래스 UseCase 제거
- Day 4-5: 통합 테스트 작성

### Week 3: 검증 및 배포
- Day 1-3: QA 테스트
- Day 4: 성능 테스트
- Day 5: 배포

---

## 🔍 회고 및 개선

### 마이그레이션 완료 후 확인 사항

1. [ ] 모든 기능이 정상 작동하는가?
2. [ ] 테스트 커버리지가 80% 이상인가?
3. [ ] ARCHITECTURE.md와 일치하는가?
4. [ ] 코드 리뷰 가이드라인 업데이트 완료?
5. [ ] 팀원들에게 교육 완료?

### 예상 문제점 및 대응

**문제 1**: 기존 코드에 의존하는 부분
- **대응**: 점진적 마이그레이션, Feature Flag 활용

**문제 2**: 테스트 커버리지 부족
- **대응**: 마이그레이션과 동시에 테스트 작성

**문제 3**: 팀원 학습 곡선
- **대응**: 가이드 문서 작성, 페어 프로그래밍

---

**작성일**: 2025-12-07
**버전**: 1.0
**작성자**: System Architecture Designer
