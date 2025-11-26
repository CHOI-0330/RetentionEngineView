"use client";

import type { LLMPort } from "../../../application/entitle/ports";
import type { Prompt } from "../../../application/entitle/models";

interface GeminiLLMPortOptions {
  getConversationId?: () => string | null | undefined;
  getAccessToken?: () => string | null | undefined;
}

export class GeminiLLMPort implements LLMPort {
  constructor(private readonly options?: GeminiLLMPortOptions) {}

  async generate(input: { prompt: Prompt; modelId?: string; runtimeId?: string; signal?: AbortSignal }): Promise<string> {
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
    });
    const accessToken = this.options?.getAccessToken?.() ?? undefined;
    const response = await fetch("/api/llm/generate", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        question,
        conversationId,
        modelId: input.modelId,
        runtimeId: input.runtimeId,
      }),
      signal: input.signal,
    });
    const raw = await response.text();
    let payload: any = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      const message = payload?.error ?? raw ?? "LLM backend request failed.";
      throw new Error(message);
    }
    const answer = payload?.answer;
    if (!answer || typeof answer !== "string") {
      throw new Error("LLM backend response did not include answer.");
    }
    return answer;
  }
}
