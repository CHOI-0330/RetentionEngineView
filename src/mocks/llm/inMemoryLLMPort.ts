import type { LLMPort } from "../../application/entitle/ports";
import type { Prompt } from "../../application/entitle/models";

export class InMemoryLLMPort implements LLMPort {
  async generate(_input: {
    prompt: Prompt;
    modelId?: string;
    runtimeId?: string;
    signal?: AbortSignal;
  }): Promise<string> {
    console.log("[InMemoryLLMPort] generate called", { promptPreview: _input.prompt?.messages?.slice(-3) });
    const chunks = [
      "もちろんです。二次方程式の基本から整理しましょう。",
      " 一般形 ax^2 + bx + c = 0 では、解の公式を使って解を求められます。",
      " さらにグラフで見ると、放物線が x 軸と交わる点が解になります。",
    ];
    let combined = "";
    for (let index = 0; index < chunks.length; index += 1) {
      if (_input.signal?.aborted) {
        console.warn("[InMemoryLLMPort] generate aborted before chunk", index);
        throw new Error("Generation aborted");
      }
      console.log(`[InMemoryLLMPort] emitting chunk ${index + 1}/${chunks.length}`);
      await new Promise((resolve) => setTimeout(resolve, 200));
      combined += chunks[index];
    }
    console.log("[InMemoryLLMPort] generate completed", { length: combined.length });
    return combined;
  }
}
