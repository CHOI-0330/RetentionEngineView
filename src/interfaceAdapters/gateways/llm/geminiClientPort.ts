"use client";

import type { LLMPort } from "../../../application/entitle/ports";
import type { Prompt } from "../../../application/entitle/models";

const DEFAULT_MODEL_ID = "gemini-2.0-flash-exp";
const CLIENT_TIMEOUT_MS = 30000;

interface GeminiLLMPortOptions {
  getConversationId?: () => string | null | undefined;
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
    const question = questionMessage?.content ?? "";
    const conversationId = this.options?.getConversationId?.() ?? undefined;

    const payload: Record<string, unknown> = {
      prompt: input.prompt,
      modelId: input.modelId ?? DEFAULT_MODEL_ID,
      runtimeId: input.runtimeId,
      question,
    };
    if (conversationId) {
      payload.conversationId = conversationId;
    }
    console.log("Sending request to /api/llm/gemini", {
      payload,
      timeoutMs: CLIENT_TIMEOUT_MS,
    });
    try {
      const response = await fetch("/api/llm/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      console.log(`Received response from /api/llm/gemini with status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || `Gemini request failed with status ${response.status}`);
      }

      const json = (await response.json()) as { text?: string; error?: string };
      if (json.error) {
        throw new Error(json.error);
      }
      if (!json.text) {
        throw new Error("Gemini response did not include text.");
      }
      return json.text;
    } finally {
      clearTimeout(timeoutId);
      if (abortSource) {
        abortSource.removeEventListener("abort", onAbort);
      }
    }
  }
}
