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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 500 });
  }

  let body: { prompt: Prompt; modelId?: string };
  try {
    body = (await request.json()) as { prompt: Prompt; modelId?: string };
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const client = new GoogleGenAI({ apiKey });
    const modelId = body.modelId ?? DEFAULT_MODEL_ID;
    const result = await client.models.generateContent({
      model: modelId,
      contents: mapPromptToContents(body.prompt),
      ...(body.prompt.system
        ? { systemInstruction: { parts: [{ text: body.prompt.system }] } }
        : {}),
    });
    const text = result.text;
    if (!text) {
      return NextResponse.json({ error: "Gemini response did not include text." }, { status: 502 });
    }
    return NextResponse.json({
      text,
      model: modelId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
