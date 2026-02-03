/**
 * LLM API Gateway
 *
 * LLMPort 인터페이스 구현
 */

import type { LLMPort } from "../../../application/entitle/ports/LLMPort";
import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";
import type { GatewayConfig, LLMGenerateResponse, SSEEvent } from "./types";

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

  /**
   * ストリーミング版 LLM応答生成
   * SSEイベントをコールバックで受信
   */
  async generateResponseStream(
    input: {
      question: string;
      conversationId: string;
      requireWebSearch?: boolean;
    },
    onEvent: (event: SSEEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await fetch("/api/llm/generate/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.accessToken
          ? { Authorization: `Bearer ${this.accessToken}` }
          : {}),
      },
      body: JSON.stringify(input),
      signal,
    });

    if (!response.ok || !response.body) {
      throw createErrorFromStatus(
        response.status,
        "ストリーミング接続に失敗しました"
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6)) as SSEEvent;
              onEvent(event);
            } catch {
              // JSON parse error — skip this line
            }
          }
        }
      }

      // 残りのバッファを処理
      if (buffer.startsWith("data: ")) {
        try {
          const event = JSON.parse(buffer.slice(6)) as SSEEvent;
          onEvent(event);
        } catch {
          // ignore
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
