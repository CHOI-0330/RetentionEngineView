import type { Conversation, FeedbackAuthorRole, Message, MentorAssignment, User } from "../../type/core";
import type {
  MessageDelta,
  Prompt,
  PromptMessage,
  QuerySpec,
  StreamAssistantRequest,
  UseCaseFailure,
  UseCaseFailureKind,
  UseCaseResult,
  ValidatedFeedback,
} from "./models";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_FEEDBACK_LENGTH = 2000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_CONVERSATION_TITLE_LENGTH = 120;

const success = <T>(value: T): UseCaseResult<T> => ({ kind: "success", value });

const failure = (kind: UseCaseFailureKind, message: string): UseCaseResult<never> => ({
  kind: "failure",
  error: { kind, message },
});

export function createUserMessageUseCase(args: {
  user: User;
  conversation: Conversation;
  content: string;
}): UseCaseResult<{ kind: "READY_TO_PERSIST"; convId: string; authorId: string; content: string }> {
  const trimmed = args.content.trim();
  if (trimmed.length === 0) {
    return failure("ValidationError", "Message content must not be empty.");
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return failure("ValidationError", "Message content exceeds the allowed length.");
  }
  if (args.user.userId !== args.conversation.ownerId) {
    return failure("Forbidden", "User is not allowed to post in this conversation.");
  }
  return success({
    kind: "READY_TO_PERSIST",
    convId: args.conversation.convId,
    authorId: args.user.userId,
    content: trimmed,
  });
}

export function createConversationUseCase(args: {
  requester: Pick<User, "userId" | "role">;
  title: string;
  mentorId?: string | null;
  allowedMentorIds: string[];
}): UseCaseResult<{ title: string; mentorId?: string | null }> {
  if (args.requester.role !== "NEW_HIRE") {
    return failure("Forbidden", "Only new hires can create conversations.");
  }

  const title = args.title.trim();
  if (title.length === 0) {
    return failure("ValidationError", "Conversation title must not be empty.");
  }
  if (title.length > MAX_CONVERSATION_TITLE_LENGTH) {
    return failure(
      "ValidationError",
      `Conversation title must be ${MAX_CONVERSATION_TITLE_LENGTH} characters or fewer.`
    );
  }

  const mentorId = args.mentorId ?? null;
  if (args.allowedMentorIds.length > 0) {
    if (!mentorId) {
      return failure("ValidationError", "A mentor must be selected for this conversation.");
    }
    if (!args.allowedMentorIds.includes(mentorId)) {
      return failure("ValidationError", "Selected mentor is not available.");
    }
    return success({ title, mentorId });
  }

  if (mentorId) {
    return failure("ValidationError", "Mentor cannot be selected for this conversation.");
  }

  return success({ title, mentorId: null });
}

export function buildPromptForConversationUseCase(args: {
  user: User;
  conversation: Conversation;
  messages: Message[];
  question: string;
  historyWindow: number;
}): UseCaseResult<Prompt> {
  const trimmedQuestion = args.question.trim();
  if (trimmedQuestion.length === 0) {
    return failure("ValidationError", "Question must not be empty.");
  }
  if (args.historyWindow < 0) {
    return failure("ValidationError", "historyWindow must be zero or greater.");
  }
  if (args.user.userId !== args.conversation.ownerId) {
    return failure("Forbidden", "User is not allowed to access this conversation.");
  }

  const sorted = [...args.messages].sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return a.msgId.localeCompare(b.msgId);
    }
    return a.createdAt < b.createdAt ? -1 : 1;
  });
  const history = args.historyWindow === 0 ? [] : sorted.slice(-args.historyWindow);

  const messages: PromptMessage[] = [
    ...(args.conversation.title
      ? [
          {
            role: "system" as const,
            content: `Conversation topic: ${args.conversation.title}`,
          },
        ]
      : []),
    ...history.map<PromptMessage>((message) => ({
      role: message.role === "ASSISTANT" ? "assistant" : "user",
      content: message.content,
    })),
    {
      role: "user",
      content: trimmedQuestion,
    },
  ];

  return success({
    system: "You are a helpful mentor assisting a new hire.",
    messages,
  });
}

export function streamAssistantAnswerUseCase(args: {
  prompt: Prompt;
  modelId?: string;
  runtimeId?: string;
}): StreamAssistantRequest {
  return {
    kind: "REQUEST_STREAM",
    prompt: args.prompt,
    modelId: args.modelId,
    runtimeId: args.runtimeId,
  };
}

export function beginAssistantMessageUseCase(args: {
  conversation: Conversation;
  requester: User;
}): UseCaseResult<{ kind: "BEGIN"; convId: string }> {
  if (args.requester.userId !== args.conversation.ownerId) {
    return failure("Forbidden", "User is not allowed to request an assistant response for this conversation.");
  }
  return success({ kind: "BEGIN", convId: args.conversation.convId });
}

export function appendAssistantDeltaUseCase(args: {
  message: Message;
  delta: MessageDelta;
  lastSeqNo?: number;
}): UseCaseResult<{ message: Message; appended: MessageDelta }> {
  if (args.message.role !== "ASSISTANT") {
    return failure("ValidationError", "Only ASSISTANT messages can accept deltas.");
  }
  if (args.lastSeqNo !== undefined && args.delta.seqNo <= args.lastSeqNo) {
    return failure("ValidationError", "Sequence number is invalid.");
  }
  if (args.delta.text.length === 0) {
    return failure("ValidationError", "Delta text must not be empty.");
  }

  if (!args.message.status || args.message.status === "DRAFT") {
    const nextMessage: Message = {
      ...args.message,
      status: "PARTIAL",
      content: args.delta.text,
    };
    return success({ message: nextMessage, appended: args.delta });
  }

  if (args.message.status === "PARTIAL") {
    const nextMessage: Message = {
      ...args.message,
      content: args.message.content + args.delta.text,
    };
    return success({ message: nextMessage, appended: args.delta });
  }

  return failure("ValidationError", "Completed messages do not accept additional deltas.");
}

export function finalizeAssistantMessageUseCase(args: {
  message: Message;
  finalText: string;
}): UseCaseResult<Message> {
  if (args.message.role !== "ASSISTANT") {
    return failure("ValidationError", "Only ASSISTANT messages can be finalized.");
  }
  if (args.message.status === "CANCELLED") {
    return failure("ValidationError", "Cancelled messages cannot be finalized.");
  }
  const trimmed = args.finalText.trim();
  if (trimmed.length === 0) {
    return failure("ValidationError", "Final text must not be empty.");
  }

  return success({
    ...args.message,
    status: "DONE",
    content: trimmed,
  });
}

export function cancelAssistantMessageUseCase(args: { message: Message }): UseCaseResult<Message> {
  if (args.message.role !== "ASSISTANT") {
    return failure("ValidationError", "Only ASSISTANT messages can be cancelled.");
  }
  if (args.message.status === "DONE") {
    return failure("ValidationError", "Completed messages cannot be cancelled.");
  }
  return success({
    ...args.message,
    status: "CANCELLED",
  });
}

export function listConversationMessagesUseCase(args: {
  requester: User;
  conversation: Conversation;
  mentorAssignments?: MentorAssignment[];
  cursor?: string;
  limit?: number;
}): UseCaseResult<QuerySpec> {
  if (!canAccessConversation(args.requester, args.conversation, args.mentorAssignments)) {
    return failure("Forbidden", "User is not allowed to read this conversation.");
  }
  return success({
    convId: args.conversation.convId,
    cursor: args.cursor,
    limit: normalizeLimit(args.limit),
  });
}

export function listMessageFeedbacksUseCase(args: {
  requester: User;
  conversation: Conversation;
  targetMessage: Message;
  mentorAssignments?: MentorAssignment[];
  cursor?: string;
  limit?: number;
}): UseCaseResult<QuerySpec> {
  if (!canAccessConversation(args.requester, args.conversation, args.mentorAssignments)) {
    return failure("Forbidden", "User is not allowed to read feedback for this conversation.");
  }
  if (args.targetMessage.convId !== args.conversation.convId) {
    return failure("ValidationError", "Target message does not belong to the conversation.");
  }
  return success({
    convId: args.conversation.convId,
    msgId: args.targetMessage.msgId,
    cursor: args.cursor,
    limit: normalizeLimit(args.limit),
  });
}

export function validateFeedbackRulesUseCase(args: {
  requester: User;
  conversation: Conversation;
  targetMessage: Message;
  content: string;
  mentorAssignments?: MentorAssignment[];
}): UseCaseResult<ValidatedFeedback> {
  if (args.targetMessage.role !== "ASSISTANT") {
    return failure("ValidationError", "Feedback can be written only for assistant messages.");
  }

  const trimmed = args.content.trim();
  if (trimmed.length === 0) {
    return failure("ValidationError", "Feedback content must not be empty.");
  }
  if (trimmed.length > MAX_FEEDBACK_LENGTH) {
    return failure("ValidationError", "Feedback content exceeds the allowed length.");
  }

  let authorRole: FeedbackAuthorRole;
  if (args.requester.userId === args.conversation.ownerId) {
    authorRole = "NEW_HIRE";
  } else {
    const activeAssignment =
      args.mentorAssignments?.some(
        (assignment) =>
          assignment.mentorId === args.requester.userId &&
          assignment.newhireId === args.conversation.ownerId &&
          assignment.revokedAt == null
      ) ?? false;
    if (!activeAssignment) {
      return failure("Forbidden", "User is not allowed to write feedback for this conversation.");
    }
    authorRole = "MENTOR";
  }

  return success({
    targetMsgId: args.targetMessage.msgId,
    authorId: args.requester.userId,
    authorRole,
    content: trimmed,
  });
}

export function createFeedbackUseCase(args: {
  validated: ValidatedFeedback;
}): { kind: "READY_TO_PERSIST"; payload: ValidatedFeedback } {
  return {
    kind: "READY_TO_PERSIST",
    payload: args.validated,
  };
}

const canAccessConversation = (
  requester: User,
  conversation: Conversation,
  mentorAssignments?: MentorAssignment[]
): boolean => {
  if (requester.userId === conversation.ownerId) {
    return true;
  }

  if (requester.role !== "MENTOR" || !mentorAssignments) {
    return false;
  }

  return mentorAssignments.some(
    (assignment) =>
      assignment.mentorId === requester.userId &&
      assignment.newhireId === conversation.ownerId &&
      assignment.revokedAt == null
  );
};

const normalizeLimit = (limit?: number) => {
  if (limit === undefined) {
    return DEFAULT_PAGE_SIZE;
  }
  const clamped = Math.max(1, Math.min(Math.floor(limit), MAX_PAGE_SIZE));
  return Number.isNaN(clamped) ? DEFAULT_PAGE_SIZE : clamped;
};
