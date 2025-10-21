"use client";

import type { LLMPort } from "../../../application/entitle/ports";
import type { Prompt } from "../../../application/entitle/models";

const DEFAULT_MODEL_ID = "gemini-2.0-flash-exp";

export class GeminiLLMPort implements LLMPort {
  async generate(input: { prompt: Prompt; modelId?: string; runtimeId?: string; signal?: AbortSignal }): Promise<string> {
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
  }
}
