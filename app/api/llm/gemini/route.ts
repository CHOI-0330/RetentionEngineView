import { NextResponse, type NextRequest } from "next/server";

import { GoogleGenAI } from "@google/genai";

import type { Prompt } from "../../../../src/application/entitle/models";

const DEFAULT_MODEL_ID = process.env.GEMINI_MODEL_ID ?? "gemini-2.0-flash-exp";

type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

const mapPromptToContents = (prompt: Prompt): GeminiContent[] =>
  prompt.messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

export async function POST(request: NextRequest) {
  console.info("[Gemini API] Incoming request to /api/llm/gemini");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Gemini API] Missing GEMINI_API_KEY environment variable");
    return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
  }

  let body: { prompt: Prompt; modelId?: string };
  try {
    body = (await request.json()) as { prompt: Prompt; modelId?: string };
    console.info("[Gemini API] Parsed request body", {
      modelId: body.modelId ?? DEFAULT_MODEL_ID,
      messageCount: body.prompt?.messages?.length ?? 0,
      hasSystem: Boolean(body.prompt?.system),
    });
  } catch (error) {
    console.error("[Gemini API] Failed to parse request body", error);
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const client = new GoogleGenAI({ apiKey });
    const modelId = body.modelId ?? DEFAULT_MODEL_ID;
    console.info("[Gemini API] Sending request to Gemini", {
      modelId,
      messageRoles: body.prompt.messages.map((message) => message.role),
    });
    const result = await client.models.generateContent({
      model: modelId,
      contents: mapPromptToContents(body.prompt),
      ...(body.prompt.system
        ? { systemInstruction: { parts: [{ text: body.prompt.system }] } }
        : {}),
    });
    console.info("[Gemini API] Received response from Gemini", {
      resultKeys: Object.keys(result ?? {}),
      hasText: Boolean((result as { text?: unknown })?.text),
    });
    const text = result.text;
    if (!text) {
      console.error("[Gemini API] Gemini response did not include text", { modelId });
      return NextResponse.json({ error: "Gemini response did not include text." }, { status: 502 });
    }
    console.info("[Gemini API] Returning response to client", {
      modelId,
      textPreview: text.slice(0, 80),
      textLength: text.length,
    });
    return NextResponse.json({
      text,
      model: modelId,
    });
  } catch (error) {
    console.error("[Gemini API] Gemini request failed", error);
    const message = error instanceof Error ? error.message : "Gemini request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
