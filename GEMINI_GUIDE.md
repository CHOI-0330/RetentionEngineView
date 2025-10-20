# RetentionEngineView AI 개발 가이드

## 1. 프로젝트 개요

**RetentionEngineView**는 학생의 학습 효율과 서비스 유지율(Retention)을 높이기 위해 설계된 AI 기반 교육 플랫폼입니다. 이 시스템은 '학생'과 '멘토'라는 두 가지 주요 역할을 위한 맞춤형 인터페이스를 제공합니다. 핵심은 **'멘토 참여형 루프(Mentor-in-the-Loop)'** 시스템으로, 학생은 AI 튜터와 상호작용하고, 인간 멘토는 이 상호작용을 검토하여 피드백을 제공하며 AI의 지식 베이스를 지속적으로 개선합니다.

## 2. 핵심 비즈니스 로직

이 애플리케이션은 세 가지 상호 연결된 피드백 루프를 기반으로 작동합니다.

### a. 학생-AI 학습 루프 (기본 학습)
- **주체**: 학생
- **프로세스**:
    1. 학생이 `StudentChatView`(App Router: `/student`)를 통해 AI 튜터에게 질문합니다.
    2. AI가 실시간으로 답변하며 기본 학습 경험을 제공합니다.
    3. 대화 이력과 피드백은 동일 뷰에서 로드되어 학생이 즉시 복습할 수 있습니다.

### b. 멘토-AI 품질 관리 루프 (피드백 및 교정)
- **주체**: 멘토
- **프로세스**:
    1. 시스템이 특정 AI 대화를 '리뷰 필요'로 자동 분류합니다.
    2. 멘토는 `MentorDashboardView`(App Router: `/mentor`)에서 리뷰가 필요한 대화 목록을 확인합니다.
    3. 세부 검토는 `MentorStudentChatView`(App Router: `/mentor/chat/[convId]`)에서 이루어집니다.
    4. 멘토는 AI의 답변을 직접 **첨삭(添削)**하고, 왜 그렇게 수정했는지에 대한 **코멘트**를 추가할 수 있습니다.
    5. 반영된 피드백은 학생 채팅 화면에서 즉시 노출되고 재학습에 사용됩니다.

### c. 지식 베이스 강화 루프 (시스템 성장)
- **주체**: 멘토
- **프로세스**:
    1. 멘토의 첨삭 내용은 일회성 피드백으로 끝나지 않고, 영구적인 지식 자산으로 전환됩니다.
    2. 지식 베이스 전환 플로우는 현재 문서 설계 단계이며, 차후 `docs/` 디렉터리의 사양에 따라 구현될 예정입니다.
    3. '공개'된 문서는 중앙 지식 베이스에 축적된다는 비전을 기준으로 API·UI를 설계합니다.
    4. 이 검증된 지식 베이스는 향후 AI 모델을 미세 조정(fine-tuning)하거나, 유사 질문에 대한 AI의 답변 정확도를 높이는 데 사용됩니다. 이를 통해 시스템 전체가 시간이 지남에 따라 점진적으로 똑똑해집니다.

## 3. 주요 화면 & 진입점

### Next.js 엔트리
- **`app/page.tsx`**: 공개 홈. 인증 상태를 확인하고 `AuthPage`를 마운트합니다.
- **`app/student/page.tsx`**: 학생용 채팅 화면(`StudentChatPage`) 진입점입니다.
- **`app/mentor/page.tsx`**: 멘토 대시보드(`MentorDashboardPage`) 진입점입니다.
- **`app/mentor/chat/[convId]/page.tsx`**: 특정 대화를 검토하는 멘토용 상세 페이지입니다.

### Interface Adapters (컨테이너)
- **`src/interfaceAdapters/pages/entitle/AuthPage.tsx`**: 인증 컨트롤러/프레젠터를 묶어 AuthView에 전달합니다.
- **`src/interfaceAdapters/pages/entitle/StudentChatPage.tsx`**: StudentChat 컨트롤러와 프레젠터, Supabase/샌드박스 어댑터를 통합합니다.
- **`src/interfaceAdapters/pages/entitle/MentorDashboardPage.tsx`**: Mentor 대시보드 컨트롤 플로우를 관리합니다.
- **`src/interfaceAdapters/pages/entitle/MentorStudentChatPage.tsx`**: 멘토-학생 대화 검토 화면 로직을 담당합니다.

### View 레이어
- **`src/views/StudentChatView.tsx`**: 학생과 AI의 대화, 피드백, 대화 선택 UI를 담당합니다.
- **`src/views/MentorDashboardView.tsx`**: 리뷰가 필요한 학생 목록과 상태 지표를 시각화합니다.
- **`src/views/MentorStudentChatView.tsx`**: 멘토가 단일 대화를 검토·수정할 때 사용하는 UI입니다.
- **`src/views/AuthView.tsx`**: 로그인/회원가입/세션 상태를 보여줍니다.

### UI 프리미티브
- **`src/components/ui/`**: shadcn/ui 기반의 재사용 가능한 버튼, 카드, 다이얼로그 등 기본 컴포넌트 모음입니다.

## 4. 개발 환경 실행

- 아래 명령어를 사용하여 개발 서버를 시작합니다.
  ```bash
  npm run dev
  ```
