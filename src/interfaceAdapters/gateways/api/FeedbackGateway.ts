/**
 * Feedback API Gateway
 *
 * FeedbackPort 인터페이스 구현
 */

import type { Feedback } from "../../../domain/core";
import type { FeedbackPort } from "../../../application/entitle/ports";
import type { ValidatedFeedback } from "../../../application/entitle/models";
import { apiFetch } from "../../../lib/api";
import { createErrorFromStatus } from "../../errors";
import type { GatewayConfig } from "./types";

export class FeedbackGateway implements FeedbackPort {
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

  async createFeedback(
    input: ValidatedFeedback & { visibility?: "ALL" | "OWNER_ONLY" | "MENTOR_ONLY" }
  ): Promise<Feedback> {
    return this.callApi<Feedback>("createFeedback", {
      targetMsgId: input.targetMsgId,
      content: input.content,
      visibility: input.visibility,
    });
  }

  async listFeedbacks(input: {
    msgId: string;
    cursor?: string;
    limit?: number;
  }): Promise<{
    items: Feedback[];
    nextCursor?: string;
    authorNames?: Record<string, string>;
  }> {
    return this.callApi<{
      items: Feedback[];
      nextCursor?: string;
      authorNames?: Record<string, string>;
    }>("listFeedbacks", input);
  }

  async updateFeedback(input: {
    feedbackId: string;
    content: string;
  }): Promise<Feedback> {
    return this.callApi<Feedback>("updateFeedback", input);
  }
}
