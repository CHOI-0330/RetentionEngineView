/**
 * Conversation API Gateway
 *
 * ConversationPort 인터페이스 구현
 */

import type { Conversation } from "../../../domain/core";
import type { ConversationPort } from "../../../application/entitle/ports/ConversationPort";
import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";
import type { GatewayConfig, StudentChatBootstrap } from "./types";

export class ConversationGateway implements ConversationPort {
  private accessToken?: string;

  constructor(config: GatewayConfig = {}) {
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  private async callApi<T>(action: string, payload?: unknown): Promise<T> {
    const result = await apiFetch<T>("/api/entitle/student-chat", {
      method: "POST",
      body: { action, payload },
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }

  async createConversation(input: { title: string; mentorId?: string | null }): Promise<Conversation> {
    return this.callApi<Conversation>("createConversation", input);
  }

  async deleteConversation(convId: string): Promise<void> {
    await this.callApi<unknown>("deleteConversation", { convId });
  }

  async listConversations(): Promise<Conversation[]> {
    const bootstrap = await this.fetchBootstrap();
    // Bootstrap의 availableConversations를 Conversation[]으로 변환
    return bootstrap.availableConversations.map((opt) => ({
      convId: opt.convId,
      title: opt.title,
      ownerId: bootstrap.currentUser.userId,
      state: "ACTIVE" as const,
      createdAt: opt.lastActiveAt,
      lastActiveAt: opt.lastActiveAt,
    }));
  }

  /**
   * 特定会話を取得
   */
  async getConversation(convId: string): Promise<Conversation | null> {
    try {
      const bootstrap = await this.fetchBootstrap(convId);
      return bootstrap.conversation ?? null;
    } catch {
      return null;
    }
  }

  /**
   * 会話の最終アクティブ時刻を更新
   */
  async touchLastActive(convId: string): Promise<void> {
    await this.callApi<unknown>("touchLastActive", { convId });
  }

  /**
   * メンターが担当する会話一覧を取得
   */
  async listMentorConversations(_input: { mentorId: string }): Promise<Conversation[]> {
    // メンター用APIから取得（現在は空配列を返す）
    // TODO: mentor API連携時に実装
    return [];
  }

  /**
   * Bootstrap 데이터 로드
   */
  async fetchBootstrap(convId?: string): Promise<StudentChatBootstrap> {
    const params = new URLSearchParams();
    if (convId) {
      params.set("convId", convId);
    }
    const url = `/api/entitle/student-chat${params.toString() ? `?${params.toString()}` : ""}`;

    const result = await apiFetch<StudentChatBootstrap>(url, {
      method: "GET",
      accessToken: this.accessToken,
      cacheTtl: convId ? 0 : 30 * 1000,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data;
  }
}
