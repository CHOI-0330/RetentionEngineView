/**
 * Knowledge API Gateway
 *
 * 暗黙知抽出・蓄積機能のAPIクライアント
 */

import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";
import type { GatewayConfig } from "./types";

// ============================================
// 型定義
// ============================================

export type ExtractionRange =
  | "all"
  | "recent"
  | { startIndex: number; endIndex: number };

export interface ExtractKnowledgeRequest {
  conversationId: string;
  range?: ExtractionRange;
}

export interface ExtractedKnowledgeItem {
  id: string;
  content: string;
  category: string;
  tags: string[];
}

export interface DuplicateKnowledgeItem {
  content: string;
  category: string;
  existingId: string;
  similarity: number;
}

export interface ExtractKnowledgeResponse {
  extracted: ExtractedKnowledgeItem[];
  duplicates: DuplicateKnowledgeItem[];
  totalProcessed: number;
}

// プレビュー・保存用の型
export interface KnowledgeCandidate {
  content: string;
  category: string;
  tags: string[];
}

export interface ExtractKnowledgePreviewResponse {
  candidates: KnowledgeCandidate[];
  totalProcessed: number;
}

export interface SaveKnowledgeItem {
  content: string;
  category: string;
  tags: string[];
}

export interface SaveKnowledgeRequest {
  conversationId: string;
  items: SaveKnowledgeItem[];
}

export interface SaveKnowledgeResponse {
  saved: ExtractedKnowledgeItem[];
  duplicates: DuplicateKnowledgeItem[];
}

// ナレッジ一覧用
export interface KnowledgeListQuery {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface KnowledgeListItem {
  id: string;
  content: string;
  category: string;
  tags: string[];
  extracted_by: string;
  created_at: string;
}

export interface KnowledgeListResponse {
  items: KnowledgeListItem[];
  total: number;
}

// ============================================
// Gateway実装
// ============================================

export class KnowledgeGateway {
  private accessToken?: string;
  private baseUrl: string;

  constructor(config: GatewayConfig = {}) {
    this.accessToken = config.accessToken;
    // バックエンドAPIのベースURL
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * チャット履歴から暗黙知を抽出（プレビューのみ、保存しない）
   */
  async extractKnowledgePreview(
    request: ExtractKnowledgeRequest
  ): Promise<ExtractKnowledgePreviewResponse> {
    const result = await apiFetch<ExtractKnowledgePreviewResponse>(
      `${this.baseUrl}/knowledge/extract`,
      {
        method: "POST",
        body: request,
        accessToken: this.accessToken,
      }
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * 選択された候補を保存
   */
  async saveKnowledge(
    request: SaveKnowledgeRequest
  ): Promise<SaveKnowledgeResponse> {
    const result = await apiFetch<SaveKnowledgeResponse>(
      `${this.baseUrl}/knowledge/save`,
      {
        method: "POST",
        body: request,
        accessToken: this.accessToken,
      }
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * ナレッジのカテゴリを更新
   */
  async updateKnowledge(
    id: string,
    data: { category: string }
  ): Promise<{ id: string; category: string }> {
    const result = await apiFetch<{ id: string; category: string }>(
      `${this.baseUrl}/knowledge/${id}`,
      {
        method: "PATCH",
        body: data,
        accessToken: this.accessToken,
      }
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * 抽出済みナレッジ一覧を取得
   */
  async listKnowledge(
    query: KnowledgeListQuery = {}
  ): Promise<KnowledgeListResponse> {
    const params = new URLSearchParams();
    if (query.category) params.set("category", query.category);
    if (query.search) params.set("search", query.search);
    if (query.limit) params.set("limit", String(query.limit));
    if (query.offset) params.set("offset", String(query.offset));

    const qs = params.toString();
    const url = `${this.baseUrl}/knowledge${qs ? `?${qs}` : ""}`;

    const result = await apiFetch<KnowledgeListResponse>(url, {
      method: "GET",
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }
}

// シングルトンインスタンス（オプション）
let gatewayInstance: KnowledgeGateway | null = null;

export function getKnowledgeGateway(config?: GatewayConfig): KnowledgeGateway {
  if (!gatewayInstance) {
    gatewayInstance = new KnowledgeGateway(config);
  } else if (config?.accessToken) {
    gatewayInstance.setAccessToken(config.accessToken);
  }
  return gatewayInstance;
}
