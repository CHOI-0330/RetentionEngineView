/**
 * StudentDashboard API Gateway
 *
 * StudentDashboardPort 인터페이스를 구현하여
 * Page에서 직접 API를 호출하는 대신 Gateway를 통해 호출하도록 합니다.
 */

import type { Conversation } from "../../../domain/core";
import { apiFetch, invalidateCache } from "../../../lib/api";

export interface StudentDashboardGatewayConfig {
  accessToken?: string;
}

export interface ConversationListItem {
  convId: string;
  title: string;
  lastActiveAt: string;
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
export class StudentDashboardGateway {
  private accessToken?: string;

  constructor(config: StudentDashboardGatewayConfig = {}) {
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * 대화 목록 조회 (경량 API)
   */
  async listConversations(): Promise<ConversationListItem[]> {
    const result = await apiFetch<StudentDashboardBootstrap>("/api/entitle/conversations", {
      method: "GET",
      accessToken: this.accessToken,
      cacheTtl: 30 * 1000,
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    return result.data?.conversations ?? [];
  }

  /**
   * 새 대화 생성
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
      throw new Error(result.error);
    }

    // 캐시 무효화
    invalidateCache(/conversations/);

    return result.data;
  }

  /**
   * 대화 삭제
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
      throw new Error(result.error);
    }

    // 캐시 무효화
    invalidateCache(/conversations/);
  }
}
