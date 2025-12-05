/**
 * StudentDashboard UseCases
 *
 * Dashboard에서 사용되는 비즈니스 로직 검증
 */

import type { User } from "../../domain/core";
import type { UseCaseResult, UseCaseFailureKind } from "./models";

const MAX_CONVERSATION_TITLE_LENGTH = 120;

const success = <T>(value: T): UseCaseResult<T> => ({ kind: "success", value });

const failure = (kind: UseCaseFailureKind, message: string): UseCaseResult<never> => ({
  kind: "failure",
  error: { kind, message },
});

/**
 * 대화 목록 조회 권한 검증
 */
export function listConversationsUseCase(args: {
  requester: Pick<User, "userId" | "role">;
}): UseCaseResult<{ userId: string }> {
  if (args.requester.role !== "NEW_HIRE") {
    return failure("Forbidden", "新入社員のみが会話リストを閲覧できます。");
  }

  return success({ userId: args.requester.userId });
}

/**
 * 대화 생성 검증 (Dashboard용 - 간소화 버전)
 */
export function createConversationForDashboardUseCase(args: {
  requester: Pick<User, "userId" | "role">;
  title: string;
}): UseCaseResult<{ title: string }> {
  if (args.requester.role !== "NEW_HIRE") {
    return failure("Forbidden", "新入社員のみが会話を作成できます。");
  }

  const title = args.title.trim();
  if (title.length === 0) {
    return failure("ValidationError", "会話のタイトルを入力してください。");
  }
  if (title.length > MAX_CONVERSATION_TITLE_LENGTH) {
    return failure(
      "ValidationError",
      `タイトルは${MAX_CONVERSATION_TITLE_LENGTH}文字以内で入力してください。`
    );
  }

  return success({ title });
}

/**
 * 대화 삭제 권한 검증
 */
export function deleteConversationUseCase(args: {
  requester: Pick<User, "userId" | "role">;
  convId: string;
}): UseCaseResult<{ convId: string }> {
  if (args.requester.role !== "NEW_HIRE") {
    return failure("Forbidden", "新入社員のみが会話を削除できます。");
  }

  if (!args.convId || typeof args.convId !== "string") {
    return failure("ValidationError", "会話IDが指定されていません。");
  }

  return success({ convId: args.convId });
}
