"use client";

import type { LLMPort } from "../../../application/entitle/ports";
import type { Prompt } from "../../../application/entitle/models";
import { apiFetch } from "../../../lib/apiClient";

const CLIENT_TIMEOUT_MS = 30000;

interface GeminiLLMPortOptions {
  getConversationId?: () => string | null | undefined;
  getAccessToken?: () => string | null | undefined;
}

export class GeminiLLMPort implements LLMPort {
  constructor(private readonly options?: GeminiLLMPortOptions) {}

  async generate(input: { prompt: Prompt; modelId?: string; runtimeId?: string; signal?: AbortSignal }): Promise<string> {
    const controller = new AbortController();
    const abortSource = input.signal;
    const onAbort = () => controller.abort();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    if (abortSource) {
      abortSource.addEventListener("abort", onAbort);
    }

    const questionMessage = [...input.prompt.messages].reverse().find((message) => message.role === "user");
    const question = questionMessage?.content?.trim() ?? "";
    const conversationId = this.options?.getConversationId?.() ?? undefined;
    if (!conversationId) {
      throw new Error("Conversation ID is required to request assistant responses.");
    }
    if (!question) {
      throw new Error("Question must not be empty.");
    }

    console.log("Sending request to backend /llm/generate", {
      questionLength: question.length,
      conversationId,
      timeoutMs: CLIENT_TIMEOUT_MS,
    });
    try {
      const { answer } = await apiFetch<{ answer: string }>(
        "/llm/generate",
        {
          method: "POST",
          body: JSON.stringify({
            question,
            conversationId,
          }),
          signal: controller.signal,
        },
        this.options?.getAccessToken?.() ?? undefined
      );
      if (!answer) {
        throw new Error("LLM backend response did not include answer.");
      }
      return answer;
    } finally {
      clearTimeout(timeoutId);
      if (abortSource) {
        abortSource.removeEventListener("abort", onAbort);
      }
    }
  }
}
