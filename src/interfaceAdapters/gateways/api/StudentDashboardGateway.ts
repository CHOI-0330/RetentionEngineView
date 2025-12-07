/**
 * StudentDashboard API Gateway
 *
 * StudentDashboardPort 인터페이스 구현
 */

import type {
  StudentDashboardPort,
  ConversationListItem,
} from "../../../application/entitle/ports/StudentDashboardPort";
import { apiFetch, invalidateCache } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";

export interface StudentDashboardGatewayConfig {
  accessToken?: string;
}

export interface StudentDashboardBootstrap {
  conversations: ConversationListItem[];
  currentUser: {
    userId: string;
    role: string;
    displayName: string;
  };
}

/**
 * StudentDashboard API Gateway
 */
export class StudentDashboardGateway implements StudentDashboardPort {
  private accessToken?: string;

  constructor(config: StudentDashboardGatewayConfig = {}) {
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * 会話リスト取得（軽量API）
   */
  async listConversations(): Promise<ConversationListItem[]> {
    const result = await apiFetch<StudentDashboardBootstrap>("/api/entitle/conversations", {
      method: "GET",
      accessToken: this.accessToken,
      cacheTtl: 30 * 1000,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data?.conversations ?? [];
  }

  /**
   * 新規会話作成
   */
  async createConversation(title: string): Promise<{ convId: string }> {
    const result = await apiFetch<{ convId: string }>("/api/entitle/student-chat", {
      method: "POST",
      body: {
        action: "createConversation",
        payload: { title },
      },
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    // キャッシュ無効化
    invalidateCache(/conversations/);

    return result.data;
  }

  /**
   * 会話削除
   */
  async deleteConversation(convId: string): Promise<void> {
    const result = await apiFetch<{ ok: boolean }>("/api/entitle/student-chat", {
      method: "POST",
      body: {
        action: "deleteConversation",
        payload: { convId },
      },
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    // キャッシュ無効化
    invalidateCache(/conversations/);
  }
}
