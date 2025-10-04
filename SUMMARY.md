# Retention Engine: AI 기반 학습 및 멘토링 플랫폼

## 1. 서비스 개요

**Retention Engine**는 학생과 AI 튜터 간의 대화를 인간 멘토가 검토하고 피드백을 제공하는 혁신적인 교육 플랫폼입니다. 학생들은 AI와 실시간으로 대화하며 학습하고, 멘토는 학생들의 대화 내용을 검토하여 보다 정확하고 자연스러운 표현을 제안함으로써 AI의 한계를 보완하고 학습 효과를 극대화합니다.

이 시스템은 크게 **학생 인터페이스**와 **멘토 인터페이스** 두 가지 주요 부분으로 구성됩니다.

## 2. 기술 스택

- **프론트엔드:** React, TypeScript, Vite
- **UI:** shadcn/ui 기반의 커스텀 컴포넌트 라이브러리, Tailwind CSS
- **상태 관리:** React Hooks (useState)

## 3. 주요 기능

### 3.1. 공통 기능

- **역할 선택:** 사용자는 '학생' 또는 '멘토' 역할을 선택하여 서비스에 진입합니다.
- **로그아웃:** 언제든지 세션을 종료하고 역할 선택 화면으로 돌아갈 수 있습니다.

### 3.2. 학생 인터페이스 (Student Interface)

학생은 AI 튜터와 상호작용하며 학습 경험을 쌓습니다.

- **AI 튜터와 채팅 (`StudentChatScreen`):**
  - 실시간으로 AI와 대화하며 질문하고 답변을 얻습니다.
  - 멘토로부터 받은 피드백을 채팅 메시지 아래에서 직접 확인하고 적용할 수 있습니다.
- **채팅 기록 보기 (`StudentChatHistoryScreen`):**
  - 과거에 AI와 나눈 대화 내용을 시간 순서대로 다시 볼 수 있습니다.
- **피드백 목록 (`StudentFeedbackScreen`):**
  - 멘토가 제공한 모든 피드백을 한 곳에서 모아보고 관리할 수 있습니다.
- **피드백 알림 (`FeedbackNotificationCenter`):**
  - 새로운 피드백이 도착하면 알림을 받고, 확인한 피드백은 '읽음'으로 처리할 수 있습니다.

### 3.3. 멘토 인터페이스 (Mentor Interface)

멘토는 학생들의 학습 과정을 감독하고 AI의 품질을 개선하는 역할을 담당합니다.

- **멘토 대시보드 (`MentorDashboard`):**
  - 담당하고 있는 학생들의 목록과 최근 활동을 한눈에 파악합니다.
  - 특정 학생을 선택하여 상세한 채팅 내용을 검토할 수 있습니다.
- **채팅 검토 및 피드백 (`MentorChatReviewScreen`):**
  - 학생과 AI 간의 전체 대화 내용을 확인합니다.
  - AI의 답변 중 어색하거나 틀린 부분을 직접 수정하고, 왜 그렇게 수정했는지에 대한 설명(피드백)을 작성하여 학생에게 전달합니다.
- **지식 베이스 요약 (`KnowledgeSummaryScreen`):**
  - AI가 자주 사용하는 지식이나 답변 패턴을 요약해서 볼 수 있습니다. (기능 확장 가능성)
- **지식 수정 (`KnowledgeCorrectionScreen`):**
  - AI의 잘못된 지식을 바로잡거나 새로운 정보를 추가하여 AI의 전반적인 답변 품질을 향상시킬 수 있습니다. (기능 확장 가능성)

## 4. 시스템 구조

```
App.tsx
├── UserRoleSelector.tsx (초기 역할 선택)
│
├── StudentInterface.tsx (학생 역할 선택 시)
│   ├── AppSidebar.tsx (네비게이션)
│   ├── StudentChatScreen.tsx (AI와 채팅)
│   ├── StudentChatHistoryScreen.tsx (채팅 기록)
│   └── StudentFeedbackScreen.tsx (피드백 목록)
│
└── MentorInterface.tsx (멘토 역할 선택 시)
    ├── AppSidebar.tsx (네비게이션)
    ├── MentorDashboard.tsx (학생 목록)
    ├── MentorChatReviewScreen.tsx (채팅 검토)
    └── KnowledgeSummaryScreen.tsx (지식 요약)
```

## 5. 기대 효과

- **학생:** AI를 통해 즉각적인 학습이 가능하면서도, 인간 멘토의 깊이 있는 피드백을 통해 정확하고 섬세한 지식을 습득할 수 있습니다.
- **멘토:** 다수의 학생을 효율적으로 관리하고, AI와의 상호작용을 통해 반복적인 설명의 부담을 줄이면서 교육의 질을 높이는 데 집중할 수 있습니다.
- **플랫폼:** 멘토의 피드백 데이터를 축적하여 AI 모델을 지속적으로 개선하고, 장기적으로는 더 지능적이고 개인화된 교육 서비스를 제공할 수 있습니다.
