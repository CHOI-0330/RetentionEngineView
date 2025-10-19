"use client";

import type { LLMPort } from "../../../application/entitle/ports";
import type { MessageDelta, Prompt } from "../../../application/entitle/models";

const DEFAULT_MODEL_ID = "gemini-2.0-flash-exp";

export class GeminiLLMPort implements LLMPort {
  async *streamGenerate(input: { prompt: Prompt; modelId?: string; runtimeId?: string; signal?: AbortSignal }): AsyncIterable<MessageDelta> {
    console.info("[Gemini Client] Sending prompt to /api/llm/gemini", {
      modelId: input.modelId ?? DEFAULT_MODEL_ID,
      messageCount: input.prompt.messages.length,
      runtimeId: input.runtimeId,
    });
    const response = await fetch("/api/llm/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: input.prompt,
        modelId: input.modelId ?? DEFAULT_MODEL_ID,
        runtimeId: input.runtimeId,
      }),
      signal: input.signal,
    });

    console.info("[Gemini Client] Received response", {
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[Gemini Client] Request failed", {
        status: response.status,
        errorText: errorText.slice(0, 200),
      });
      throw new Error(errorText || `Gemini request failed with status ${response.status}`);
    }

    const json = (await response.json()) as { text?: string; error?: string };
    console.info("[Gemini Client] Parsed response JSON", {
      hasText: Boolean(json.text),
      hasError: Boolean(json.error),
    });
    if (json.error) {
      console.error("[Gemini Client] Response contained error", { error: json.error });
      throw new Error(json.error);
    }
    if (!json.text) {
      console.warn("[Gemini Client] Response JSON did not include text");
      return;
    }
    console.info("[Gemini Client] Yielding response text", {
      textPreview: json.text.slice(0, 80),
      textLength: json.text.length,
    });
    yield { text: json.text, seqNo: 1 };
  }
}
