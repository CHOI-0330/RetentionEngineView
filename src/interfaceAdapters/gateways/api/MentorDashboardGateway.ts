/**
 * MentorDashboard API Gateway
 *
 * MentorDashboardPortインターフェースを実装して
 * Pageから直接APIを呼び出す代わりにGatewayを通じて呼び出すようにします。
 */

import type { MentorDashboardPort, StudentSummary } from "../../../application/entitle/ports";
import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";

export interface MentorDashboardGatewayConfig {
  accessToken?: string;
}

interface MentorApiConversation {
  conv_id: string;
  title: string;
  created_at: string;
  owner_name?: string;
}

export interface NewhireOption {
  userId: string;
  displayName: string;
  email: string;
  createdAt: string;
  isAssigned: boolean;
}

/**
 * MentorDashboard API Gateway
 */
export class MentorDashboardGateway implements MentorDashboardPort {
  private accessToken?: string;

  constructor(config: MentorDashboardGatewayConfig = {}) {
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string | undefined): void {
    this.accessToken = token;
  }

  /**
   * メンターが担当する学生たちの要約情報照会
   */
  async listStudentSummaries(_input: { mentorId: string }): Promise<StudentSummary[]> {
    const result = await apiFetch<MentorApiConversation[]>("/api/entitle/mentor", {
      method: "GET",
      accessToken: this.accessToken,
      cacheTtl: 30 * 1000,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    // apiFetchが既にdataを抽出するためresult.dataが配列
    const conversations = result.data ?? [];

    return conversations.map((c) => ({
      newhire: {
        userId: "",
        role: "NEW_HIRE" as const,
        displayName: c.owner_name ?? "新入社員",
        email: "",
        createdAt: c.created_at,
      },
      conversation: {
        convId: c.conv_id,
        ownerId: "",
        title: c.title,
        state: "ACTIVE" as const,
        createdAt: c.created_at,
        lastActiveAt: c.created_at,
      },
      recentMessage: undefined,
      needsReview: false,
      totalChats: 0,
      lastActivityAt: c.created_at,
    }));
  }

  /**
   * フィードバック品質評価提出
   */
  async submitFeedbackQuality(_input: {
    mentorId: string;
    studentId: string;
    isPositive: boolean;
  }): Promise<void> {
    // 現在APIでサポートされていない - 後で実装
    console.warn("submitFeedbackQuality is not yet implemented");
  }

  /**
   * メンター割り当て生成
   */
  async createAssignment(newhireId: string): Promise<void> {
    const result = await apiFetch<unknown>("/api/entitle/mentor", {
      method: "POST",
      body: { newhireId },
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }
  }

  /**
   * 割り当て可能な新入社員一覧照会
   */
  async listAvailableNewhires(): Promise<NewhireOption[]> {
    const result = await apiFetch<NewhireOption[]>("/api/entitle/mentor/newhires", {
      method: "GET",
      accessToken: this.accessToken,
      cacheTtl: 30 * 1000,
    });

    if (!result.ok) {
      throw createErrorFromStatus(result.status, result.error);
    }

    return result.data ?? [];
  }
}
