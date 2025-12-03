/**
 * MentorDashboard API Gateway
 *
 * MentorDashboardPort 인터페이스를 구현하여
 * Page에서 직접 API를 호출하는 대신 Gateway를 통해 호출하도록 합니다.
 */

import type { MentorDashboardPort, StudentSummary } from "../../../application/entitle/ports";
import { apiFetch } from "../../../lib/api";

export interface MentorDashboardGatewayConfig {
  accessToken?: string;
}

interface MentorApiConversation {
  conv_id: string;
  title: string;
  created_at: string;
  owner_name?: string;
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
   * 멘토가 담당하는 학생들의 요약 정보 조회
   */
  async listStudentSummaries(_input: { mentorId: string }): Promise<StudentSummary[]> {
    const result = await apiFetch<MentorApiConversation[]>("/api/entitle/mentor", {
      method: "GET",
      accessToken: this.accessToken,
      cacheTtl: 30 * 1000,
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    // apiFetch가 이미 data를 추출하므로 result.data가 배열
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
   * 피드백 품질 평가 제출
   */
  async submitFeedbackQuality(_input: {
    mentorId: string;
    studentId: string;
    isPositive: boolean;
  }): Promise<void> {
    // 현재 API에서 지원하지 않음 - 나중에 구현
    console.warn("submitFeedbackQuality is not yet implemented");
  }

  /**
   * 멘토 할당 생성
   */
  async createAssignment(newhireId: string): Promise<void> {
    const result = await apiFetch<unknown>("/api/entitle/mentor", {
      method: "POST",
      body: { newhireId },
      accessToken: this.accessToken,
    });

    if (!result.ok) {
      throw new Error(result.error);
    }
  }
}
