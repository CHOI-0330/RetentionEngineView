import type { UseCaseFailure } from "../../application/entitle/models";

/**
 * 에러를 UseCaseFailure 형태로 정규화
 *
 * 여러 Page에서 중복되던 normalizeError 함수를 통합합니다.
 */
export function normalizeError(reason: unknown): UseCaseFailure {
  if (reason instanceof Error) {
    // 인증 에러 체크
    if (/Unauthorized|Forbidden|401|403/i.test(reason.message)) {
      return {
        kind: "Forbidden",
        message: reason.message,
      };
    }

    // 네트워크 에러 체크 (ValidationError로 매핑)
    if (/network|fetch|timeout/i.test(reason.message)) {
      return {
        kind: "ValidationError",
        message: `ネットワークエラー: ${reason.message}`,
      };
    }

    return {
      kind: "ValidationError",
      message: reason.message,
    };
  }

  return {
    kind: "ValidationError",
    message: String(reason),
  };
}

/**
 * 에러가 인증 관련인지 확인
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return /Unauthorized|Forbidden|401|403/i.test(error.message);
  }
  return false;
}

/**
 * 에러 메시지 추출
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "予期せぬエラーが発生しました";
}
