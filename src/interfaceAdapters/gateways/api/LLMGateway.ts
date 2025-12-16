/**
 * LLM API Gateway
 *
 * LLMPort 인터페이스 구현
 */

import type { LLMPort } from "../../../application/entitle/ports/LLMPort";
import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";
import type { GatewayConfig, LLMGenerateResponse } from "./types";

export class LLMGateway implements LLMPort {
  private accessToken?: string;

  constructor(config: GatewayConfig = {}) {
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  async generateResponse(input: {
    question: string;
    conversationId: string;
    modelId?: string;
    runtimeId?: string;
    requireWebSearch?: boolean;
  }): Promise<LLMGenerateResponse> {
    const result = await apiFetch<LLMGenerateResponse>("/api/llm/generate", {
      method: "POST",
      body: input,
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }
}
