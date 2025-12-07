# 아키텍처 리팩토링 TODO (2024-12-07)

## 배경
V2 Clean Architecture 마이그레이션 완료 후 발견된 아키텍처 위반 사항 24건.
기능적으로는 정상 동작하지만, Clean Architecture 원칙을 준수하려면 추가 리팩토링 필요.

## 핵심 문제
**application 레이어가 interfaceAdapters 레이어를 직접 import하고 있음**

위반 패턴:
```
application/factories/ → interfaceAdapters/gateways/ (❌)
application/ports/ → interfaceAdapters/gateways/types (❌)
application/usecases/ → interfaceAdapters/gateways/types (❌)
```

올바른 의존성 방향:
```
interfaceAdapters → application → domain (✅)
```

---

## Phase 1: Factory 이동 (우선순위: 높음, 4-6시간)

### 작업 내용
Factory를 `application/entitle/factories/` → `interfaceAdapters/factories/`로 이동

### 대상 파일 (7개)
- `StudentChatFactory.ts`
- `AuthFactory.ts`
- `ProfileFactory.ts`
- `MentorDashboardFactory.ts`
- `MentorStudentChatFactory.ts`
- `StudentDashboardFactory.ts`
- `AvatarSettingsFactory.ts`

### 이동 후 수정 필요
1. `interfaceAdapters/factories/index.ts` 생성
2. 각 Presenter/Page에서 Factory import 경로 수정
   - `useStudentChatPresenter.ts`
   - `useMentorDashboardPresenter.ts`
   - `useMentorStudentChatPresenter.ts`
   - `useStudentDashboardPresenter.ts`
   - `useAuthPresenter.ts`
   - `useProfilePresenter.ts`
   - `useAvatarPresenter.ts`

### 검증
```bash
npx tsc --noEmit && npm run build
```

---

## Phase 2: Gateway 타입 분리 (우선순위: 높음, 6-8시간)

### 문제
`interfaceAdapters/gateways/api/types.ts`의 타입들이 Port/UseCase에서 직접 import됨

### 이동 대상 타입
```typescript
// application/entitle/models/에 추가할 타입들
StudentChatBootstrap
SearchSettings
LLMGenerateResponse
WebSource
ResponseSources
WebSearchConfirmationLabels
ConversationOption
MentorOption
```

### 수정 파일
1. **Port 파일들**
   - `LLMPort.ts` - SearchSettings, LLMGenerateResponse
   - `InitialDataPort.ts` - StudentChatBootstrap
   
2. **UseCase 파일들**
   - `LLMUseCase.ts` - SearchSettings, LLMGenerateResponse
   - `initialDataUseCase.ts` - StudentChatBootstrap
   - `MentorDashboardUseCase.ts` - NewhireOption

### 단계
1. `application/entitle/models/llm.ts` 생성 → LLM 관련 타입 이동
2. `application/entitle/models/chat.ts` 생성 → Chat 관련 타입 이동
3. `application/entitle/models/index.ts` 업데이트
4. Port/UseCase에서 import 경로 변경
5. Gateway에서는 application/models를 import하도록 변경

---

## Phase 3: NewhireOption 타입 이동 (우선순위: 중간, 2시간)

### 현재
```typescript
// MentorDashboardGateway.ts에 정의됨
export interface NewhireOption {
  userId: string;
  displayName: string;
  email: string;
}
```

### 변경
```typescript
// domain/models/NewhireOption.ts로 이동
// 또는 application/entitle/models/mentor.ts로 이동
```

### 수정 파일
- `MentorDashboardGateway.ts` - export 제거, import로 변경
- `MentorDashboardPort.ts` - import 경로 변경
- `MentorDashboardUseCase.ts` - import 경로 변경

---

## Phase 4: Composition Root 패턴 도입 (우선순위: 중간, 6-10시간)

### 개념
모든 의존성 조립을 한 곳에서 관리

### 구조
```
src/composition/
├── root.ts              # 메인 Composition Root
├── studentChat.ts       # StudentChat 관련 조립
├── mentorDashboard.ts   # MentorDashboard 관련 조립
└── index.ts
```

### 예시 코드
```typescript
// src/composition/studentChat.ts
import { ConversationGateway } from "../interfaceAdapters/gateways/api";
import { ConversationUseCase } from "../application/entitle";
import { StudentChatService } from "../interfaceAdapters/services";

export function createStudentChatDependencies(config: { accessToken?: string }) {
  const conversationGateway = new ConversationGateway(config);
  const conversationUseCase = new ConversationUseCase(conversationGateway);
  const studentChatService = new StudentChatService(conversationUseCase);
  
  return { studentChatService };
}
```

### 장점
- Factory가 interfaceAdapters를 import해도 문제없음 (composition은 최상위 레이어)
- 테스트 시 Mock 주입 용이
- 의존성 그래프 시각화 가능

---

## Phase 5: ESLint 규칙 추가 (우선순위: 낮음, 2시간)

### 설치
```bash
npm install --save-dev eslint-plugin-import
```

### 설정 (.eslintrc.js)
```javascript
rules: {
  "import/no-restricted-paths": [
    "error",
    {
      zones: [
        {
          target: "./src/application",
          from: "./src/interfaceAdapters",
          message: "application 레이어는 interfaceAdapters를 import할 수 없습니다."
        },
        {
          target: "./src/domain",
          from: ["./src/application", "./src/interfaceAdapters"],
          message: "domain 레이어는 다른 레이어를 import할 수 없습니다."
        }
      ]
    }
  ]
}
```

---

## Phase 6: 아키텍처 문서화 (우선순위: 낮음, 4시간)

### 파일
`docs/ARCHITECTURE.md`

### 내용
1. 레이어 구조 설명
2. 의존성 방향 규칙
3. DIP (Dependency Inversion Principle) 적용 방법
4. Port/Gateway/UseCase/Service/Factory 역할 설명
5. 새 기능 추가 시 가이드라인

---

## 우선순위 정리

| Phase | 작업 | 예상 시간 | 우선순위 |
|-------|------|----------|---------|
| 1 | Factory 이동 | 4-6시간 | 🔴 높음 |
| 2 | Gateway 타입 분리 | 6-8시간 | 🔴 높음 |
| 3 | NewhireOption 이동 | 2시간 | 🟡 중간 |
| 4 | Composition Root | 6-10시간 | 🟡 중간 |
| 5 | ESLint 규칙 | 2시간 | 🟢 낮음 |
| 6 | 문서화 | 4시간 | 🟢 낮음 |

**총 예상 시간: 24-32시간**

---

## 참고: 현재 정상 동작하는 아키텍처

```
View (Page)
    ↓ uses
Presenter (Hook)
    ↓ uses  
Factory (조립) ←── 여기가 interfaceAdapters를 import (현재 위반)
    ↓ creates
Service
    ↓ uses
UseCase ←── 여기가 Gateway 타입을 import (현재 위반)
    ↓ depends on
Port (Interface)
    ↑ implements
Gateway
    ↓ calls
External API
```

기능적으로 문제없음. 리팩토링은 **아키텍처 순수성**을 위한 것.
