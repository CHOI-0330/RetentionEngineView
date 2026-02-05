/**
 * Question Card API Gateway
 *
 * 質問カード作成・管理機能のAPIクライアント
 */

import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";
import type { GatewayConfig } from "./types";

// ============================================
// 型定義
// ============================================

export type QuestionCardStatus = "open" | "resolved";

/** AI対話で生成された質問カード候補 */
export interface QuestionCardCandidate {
  title: string;
  background: string;
  questionBody: string;
  tags: string[];
  isAnonymous: boolean;
}

/** チャット履歴の1メッセージ */
export interface QCChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** POST /question-cards/generate リクエスト */
export interface GenerateQuestionCardsRequest {
  originalAiMessage: string;
  chatHistory: QCChatMessage[];
  sourceConvId?: string;
  sourceMsgId?: string;
}

/** POST /question-cards/generate レスポンス */
export interface GenerateQuestionCardsResponse {
  message: string;
  cards: QuestionCardCandidate[];
}

/** POST /question-cards リクエスト */
export interface SaveQuestionCardsRequest {
  cards: QuestionCardCandidate[];
  sourceConvId?: string;
  sourceMsgId?: string;
}

/** POST /question-cards レスポンス */
export interface SaveQuestionCardsResponse {
  saved: { id: string; title: string; createdAt: string }[];
}

/** GET /question-cards の1件 */
export interface QCListItem {
  id: string;
  title: string;
  background: string;
  questionBody: string;
  status: QuestionCardStatus;
  creatorId: string;
  creatorName: string | null;
  isAnonymous: boolean;
  tags: string[];
  viewCount: number;
  createdAt: string;
}

/** GET /question-cards レスポンス */
export interface QCListResponse {
  items: QCListItem[];
  total: number;
}

/** GET /question-cards/:id レスポンス */
export interface QCDetail {
  id: string;
  title: string;
  background: string;
  questionBody: string;
  status: QuestionCardStatus;
  creatorId: string;
  creatorName: string | null;
  isAnonymous: boolean;
  tags: string[];
  sourceConvId: string | null;
  sourceMsgId: string | null;
  viewCount: number;
  createdAt: string;
}

/** 一覧フィルタ */
export interface QCListQuery {
  status?: QuestionCardStatus;
  search?: string;
  tags?: string;
  limit?: number;
  offset?: number;
}

/** 更新リクエスト */
export interface UpdateQuestionCardRequest {
  title?: string;
  background?: string;
  questionBody?: string;
  status?: QuestionCardStatus;
  tags?: string[];
}

/** SSEストリームイベント */
export interface QCStreamEvent {
  type: "chunk" | "cards" | "done" | "error";
  data: string;
}

// ============================================
// Gateway実装
// ============================================

export class QuestionCardGateway {
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
   * AI質問カード生成（ストリーミング）
   */
  async generateStream(
    request: GenerateQuestionCardsRequest,
    onEvent: (event: QCStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const response = await fetch(
      "/api/question-cards/generate/stream",
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
              const event = JSON.parse(line.slice(6)) as QCStreamEvent;
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
          const event = JSON.parse(buffer.slice(6)) as QCStreamEvent;
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
   * AI質問カード生成（非ストリーミング）
   */
  async generate(
    request: GenerateQuestionCardsRequest,
  ): Promise<GenerateQuestionCardsResponse> {
    const result = await apiFetch<GenerateQuestionCardsResponse>(
      `${this.baseUrl}/question-cards/generate`,
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
   * 質問カード保存（複数一括）
   */
  async saveQuestionCards(
    request: SaveQuestionCardsRequest,
  ): Promise<SaveQuestionCardsResponse> {
    const result = await apiFetch<SaveQuestionCardsResponse>(
      `${this.baseUrl}/question-cards`,
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
   * 質問カード一覧取得
   */
  async listQuestionCards(query: QCListQuery = {}): Promise<QCListResponse> {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.search) params.set("search", query.search);
    if (query.tags) params.set("tags", query.tags);
    if (query.limit) params.set("limit", String(query.limit));
    if (query.offset) params.set("offset", String(query.offset));

    const qs = params.toString();
    const url = `${this.baseUrl}/question-cards${qs ? `?${qs}` : ""}`;

    const result = await apiFetch<QCListResponse>(url, {
      method: "GET",
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * 質問カード詳細取得
   */
  async getQuestionCard(id: string): Promise<QCDetail> {
    const result = await apiFetch<QCDetail>(
      `${this.baseUrl}/question-cards/${id}`,
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
   * 質問カード更新
   */
  async updateQuestionCard(
    id: string,
    data: UpdateQuestionCardRequest,
  ): Promise<QCDetail> {
    const result = await apiFetch<QCDetail>(
      `${this.baseUrl}/question-cards/${id}`,
      {
        method: "PATCH",
        body: data,
        accessToken: this.accessToken,
      },
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }
}

// シングルトンインスタンス
let gatewayInstance: QuestionCardGateway | null = null;

export function getQuestionCardGateway(
  config?: GatewayConfig,
): QuestionCardGateway {
  if (!gatewayInstance) {
    gatewayInstance = new QuestionCardGateway(config);
  } else if (config?.accessToken) {
    gatewayInstance.setAccessToken(config.accessToken);
  }
  return gatewayInstance;
}
