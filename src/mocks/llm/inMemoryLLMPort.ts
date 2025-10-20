import type { LLMPort } from "../../application/entitle/ports";
import type { MessageDelta, Prompt } from "../../application/entitle/models";

export class InMemoryLLMPort implements LLMPort {
  async *streamGenerate(_input: {
    prompt: Prompt;
    modelId?: string;
    runtimeId?: string;
    signal?: AbortSignal;
  }): AsyncIterable<MessageDelta> {
    const chunks = [
      "もちろんです。二次方程式の基本から整理しましょう。",
      " 一般形 ax^2 + bx + c = 0 では、解の公式を使って解を求められます。",
      " さらにグラフで見ると、放物線が x 軸と交わる点が解になります。",
    ];
    for (let index = 0; index < chunks.length; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      yield { text: chunks[index], seqNo: index + 1 };
    }
  }
}
