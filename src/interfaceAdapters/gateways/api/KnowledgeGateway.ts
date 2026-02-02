/**
 * Knowledge Card (KC) API Gateway
 *
 * 暗黙知検出・KC管理機能のAPIクライアント
 */

import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";
import type { GatewayConfig } from "./types";

// ============================================
// 型定義
// ============================================

export type KCSourceType = "expert" | "manual" | "auto";
export type KCStatus = "draft" | "verified" | "official";

/** 暗黙知検出の候補 */
export interface KCCandidate {
  title: string;
  situation: string;
  knowhow: string;
  precaution: string;
  tags: string[];
  confidence: number;
  sourceMessageRange?: { start: number; end: number };
}

/** POST /knowledge/detect-tacit レスポンス */
export interface DetectTacitKnowledgeResponse {
  candidates: KCCandidate[];
}

/** POST /knowledge/cards レスポンス */
export interface SaveKnowledgeCardResponse {
  id: string;
  title: string;
  status: KCStatus;
  createdAt: string;
}

/** GET /knowledge/cards の1件 */
export interface KCListItem {
  id: string;
  title: string;
  content: string;
  sourceType: KCSourceType;
  status: KCStatus;
  tags: string[];
  confidence: number | null;
  createdAt: string;
  viewCount: number;
  usefulCount: number;
}

/** GET /knowledge/cards レスポンス */
export interface KCListResponse {
  items: KCListItem[];
  total: number;
}

/** GET /knowledge/cards/:id レスポンス */
export interface KCDetail {
  id: string;
  title: string;
  content: string;
  sourceType: KCSourceType;
  status: KCStatus;
  creatorId: string;
  verifierId: string | null;
  tags: string[];
  confidence: number | null;
  sourceConversationId: string | null;
  sourceMessageRange: { start_index: number; end_index: number } | null;
  createdAt: string;
  verifiedAt: string | null;
  viewCount: number;
  usefulCount: number;
}

/** 一覧フィルタ */
export interface KCListQuery {
  status?: KCStatus;
  sourceType?: KCSourceType;
  search?: string;
  tags?: string;
  limit?: number;
  offset?: number;
}

/** 暗黙知検出リクエスト */
export interface DetectTacitKnowledgeRequest {
  conversationId: string;
  startIndex?: number;
  range?: "all" | "recent";
}

/** KC保存リクエスト */
export interface SaveKnowledgeCardRequest {
  conversationId: string;
  candidate: KCCandidate;
}

/** KC編集リクエスト */
export interface UpdateKnowledgeCardRequest {
  title?: string;
  situation?: string;
  knowhow?: string;
  precaution?: string;
  tags?: string[];
  status?: KCStatus;
}

// ============================================
// Gateway実装
// ============================================

export class KnowledgeGateway {
  private accessToken?: string;
  private baseUrl: string;

  constructor(config: GatewayConfig = {}) {
    this.accessToken = config.accessToken;
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * 暗黙知検出（プレビュー）
   */
  async detectTacitKnowledge(
    request: DetectTacitKnowledgeRequest
  ): Promise<DetectTacitKnowledgeResponse> {
    const result = await apiFetch<DetectTacitKnowledgeResponse>(
      `${this.baseUrl}/knowledge/detect-tacit`,
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
   * KC保存
   */
  async saveKnowledgeCard(
    request: SaveKnowledgeCardRequest
  ): Promise<SaveKnowledgeCardResponse> {
    const result = await apiFetch<SaveKnowledgeCardResponse>(
      `${this.baseUrl}/knowledge/cards`,
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
   * KC一覧取得
   */
  async listKnowledgeCards(
    query: KCListQuery = {}
  ): Promise<KCListResponse> {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.sourceType) params.set("sourceType", query.sourceType);
    if (query.search) params.set("search", query.search);
    if (query.tags) params.set("tags", query.tags);
    if (query.limit) params.set("limit", String(query.limit));
    if (query.offset) params.set("offset", String(query.offset));

    const qs = params.toString();
    const url = `${this.baseUrl}/knowledge/cards${qs ? `?${qs}` : ""}`;

    const result = await apiFetch<KCListResponse>(url, {
      method: "GET",
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * KC詳細取得
   */
  async getKnowledgeCard(id: string): Promise<KCDetail> {
    const result = await apiFetch<KCDetail>(
      `${this.baseUrl}/knowledge/cards/${id}`,
      {
        method: "GET",
        accessToken: this.accessToken,
      }
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  /**
   * KC編集
   */
  async updateKnowledgeCard(
    id: string,
    data: UpdateKnowledgeCardRequest
  ): Promise<KCDetail> {
    const result = await apiFetch<KCDetail>(
      `${this.baseUrl}/knowledge/cards/${id}`,
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
   * 役立ったカウント
   */
  async markUseful(id: string): Promise<void> {
    const result = await apiFetch<{ success: boolean }>(
      `${this.baseUrl}/knowledge/cards/${id}/useful`,
      {
        method: "POST",
        accessToken: this.accessToken,
      }
    );

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }
  }
}

// シングルトンインスタンス
let gatewayInstance: KnowledgeGateway | null = null;

export function getKnowledgeGateway(config?: GatewayConfig): KnowledgeGateway {
  if (!gatewayInstance) {
    gatewayInstance = new KnowledgeGateway(config);
  } else if (config?.accessToken) {
    gatewayInstance.setAccessToken(config.accessToken);
  }
  return gatewayInstance;
}
