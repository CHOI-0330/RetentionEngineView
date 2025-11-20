import { NextResponse, type NextRequest } from "next/server";

import type { Prompt } from "../../../../src/application/entitle/models";

const BACKEND_ENDPOINT = "/llm/generate";

const extractLatestQuestion = (prompt: Prompt): string => {
  const lastUserMessage = [...prompt.messages].reverse().find((message) => message.role === "user");
  return lastUserMessage?.content?.trim() ?? "";
};

export async function POST(request: NextRequest) {
  console.log("Received request to /api/llm/gemini");
  const backendBaseUrl = process.env.LLM_BACKEND_BASE_URL;
  if (!backendBaseUrl) {
    return NextResponse.json({ error: "LLM backend URL is not configured." }, { status: 500 });
  }

  let body: { prompt: Prompt; question?: string; conversationId?: string };
  try {
    body = (await request.json()) as { prompt: Prompt; question?: string; conversationId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.prompt?.messages?.length) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const providedQuestion = typeof body.question === "string" ? body.question.trim() : "";
  const question = providedQuestion || extractLatestQuestion(body.prompt);
  if (!question) {
    return NextResponse.json({ error: "question must not be empty." }, { status: 400 });
  }

  const conversationId =
    typeof body.conversationId === "string" && body.conversationId.trim().length > 0
      ? body.conversationId.trim()
      : undefined;

  const headers = new Headers({
    "Content-Type": "application/json",
  });
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("Authorization", authorization);
  }
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const backendUrl = `${backendBaseUrl.replace(/\/$/, "")}${BACKEND_ENDPOINT}`;
  const payload: { question: string; conversationId?: string } = { question };
  if (conversationId) {
    payload.conversationId = conversationId;
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl, {
      method: "POST",
      credentials: 'include',
      headers,
      body: JSON.stringify(payload),
    });
    console.log(`LLM backend responded with status ${backendResponse.status}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reach LLM backend.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!backendResponse.ok) {
    let errorMessage = `LLM backend request failed with status ${backendResponse.status}.`;
    try {
      const json = (await backendResponse.json()) as { error?: string };
      if (json.error) {
        errorMessage = json.error;
      }
    } catch {
      const text = await backendResponse.text().catch(() => "");
      if (text) {
        errorMessage = text;
      }
    }
    return NextResponse.json({ error: errorMessage }, { status: backendResponse.status });
  }

  const data = (await backendResponse.json()) as { answer?: string };
  if (!data.answer) {
    return NextResponse.json({ error: "LLM backend response did not include answer." }, { status: 502 });
  }

  return NextResponse.json({ text: data.answer });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
