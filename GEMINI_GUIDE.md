# RetentionEngineView AI 개발 가이드

## 1. 프로젝트 개요

**RetentionEngineView**는 학생의 학습 효율과 서비스 유지율(Retention)을 높이기 위해 설계된 AI 기반 교육 플랫폼입니다. 이 시스템은 '학생'과 '멘토'라는 두 가지 주요 역할을 위한 맞춤형 인터페이스를 제공합니다. 핵심은 **'멘토 참여형 루프(Mentor-in-the-Loop)'** 시스템으로, 학생은 AI 튜터와 상호작용하고, 인간 멘토는 이 상호작용을 검토하여 피드백을 제공하며 AI의 지식 베이스를 지속적으로 개선합니다.

## 2. 핵심 비즈니스 로직

이 애플리케이션은 세 가지 상호 연결된 피드백 루프를 기반으로 작동합니다.

### a. 학생-AI 학습 루프 (기본 학습)
- **주체**: 학생
- **프로세스**:
    1. 학생이 `StudentChatScreen`을 통해 AI 튜터에게 질문합니다.
    2. AI가 실시간으로 답변하며 기본 학습 경험을 제공합니다.
    3. 모든 대화는 `StudentChatHistoryScreen`에 기록되어 학생이 복습할 수 있습니다.

### b. 멘토-AI 품질 관리 루프 (피드백 및 교정)
- **주체**: 멘토
- **프로세스**:
    1. 시스템이 특정 AI 대화를 '리뷰 필요'로 자동 분류합니다.
    2. 멘토는 `MentorDashboard`에서 리뷰가 필요한 대화 목록을 확인합니다.
    3. `MentorChatReviewScreen`을 통해 해당 대화 내용을 검토합니다.
    4. 멘토는 AI의 답변을 직접 **첨삭(添削)**하고, 왜 그렇게 수정했는지에 대한 **코멘트**를 추가할 수 있습니다.
    5. 이 피드백은 학생의 채팅 화면(`StudentChatScreen`)에 `MentorFeedbackPreview` 컴포넌트를 통해 표시되어, 학생은 더 높은 품질의 정보를 바탕으로 2차 학습을 하게 됩니다.

### c. 지식 베이스 강화 루프 (시스템 성장)
- **주체**: 멘토
- **프로세스**:
    1. 멘토의 첨삭 내용은 일회성 피드백으로 끝나지 않고, 영구적인 지식 자산으로 전환됩니다.
    2. 멘토는 `KnowledgeCorrectionScreen`에서 첨삭한 내용을 '주제', '난이도', '태그' 등의 메타데이터와 함께 정제된 지식 문서로 만듭니다.
    3. '공개'된 문서는 중앙 지식 베이스인 `KnowledgeSummaryScreen`에 축적됩니다.
    4. 이 검증된 지식 베이스는 향후 AI 모델을 미세 조정(fine-tuning)하거나, 유사 질문에 대한 AI의 답변 정확도를 높이는 데 사용됩니다. 이를 통해 시스템 전체가 시간이 지남에 따라 점진적으로 똑똑해집니다.

## 3. 주요 컴포넌트 기능

### 최상위 인터페이스
- **`App.tsx`**: 앱의 진입점. `UserRoleSelector`를 통해 역할을 선택받고, `StudentInterface` 또는 `MentorInterface`를 렌더링합니다.
- **`StudentInterface.tsx`**: 학생 경험을 위한 메인 컨테이너. 학생용 사이드바, 레이아웃, 현재 활성화된 화면을 관리합니다.
- **`MentorInterface.tsx`**: 멘토 경험을 위한 메인 컨테이너. 멘토용 사이드바와 레이아웃, 화면 전환을 관리합니다.

### 핵심 기능 화면
- **`StudentChatScreen.tsx`**: 학생이 AI와 대화하는 메인 채팅 화면입니다.
- **`StudentChatHistoryScreen.tsx`**: 학생이 자신의 과거 대화 기록을 보는 화면입니다.
- **`StudentFeedbackScreen.tsx`**: 학생이 멘토로부터 받은 모든 첨삭 피드백을 목록 형태로 확인하는 전용 페이지입니다.
- **`MentorDashboard.tsx`**: 멘토의 랜딩 페이지. 리뷰가 필요한 학생 및 대화 목록을 보여줍니다.
- **`MentorChatReviewScreen.tsx`**: 멘토가 특정 학생과 AI의 대화를 상세히 검토하고, 첨삭 및 코멘트를 작성하는 화면입니다.
- **`KnowledgeCorrectionScreen.tsx`**: 멘토가 AI 답변을 영구적인 지식 베이스 아티클로 편집하고 발행하는 화면입니다.
- **`KnowledgeSummaryScreen.tsx`**: 멘토가 축적된 모든 지식 베이스 아티클을 검색하고 열람하는 라이브러리입니다.

### 공용 및 UI 컴포넌트
- **`AppSidebar.tsx`**: 역할(`student`/`mentor`)에 따라 다른 메뉴 항목을 보여주는 메인 사이드바 네비게이션입니다.
- **`MentorFeedbackPreview.tsx`**: 학생 채팅창에서 멘토의 피드백이 존재함을 알려주고, 클릭 시 상세 내용을 다이얼로그로 보여주는 컴포넌트입니다.
- **`UserRoleSelector.tsx`**: 사용자가 '학생' 또는 '멘토' 역할을 선택하는 초기 화면입니다.
- **`src/components/ui/`**: shadcn/ui 기반의 재사용 가능한 UI 컴포넌트(Button, Card, Dialog 등)가 모여있는 디렉토리입니다.

## 4. 개발 환경 실행

- 아래 명령어를 사용하여 개발 서버를 시작합니다.
  ```bash
  npm run dev
  ```
