import { NextResponse } from "next/server";

const scrubKey = (key?: string) => {
  if (!key) {
    return null;
  }
  if (key.length <= 6) {
    return "***";
  }
  return `${key.slice(0, 3)}***${key.slice(-2)}`;
};

export async function GET() {
  const enableFlag = process.env.NEXT_PUBLIC_ENABLE_GEMINI === "1";
  const apiKey = process.env.GEMINI_API_KEY ?? "";

  const defaultModel = process.env.GEMINI_MODEL_ID ?? "gemini-2.0-flash-exp";

  return NextResponse.json({
    geminiEnabled: enableFlag,
    apiKeyConfigured: Boolean(apiKey),
    apiKeyPreview: scrubKey(apiKey),
    endpoint: "https://generativelanguage.googleapis.com",
    modelDefault: defaultModel,
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
