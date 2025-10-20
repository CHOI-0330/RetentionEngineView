import type { ValidatedFeedback } from "../../src/application/entitle/models";
import type {
  FeedbackLookupPort,
  FeedbackPort,
  LLMPort,
  MentorAssignmentPort,
  MentorDashboardPort,
  MessagePort,
  StudentSummary,
} from "../../src/application/entitle/ports";
import { GeminiLLMPort } from "../../src/interfaceAdapters/gateways/llm/geminiClientPort";
import { InMemoryLLMPort } from "../../src/mocks/llm/inMemoryLLMPort";
import type {
  Conversation,
  Feedback,
  LLMRuntime,
  Message,
  MentorAssignment,
  ModelConfig,
  User,
} from "../../src/type/core";

const createId = (() => {
  let counter = 0;
  return (prefix: string) => `${prefix}-${Date.now()}-${counter++}`;
})();

interface Store {
  conversation: Conversation;
  messages: Message[];
  feedbacks: Record<string, Feedback[]>;
  users: Record<string, User>;
  mentorAssignments: MentorAssignment[];
}

class InMemoryMessagePort implements MessagePort {
  constructor(private readonly store: Store) {}

  async createUserMessage(input: { convId: string; authorId: string; content: string }): Promise<Message> {
    const message: Message = {
      msgId: createId("msg"),
      convId: input.convId,
      role: "NEW_HIRE",
      content: input.content,
      createdAt: new Date().toISOString(),
    };
    this.store.messages.push(message);
    return message;
  }

  async beginAssistantMessage(convId: string): Promise<Message> {
    const message: Message = {
      msgId: createId("msg"),
      convId,
      role: "ASSISTANT",
      content: "",
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    };
    this.store.messages.push(message);
    return message;
  }

  async finalizeAssistantMessage(input: { msgId: string; finalText: string }): Promise<Message> {
    const message = this.store.messages.find((entry) => entry.msgId === input.msgId);
    if (!message) {
      throw new Error("Assistant message not found");
    }
    message.status = "DONE";
    message.content = input.finalText;
    return message;
  }

  async cancelAssistantMessage(msgId: string): Promise<Message> {
    const message = this.store.messages.find((entry) => entry.msgId === msgId);
    if (!message) {
      throw new Error("Assistant message not found");
    }
    message.status = "CANCELLED";
    return message;
  }

  async listConversationMessages(input: {
    convId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{ items: Message[]; nextCursor?: string; lastSeqNo?: number }> {
    const sorted = [...this.store.messages]
      .filter((message) => message.convId === input.convId)
      .sort((a, b) => {
        if (a.createdAt === b.createdAt) {
          return a.msgId.localeCompare(b.msgId);
        }
        return a.createdAt < b.createdAt ? -1 : 1;
      });

    if (!input.cursor) {
      return {
        items: sorted.slice(-1 * (input.limit ?? 50)),
        nextCursor: sorted.length > (input.limit ?? 50) ? sorted[0]?.msgId : undefined,
      };
    }

    const cursorIndex = sorted.findIndex((message) => message.msgId === input.cursor);
    if (cursorIndex <= 0) {
      return { items: sorted.slice(0, cursorIndex), nextCursor: undefined };
    }
    const start = Math.max(0, cursorIndex - (input.limit ?? 50));
    return {
      items: sorted.slice(start, cursorIndex),
      nextCursor: start > 0 ? sorted[start - 1]?.msgId : undefined,
    };
  }
}

class InMemoryFeedbackPort implements FeedbackPort {
  constructor(private readonly store: Store) {}

  async createFeedback(input: ValidatedFeedback & { visibility?: "ALL" | "OWNER_ONLY" | "MENTOR_ONLY" }): Promise<Feedback> {
    const list = this.store.feedbacks[input.targetMsgId] ?? [];
    if (list.length > 0) {
      throw new Error("Feedback already exists for this message.");
    }
    const feedback: Feedback = {
      fbId: createId("fb"),
      targetMsgId: input.targetMsgId,
      authorId: input.authorId,
      authorRole: input.authorRole,
      content: input.content,
      createdAt: new Date().toISOString(),
      visibility: input.visibility ?? "ALL",
    };
    this.store.feedbacks[input.targetMsgId] = [feedback];
    return feedback;
  }

  async updateFeedback(input: { feedbackId: string; content: string }): Promise<Feedback> {
    for (const [msgId, feedbacks] of Object.entries(this.store.feedbacks)) {
      const index = feedbacks.findIndex((entry) => entry.fbId === input.feedbackId);
      if (index >= 0) {
        const updated: Feedback = {
          ...feedbacks[index],
          content: input.content,
          updatedAt: new Date().toISOString(),
        };
        this.store.feedbacks[msgId] = [updated];
        return updated;
      }
    }
    throw new Error("Feedback not found.");
  }

  async listFeedbacks(input: { msgId: string; cursor?: string; limit?: number }): Promise<{
    items: Feedback[];
    nextCursor?: string;
  }> {
    const items = [...(this.store.feedbacks[input.msgId] ?? [])].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1
    );
    return { items, nextCursor: undefined };
  }
}

class StaticMentorAssignmentPort implements MentorAssignmentPort {
  constructor(private readonly store: Store) {}

  async listActiveAssignments(input: { mentorId?: string; newhireId?: string }): Promise<MentorAssignment[]> {
    return this.store.mentorAssignments.filter((assignment) => {
      if (assignment.revokedAt != null) {
        return false;
      }
      if (input.mentorId && assignment.mentorId !== input.mentorId) {
        return false;
      }
      if (input.newhireId && assignment.newhireId !== input.newhireId) {
        return false;
      }
      return true;
    });
  }
}

class StaticFeedbackLookupPort implements FeedbackLookupPort {
  constructor(private readonly store: Store) {}

  async getUserDisplayName(userId: string): Promise<string | null> {
    return this.store.users[userId]?.displayName ?? null;
  }
}

class InMemoryMentorDashboardPort implements MentorDashboardPort {
  constructor(private readonly store: Store) {}

  async listStudentSummaries(input: { mentorId: string }): Promise<StudentSummary[]> {
    const assignments = this.store.mentorAssignments.filter(
      (assignment) => assignment.mentorId === input.mentorId && assignment.revokedAt == null
    );
    const messages = this.store.messages.filter((message) => message.convId === this.store.conversation.convId);
    const lastMessage = [...messages].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
    const lastActivityAt = lastMessage?.createdAt ?? this.store.conversation.lastActiveAt;
    return assignments.map((assignment) => {
      const needsReview = Boolean(
        lastMessage &&
          lastMessage.role === "ASSISTANT" &&
          !(this.store.feedbacks[lastMessage.msgId]?.length ?? 0)
      );
      return {
        newhire: this.store.users[assignment.newhireId],
        conversation: this.store.conversation,
        recentMessage: lastMessage,
        needsReview,
        totalChats: messages.length,
        lastActivityAt,
      } satisfies StudentSummary;
    });
  }

  async submitFeedbackQuality(): Promise<void> {
    return;
  }
}

export interface DevEntitleAdapters {
  conversation: Conversation;
  newHire: User;
  mentor: User;
  messagePort: MessagePort;
  feedbackPort: FeedbackPort;
  mentorAssignmentPort: MentorAssignmentPort;
  feedbackLookupPort: FeedbackLookupPort;
  llmPort: LLMPort;
  dashboardPort: MentorDashboardPort;
  initialMessages: Message[];
  initialFeedbacks: Record<string, Feedback[]>;
  runtimes: LLMRuntime[];
  modelConfigs: ModelConfig[];
  replaceConversation?: (conversation: Conversation) => void;
}

export const createDevEntitleAdapters = (): DevEntitleAdapters => {
  const now = new Date();
  const users: Record<string, User> = {
    "user-nh": {
      userId: "user-nh",
      role: "NEW_HIRE",
      displayName: "新入社員 さくら",
      email: "sakura@example.com",
      createdAt: now.toISOString(),
    },
    "user-mentor": {
      userId: "user-mentor",
      role: "MENTOR",
      displayName: "田中 メンター",
      email: "tanaka@example.com",
      createdAt: now.toISOString(),
    },
  };

  const conversation: Conversation = {
    convId: "conv-1",
    ownerId: users["user-nh"].userId,
    title: "数学 - 二次方程式",
    state: "ACTIVE",
    createdAt: now.toISOString(),
    lastActiveAt: now.toISOString(),
  };

  const messages: Message[] = [
    {
      msgId: "msg-1",
      convId: conversation.convId,
      role: "NEW_HIRE",
      content: "二次方程式の解の意味について教えてください。",
      createdAt: new Date(now.getTime() - 6 * 60 * 1000).toISOString(),
    },
    {
      msgId: "msg-2",
      convId: conversation.convId,
      role: "ASSISTANT",
      status: "DONE",
      content: "二次方程式 ax^2 + bx + c = 0 の解は、放物線が x 軸と交わる点です。",
      createdAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
    },
  ];

  const feedbacks: Record<string, Feedback[]> = {
    "msg-2": [
      {
        fbId: "fb-1",
        targetMsgId: "msg-2",
        authorId: users["user-mentor"].userId,
        authorRole: "MENTOR",
        content: "グラフの図を示すことでさらに理解が深まります。",
        createdAt: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
        visibility: "ALL",
      },
    ],
  };

  const mentorAssignments: MentorAssignment[] = [
    {
      mentorId: users["user-mentor"].userId,
      newhireId: users["user-nh"].userId,
      createdAt: now.toISOString(),
    },
  ];

  const store: Store = {
    conversation,
    messages: [...messages],
    feedbacks: { ...feedbacks },
    users,
    mentorAssignments,
  };

  const messagePort = new InMemoryMessagePort(store);
  const feedbackPort = new InMemoryFeedbackPort(store);
  const mentorAssignmentPort = new StaticMentorAssignmentPort(store);
  const feedbackLookupPort = new StaticFeedbackLookupPort(store);
  const shouldUseGemini = typeof process !== "undefined" && process.env.NEXT_PUBLIC_ENABLE_GEMINI === "1";
  if (shouldUseGemini) {
    console.info("[LLM] Gemini gateway enabled. Responses will be proxied via /api/llm/gemini.");
  } else {
    console.info("[LLM] Using in-memory LLM mock. Set NEXT_PUBLIC_ENABLE_GEMINI=1 to enable Gemini gateway.");
  }
  const llmPort: LLMPort = shouldUseGemini ? new GeminiLLMPort() : new InMemoryLLMPort();
  const dashboardPort = new InMemoryMentorDashboardPort(store);

  const runtimes: LLMRuntime[] = [
    {
      runtimeId: "runtime-mock",
      kind: "remote",
      adapter: "mock",
      endpoint: "https://example.com",
      createdAt: now.toISOString(),
    },
  ];

  const modelConfigs: ModelConfig[] = [
    {
      modelId: "model-mock",
      runtimeId: runtimes[0].runtimeId,
      name: "mock-model",
      params: { temperature: 0.7 },
      isDefault: true,
      createdAt: now.toISOString(),
    },
  ];

  const adapters: DevEntitleAdapters = {
    conversation,
    newHire: users["user-nh"],
    mentor: users["user-mentor"],
    messagePort,
    feedbackPort,
    mentorAssignmentPort,
    feedbackLookupPort,
    llmPort,
    dashboardPort,
    initialMessages: [...messages],
    initialFeedbacks: { ...feedbacks },
    runtimes,
    modelConfigs,
  };

  adapters.replaceConversation = (nextConversation: Conversation) => {
    store.conversation = nextConversation;
    store.messages = [];
    store.feedbacks = {};
    adapters.conversation = nextConversation;
    adapters.initialMessages = [];
    adapters.initialFeedbacks = {};
  };

  return adapters;
};
