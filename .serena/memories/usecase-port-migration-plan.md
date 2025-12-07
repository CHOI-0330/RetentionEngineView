# UseCase + Port 마이그레이션 계획 (2024-12-07)

## 목표
- 진정한 의존성 역전 원칙(DIP) 적용
- UseCase 클래스로 통일
- Port 인터페이스 분리 및 Gateway implements 추가

## 의존성 방향 (올바른 DIP)

```
application/entitle/
┌──────────────────┐     ┌──────────────────┐
│    UseCase       │────▶│      Port        │
│   (클래스)        │     │   (인터페이스)    │
└──────────────────┘     └──────────────────┘
                               ▲
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─
                               │ implements
interfaceAdapters/             │
┌──────────────────┐           │
│    Gateway       │───────────┘
│   (구현체)        │
└──────────────────┘
```

**핵심**: 모든 화살표가 Port(인터페이스)를 향함

## 현재 문제점

| 문제 | 현재 상태 | 목표 |
|------|----------|------|
| Port 위치 분산 | UseCase 파일 내 / ports.ts 혼재 | `ports/` 폴더로 통합 |
| Gateway implements 없음 | duck typing으로 동작 | 명시적 `implements Port` |
| UseCase 스타일 혼재 | 함수형 + 클래스 래퍼 | 클래스로 통일 |
| 중복 파일 | conversationUseCases.ts 등 | 삭제 |

## Phase 1: Port 인터페이스 분리 및 통합

**작업**: `application/entitle/ports/` 폴더 생성

```
src/application/entitle/ports/
├── index.ts              # 모든 Port export
├── ConversationPort.ts
├── MessagePort.ts
├── LLMPort.ts
├── FeedbackPort.ts
├── AuthPort.ts
├── InitialDataPort.ts
├── ProfilePort.ts
├── MentorDashboardPort.ts
└── StudentDashboardPort.ts
```

## Phase 2: Gateway에 implements 추가

| Gateway | implements |
|---------|------------|
| ConversationGateway | implements ConversationPort |
| MessageGateway | implements MessagePort |
| LLMGateway | implements LLMPort |
| FeedbackGateway | implements FeedbackPort |
| AuthGateway | implements AuthPort |
| ProfileGateway | implements ProfilePort |
| MentorDashboardGateway | implements MentorDashboardPort |
| StudentDashboardGateway | implements StudentDashboardPort |

## Phase 3: UseCase 클래스로 통일

| Before (함수형 + 래퍼) | After (클래스 직접 구현) |
|------------------------|-------------------------|
| conversationUseCases.ts + ConversationUseCase.ts | ConversationUseCase.ts |
| messageUseCases.ts + MessageUseCase.ts | MessageUseCase.ts |
| feedbackUseCases.ts + FeedbackUseCase.ts | FeedbackUseCase.ts |
| authUseCases.ts (함수만) | AuthUseCase.ts (신규) |

## Phase 4: 불필요 파일 삭제

- src/application/entitle/conversationUseCases.ts
- src/application/entitle/messageUseCases.ts
- src/application/entitle/feedbackUseCases.ts
- src/application/entitle/authUseCases.ts
- src/application/entitle/studentDashboardUseCases.ts
- src/application/entitle/useCases.ts
- src/application/entitle/ports.ts (→ ports/ 폴더로 대체)

## Phase 5: Factory 및 Import 수정

Port import 경로 수정, Factory 정리

## Phase 6: 테스트 및 빌드 검증

- npm run typecheck
- npm run build

## 최종 디렉토리 구조

```
src/application/entitle/
├── ports/
│   ├── index.ts
│   ├── ConversationPort.ts
│   ├── MessagePort.ts
│   ├── LLMPort.ts
│   ├── FeedbackPort.ts
│   ├── AuthPort.ts
│   ├── InitialDataPort.ts
│   ├── ProfilePort.ts
│   ├── MentorDashboardPort.ts
│   └── StudentDashboardPort.ts
├── models.ts
├── index.ts
├── ConversationUseCase.ts
├── MessageUseCase.ts
├── FeedbackUseCase.ts
├── LLMUseCase.ts
├── AuthUseCase.ts
├── InitialDataUseCase.ts
├── ProfileUseCase.ts
├── StudentDashboardUseCase.ts
├── MentorDashboardUseCase.ts
├── MentorStudentChatUseCase.ts
└── factories/

src/interfaceAdapters/gateways/api/
├── ConversationGateway.ts  # implements ConversationPort
├── MessageGateway.ts       # implements MessagePort
├── LLMGateway.ts           # implements LLMPort
└── ...
```

## 테스트 계정
- 학생: newhire@mail.com / 11111111
- 멘토: mentor@gmail.com / 11111111
