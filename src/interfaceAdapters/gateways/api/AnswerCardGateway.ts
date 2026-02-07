/**
 * Answer Card API Gateway
 *
 * 回答カード作成・管理機能のAPIクライアント
 * 回答はナレッジカード（KC）形式で保存される
 */

import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";
import type { GatewayConfig } from "./types";

// ============================================
// 型定義
// ============================================

/** AI対話で生成された回答カード候補（KC形式） */
export interface AnswerCardCandidate {
  title: string;
  situation: string;
  knowhow: string;
  precaution: string;
  tags: string[];
  confidence: number;
  importance?: string;
  example?: string;
}

/** チャット履歴の1メッセージ */
export interface ACChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** POST /answer-cards/generate リクエスト */
export interface GenerateAnswerRequest {
  mentorInput: string;
  chatHistory: ACChatMessage[];
  questionCardId: string;
}

/** POST /answer-cards/generate レスポンス */
export interface GenerateAnswerResponse {
  message: string;
  answer: AnswerCardCandidate | null;
}

/** POST /answer-cards リクエスト */
export interface SaveAnswerCardRequest {
  questionCardId: string;
  candidate: AnswerCardCandidate;
}

/** POST /answer-cards レスポンス */
export interface SaveAnswerCardResponse {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

/** GET /answer-cards/question/:id の1件（KC形式） */
export interface ACListItem {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  status: string;
  tags: string[];
  confidence: number | null;
  questionCardId: string | null;
  creatorId: string;
  createdAt: string;
  viewCount: number;
  usefulCount: number;
}

/** GET /answer-cards/question/:id レスポンス */
export interface ACListResponse {
  items: ACListItem[];
  total: number;
}

/** 一覧フィルタ */
export interface ACListQuery {
  questionCardId?: string;
  creatorId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/** SSEストリームイベント */
export interface ACStreamEvent {
  type: "chunk" | "answer" | "done" | "error";
  data: string;
}

// ============================================
// Gateway実装
// ============================================

export class AnswerCardGateway {
  private accessToken?: string;
  private baseUrl: string;

  constructor(config: GatewayConfig = {}) {
    this.accessToken = config.accessToken;
    this.baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * AI回答カード生成（ストリーミング）
   */
  async generateStream(
    request: GenerateAnswerRequest,
    onEvent: (event: ACStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await fetch(
      "/api/answer-cards/generate/stream",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.accessToken
            ? { Authorization: `Bearer ${this.accessToken}` }
            : {}),
        },
        body: JSON.stringify(request),
        signal,
      },
    );

    if (!response.ok || !response.body) {
      throw createErrorFromStatus(
        response.status,
        "ストリーミング接続に失敗しました",
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6)) as ACStreamEvent;
              onEvent(event);
            } catch {
              // JSON parse error — skip
            }
          }
        }
      }

      // 残りバッファ処理
      if (buffer.startsWith("data: ")) {
        try {
          const event = JSON.parse(buffer.slice(6)) as ACStreamEvent;
          onEvent(event);
        } catch {
          // ignore
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * AI回答カード生成（非ストリーミング）
   */
  async generate(
    request: GenerateAnswerRequest,
  ): Promise<GenerateAnswerResponse> {
    const result = await apiFetch<GenerateAnswerResponse>(
      `${this.baseUrl}/answer-cards/generate`,
      {
        method: "POST",
        body: request,
        accessToken: this.accessToken,
      },
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * 回答カード保存（KC形式）
   */
  async saveAnswerCard(
    request: SaveAnswerCardRequest,
  ): Promise<SaveAnswerCardResponse> {
    const result = await apiFetch<SaveAnswerCardResponse>(
      `${this.baseUrl}/answer-cards`,
      {
        method: "POST",
        body: request,
        accessToken: this.accessToken,
      },
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * 回答カード一覧取得
   */
  async listAnswerCards(query: ACListQuery = {}): Promise<ACListResponse> {
    const params = new URLSearchParams();
    if (query.questionCardId) params.set("questionCardId", query.questionCardId);
    if (query.creatorId) params.set("creatorId", query.creatorId);
    if (query.search) params.set("search", query.search);
    if (query.limit) params.set("limit", String(query.limit));
    if (query.offset) params.set("offset", String(query.offset));

    const qs = params.toString();
    const url = `${this.baseUrl}/answer-cards${qs ? `?${qs}` : ""}`;

    const result = await apiFetch<ACListResponse>(url, {
      method: "GET",
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * 質問カードに対する回答カード一覧取得（KC形式）
   */
  async getAnswersByQuestionCard(questionCardId: string): Promise<ACListResponse> {
    const url = `${this.baseUrl}/answer-cards/question/${questionCardId}`;

    const result = await apiFetch<ACListResponse>(url, {
      method: "GET",
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * 回答カード詳細取得
   */
  async getAnswerCard(id: string): Promise<ACListItem> {
    const result = await apiFetch<ACListItem>(
      `${this.baseUrl}/answer-cards/${id}`,
      {
        method: "GET",
        accessToken: this.accessToken,
      },
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * 回答カード削除
   */
  async deleteAnswerCard(id: string): Promise<void> {
    const result = await apiFetch<void>(
      `${this.baseUrl}/answer-cards/${id}`,
      {
        method: "DELETE",
        accessToken: this.accessToken,
      },
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }
  }
}

// シングルトンインスタンス
let gatewayInstance: AnswerCardGateway | null = null;

export function getAnswerCardGateway(
  config?: GatewayConfig,
): AnswerCardGateway {
  if (!gatewayInstance) {
    gatewayInstance = new AnswerCardGateway(config);
  } else if (config?.accessToken) {
    gatewayInstance.setAccessToken(config.accessToken);
  }
  return gatewayInstance;
}
