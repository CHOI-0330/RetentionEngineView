"use client";

import { useMemo } from "react";
import {
  StudentChatGateway,
  LLMGateway,
  type StudentChatBootstrap,
  type ConversationOption,
  type MentorOption,
} from "../gateways/api/StudentChatGateway";

export type { StudentChatBootstrap, ConversationOption, MentorOption };

export interface UseStudentChatGatewayOptions {
  accessToken?: string;
}

export interface UseStudentChatGatewayResult {
  gateway: StudentChatGateway;
  llmGateway: LLMGateway;
}

/**
 * StudentChat Gateway 훅
 *
 * Gateway 인스턴스를 생성하고 accessToken이 변경되면 업데이트합니다.
 * Page 컴포넌트에서 API 호출 로직을 분리하기 위해 사용합니다.
 */
export function useStudentChatGateway(
  options: UseStudentChatGatewayOptions = {}
): UseStudentChatGatewayResult {
  const { accessToken } = options;

  const gateway = useMemo(() => {
    return new StudentChatGateway({ accessToken });
  }, [accessToken]);

  const llmGateway = useMemo(() => {
    return new LLMGateway({ accessToken });
  }, [accessToken]);

  return { gateway, llmGateway };
}
