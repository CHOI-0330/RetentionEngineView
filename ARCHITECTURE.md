# Frontend Architecture Guide

## Overview

This frontend follows **Clean Architecture** principles, separating concerns into distinct layers with clear dependencies.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frameworks & Drivers                      │
│                   (React, Next.js, Supabase)                │
├─────────────────────────────────────────────────────────────┤
│                    Interface Adapters                        │
│          (Controllers, Presenters, Gateways, Pages)         │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                         │
│                        (Use Cases)                           │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│                  (Entities, Value Objects)                   │
└─────────────────────────────────────────────────────────────┘
          ↑ Dependency Direction (inner layers only)
```

---

## Layer Responsibilities

### 1. Domain Layer (`src/domain/`)

**Purpose**: Core business entities and value objects

**Files**:
- `core.ts` - Domain types (User, Message, Conversation, etc.)
- `mbti.types.ts` - MBTI-related types

**Rules**:
- ❌ No React imports
- ❌ No Next.js imports
- ❌ No external API calls
- ✅ Pure TypeScript types and interfaces only

```typescript
// Example: src/domain/core.ts
export interface User {
  userId: string;
  role: "NEW_HIRE" | "MENTOR" | "ADMIN";
  displayName: string;
  email: string;
  createdAt: string;
}
```

---

### 2. Application Layer (`src/application/`)

**Purpose**: Business logic and use cases

**Files**:
- `useCases.ts` - Pure validation functions
- `messageUseCases.ts` - Message operations with Port injection
- `conversationUseCases.ts` - Conversation operations with Port injection
- `feedbackUseCases.ts` - Feedback operations with Port injection
- `models.ts` - UseCaseResult, Prompt types
- `ports.ts` - Port interfaces (MessagePort, FeedbackPort, etc.)

**Rules**:
- ❌ No React imports
- ❌ No Next.js imports
- ✅ Pure TypeScript functions
- ✅ Port injection for external calls

**Patterns**:

#### Result Pattern
```typescript
// Success/Failure instead of try-catch
type UseCaseResult<T> =
  | { kind: "success"; value: T }
  | { kind: "failure"; error: UseCaseFailure };
```

#### Port Injection
```typescript
// UseCase receives Port (Gateway) as parameter
export async function createUserMessageUseCase(
  args: { user: User; conversation: Conversation; content: string },
  messagePort: MessagePort  // Injected from outside
): Promise<UseCaseResult<Message>> {
  // 1. Validation
  if (args.content.trim().length === 0) {
    return failure("ValidationError", "Message cannot be empty");
  }

  // 2. API call through Port
  const message = await messagePort.createUserMessage({...});
  return success(message);
}
```

---

### 3. Interface Adapters Layer (`src/interfaceAdapters/`)

This layer contains multiple sub-layers:

#### 3.1 Controllers (`controllers/`)

**Purpose**: State management and action handling

**Responsibilities**:
- Manage component state (useState)
- Handle user actions
- Generate Effects (side effect requests)
- **Do NOT** make API calls directly

**Files**:
- `useStudentChatController.ts` - Re-exports from `studentChat/`
- `studentChat/` - Split controller modules
  - `index.ts` - Main controller hook
  - `types.ts` - State, Action, Effect types
  - `useMessageActions.ts` - Message-related actions
  - `useFeedbackActions.ts` - Feedback-related actions
  - `useSearchActions.ts` - Search-related actions
  - `useEffectManager.ts` - Effect queue management

**Output**:
```typescript
interface Controller {
  state: ControllerState;
  actions: ControllerActions;
}
```

**Rules**:
- ✅ Can use React hooks (useState, useCallback, useMemo)
- ❌ No Next.js imports
- ❌ No direct API calls

---

#### 3.2 Presenters (`presenters/`)

**Purpose**: Transform Controller state to View-friendly format

**Responsibilities**:
- Map domain types to view types
- Compute derived state
- Format data for display
- **Pure transformation only**

**Files**:
- `useStudentChatPresenter.ts`
- `useMentorDashboardPresenter.ts`

**Input**: Controller
**Output**:
```typescript
interface PresenterOutput {
  viewModel: ViewData;      // Transformed data for display
  status: StatusInfo;       // Loading, error states
  meta: MetaInfo;           // Counts, timestamps
  interactions: Actions;    // Action handlers for View
  pendingEffects: Effect[]; // Effects waiting to be processed
}
```

**Rules**:
- ✅ Can use React hooks (useMemo)
- ❌ No API calls
- ❌ No state modification

**Example**:
```typescript
// Transform domain "ASSISTANT" to view-friendly "ai"
const toMessageView = (message: Message): MessageView => ({
  sender: message.role === "ASSISTANT" ? "ai" : "student",
  format: message.role === "ASSISTANT" ? "markdown" : "text",
});
```

---

#### 3.3 Gateways (`gateways/api/`)

**Purpose**: API communication layer

**Responsibilities**:
- Implement Port interfaces
- Make HTTP calls
- Handle response/error transformation

**Files**:
- `StudentChatGateway.ts` - implements MessagePort, FeedbackPort, ConversationCreatePort
- `MentorDashboardGateway.ts` - implements MentorDashboardPort
- `StudentDashboardGateway.ts`

**Rules**:
- ❌ No React imports
- ✅ Pure TypeScript classes
- ✅ Implement Port interfaces

```typescript
// Gateway implements Port interface
export class StudentChatGateway implements MessagePort, FeedbackPort {
  async createUserMessage(input: {...}): Promise<Message> {
    const result = await apiFetch<Message>("/api/...", {...});
    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }
    return result.data;
  }
}
```

---

#### 3.4 Pages (`pages/entitle/`)

**Purpose**: Composition root - wire everything together

**Responsibilities**:
- Session guard (authentication/authorization)
- Instantiate Controller, Presenter, Gateway
- Process Effects (call APIs based on Controller effects)
- Route to appropriate View

**Files**:
- `StudentChatPage.tsx`
- `StudentChatRuntime.tsx` - Effect processing separated
- `MentorDashboardPage.tsx`
- `AuthPage.tsx`

**Rules**:
- ✅ Can use React hooks
- ✅ Can use Next.js (useRouter, useSearchParams)
- ✅ Composition and wiring only
- ❌ No business logic
- ❌ No direct API calls (use Gateway through UseCase Hook)

**Pattern - UseCase Hook**:
```typescript
// Page uses UseCase Hook, not Gateway directly
const { createConversation } = useConversationUseCases({ accessToken });

// UseCase Hook hides Gateway internally
export const useConversationUseCases = ({ accessToken }) => {
  const { gateway } = useStudentChatGateway({ accessToken });

  const createConversation = useCallback(
    (args) => createConversationUseCase(args, gateway),
    [gateway]
  );

  return { createConversation };
};
```

---

#### 3.5 Hooks (`hooks/`)

**Purpose**: Reusable logic hooks

**Files**:
- `useSessionGuard.ts` - Authentication/authorization
- `useStudentChatGateway.ts` - Gateway instance management
- `useConversationUseCases.ts` - UseCase Hook pattern
- `useEffectQueue.ts` - Effect processing
- `useAvatarPreloader.ts` - Image preloading

---

### 4. Views Layer (`src/views/`)

**Purpose**: Pure presentation components

**Responsibilities**:
- Render UI based on props
- Handle user events (delegate to interactions)
- **No state management**
- **No business logic**

**Files**:
- `StudentChatView.tsx`
- `MentorDashboardView.tsx`
- `MentorAssignmentView.tsx`

**Rules**:
- ✅ Can use React
- ❌ No direct API calls
- ❌ No business logic
- ✅ Receive all data and handlers via props

```typescript
interface ViewProps {
  viewModel: ViewData;
  status: StatusInfo;
  meta: MetaInfo;
  interactions: {
    onSendMessage: (content: string) => void;
    onSelectConversation: (id: string) => void;
  };
}
```

---

## Data Flow

```
User Action
    │
    ▼
┌─────────┐     ┌───────────┐     ┌─────────┐
│  View   │────▶│ Controller │────▶│ Effect  │
└─────────┘     └───────────┘     │ Queue   │
    ▲                              └────┬────┘
    │                                   │
┌─────────┐     ┌───────────┐     ┌────▼────┐
│Presenter│◀────│   Page    │◀────│ Gateway │
└─────────┘     └───────────┘     └─────────┘
                      │
                      ▼
                ┌───────────┐
                │  UseCase  │
                └───────────┘
```

1. **User Action** → View captures event
2. **View** → Calls `interactions.onSendMessage()`
3. **Controller** → Updates state, generates Effect
4. **Page** → Processes Effect through Gateway
5. **Gateway** → Makes API call
6. **Page** → Calls Controller action with result
7. **Controller** → Updates state
8. **Presenter** → Transforms state to viewModel
9. **View** → Re-renders with new data

---

## Effect Pattern

Effects represent "things that need to happen" as data:

```typescript
// Effect types
export const EFFECT_TYPES = {
  PERSIST_USER_MESSAGE: "REQUEST_PERSIST_USER_MESSAGE",
  BEGIN_ASSISTANT_MESSAGE: "REQUEST_BEGIN_ASSISTANT_MESSAGE",
  GENERATE_ASSISTANT_RESPONSE: "REQUEST_GENERATE_ASSISTANT_RESPONSE",
  // ...
} as const;

// Effect definition
type Effect = {
  id: string;
  kind: typeof EFFECT_TYPES.PERSIST_USER_MESSAGE;
  payload: { convId: string; content: string };
};
```

**Benefits**:
- Testable (effects are data)
- Traceable (can log all effects)
- Decoupled (controller doesn't know about API)

---

## Framework Dependency Rules

| Layer | React | Next.js |
|-------|-------|---------|
| Domain | ❌ | ❌ |
| Application | ❌ | ❌ |
| Gateway (class) | ❌ | ❌ |
| Controller (hook) | ✅ | ❌ |
| Presenter (hook) | ✅ | ❌ |
| View | ✅ | ❌ |
| Page | ✅ | ✅ |

---

## Error Handling

### Error Classes (`interfaceAdapters/errors/`)

```typescript
// Base error
class AppError extends Error {
  readonly type: ErrorType;
  readonly statusCode?: number;
}

// Specific errors
class AuthenticationError extends AppError { } // 401
class AuthorizationError extends AppError { }  // 403
class ValidationError extends AppError { }     // 400
class NotFoundError extends AppError { }       // 404
class ServerError extends AppError { }         // 500+
class NetworkError extends AppError { }        // Connection failed
class TimeoutError extends AppError { }        // Request timeout
```

### Usage in Gateway

```typescript
if (!result.ok) {
  throw createErrorFromStatus(result.status, result.error);
}
```

### Usage in Page

```typescript
try {
  await processEffect(effect);
} catch (error) {
  controller.actions.reportExternalFailure(normalizeError(error));
  if (isAuthError(error)) {
    router.push("/login");
  }
}
```

---

## Testing Strategy

### UseCase Tests (Unit)

```typescript
// Mock Port
const mockPort = {
  createUserMessage: jest.fn().mockResolvedValue(testMessage),
};

// Test validation
it("rejects empty message", async () => {
  const result = await createUserMessageUseCase({ content: "" }, mockPort);
  expect(result.kind).toBe("failure");
  expect(mockPort.createUserMessage).not.toHaveBeenCalled();
});

// Test API call
it("calls port on valid input", async () => {
  const result = await createUserMessageUseCase({ content: "Hello" }, mockPort);
  expect(result.kind).toBe("success");
  expect(mockPort.createUserMessage).toHaveBeenCalled();
});
```

---

## File Structure Summary

```
src/
├── domain/                    # Domain entities (no React)
│   ├── core.ts
│   └── mbti.types.ts
│
├── application/               # Business logic (no React)
│   └── entitle/
│       ├── models.ts
│       ├── ports.ts
│       ├── useCases.ts
│       ├── messageUseCases.ts
│       ├── conversationUseCases.ts
│       └── feedbackUseCases.ts
│
├── interfaceAdapters/         # Bridge between domain and frameworks
│   ├── controllers/
│   │   ├── studentChat/
│   │   └── useMentorDashboardController.ts
│   ├── presenters/
│   │   ├── useStudentChatPresenter.ts
│   │   └── useMentorDashboardPresenter.ts
│   ├── gateways/api/
│   │   ├── StudentChatGateway.ts
│   │   └── MentorDashboardGateway.ts
│   ├── pages/entitle/
│   │   ├── StudentChatPage.tsx
│   │   ├── StudentChatRuntime.tsx
│   │   └── MentorDashboardPage.tsx
│   ├── hooks/
│   │   ├── useSessionGuard.ts
│   │   ├── useConversationUseCases.ts
│   │   └── useEffectQueue.ts
│   ├── errors/
│   │   └── index.ts
│   └── utils/
│       └── errors.ts
│
├── views/                     # Pure presentation (React)
│   ├── StudentChatView.tsx
│   └── MentorDashboardView.tsx
│
├── components/                # Shared UI components (Radix-based)
│   └── ui/
│
└── lib/                       # Utilities
    └── api.ts
```
