/**
 * MentorDashboard Service
 *
 * 純粋クラス（React非依存）
 * UseCaseを通じてビジネスロジックを実行し、ViewModelに変換
 */

import type { StudentSummary } from "../../application/entitle/ports";
import type { UseCaseResult, UseCaseFailure } from "../../application/entitle/models";
import type { MentorDashboardUseCase } from "../../application/entitle/MentorDashboardUseCase";
import type { NewhireOption } from "../gateways/api/MentorDashboardGateway";

// ============================================
// ViewModel型定義
// ============================================

export type StudentStatus = "active" | "idle" | "offline";

export interface StudentViewModel {
  id: string;
  name: string;
  avatar?: string;
  lastActivity: Date;
  createdAt: Date;
  status: StudentStatus;
  conversationId: string;
  recentChat: {
    summary: string;
    aiResponse: string;
    subject: string;
    timestamp: Date;
    needsReview: boolean;
  };
  totalChats: number;
}

export type SortOption = "lastActivity" | "createdDate" | "name";

export interface MentorDashboardViewModel {
  students: StudentViewModel[];
  newhireOptions: NewhireOption[];
}

// ============================================
// Service クラス
// ============================================

export class MentorDashboardService {
  constructor(private readonly useCase: MentorDashboardUseCase) {}

  /**
   * 学生サマリー取得
   */
  async fetchStudentSummaries(
    mentorId: string
  ): Promise<UseCaseResult<StudentSummary[]>> {
    return this.useCase.listStudentSummaries({ mentorId });
  }

  /**
   * 割り当て可能な新入社員リスト取得
   */
  async fetchAvailableNewhires(): Promise<UseCaseResult<NewhireOption[]>> {
    return this.useCase.listAvailableNewhires();
  }

  /**
   * メンター割り当て作成
   */
  async createAssignment(newhireId: string): Promise<UseCaseResult<void>> {
    return this.useCase.createAssignment({ newhireId });
  }

  /**
   * フィードバック品質評価提出
   */
  async submitFeedbackQuality(
    mentorId: string,
    studentId: string,
    isPositive: boolean
  ): Promise<UseCaseResult<void>> {
    return this.useCase.submitFeedbackQuality({
      mentorId,
      studentId,
      isPositive,
    });
  }

  /**
   * StudentSummary配列をViewModelに変換
   */
  toViewModel(
    summaries: StudentSummary[],
    newhireOptions: NewhireOption[],
    searchQuery: string = "",
    sortOption: SortOption = "lastActivity"
  ): MentorDashboardViewModel {
    // 検索フィルタリング
    const query = searchQuery.trim().toLowerCase();
    const filteredSummaries = query
      ? summaries.filter((summary) => {
          const studentName = summary.newhire.displayName.toLowerCase();
          const subject = summary.conversation.title.toLowerCase();
          return studentName.includes(query) || subject.includes(query);
        })
      : summaries;

    // StudentViewModelに変換
    const students: StudentViewModel[] = filteredSummaries.map((summary) => {
      const {
        newhire,
        conversation,
        recentMessage,
        needsReview,
        totalChats,
        lastActivityAt,
      } = summary;

      const studentMessage =
        recentMessage?.role === "NEW_HIRE" ? recentMessage.content : "";
      const assistantMessage =
        recentMessage?.role === "ASSISTANT" ? recentMessage.content : "";

      return {
        id: newhire.userId,
        name: newhire.displayName,
        avatar: undefined,
        lastActivity: new Date(lastActivityAt),
        status: this.deriveStatus(lastActivityAt),
        conversationId: conversation.convId,
        recentChat: {
          summary: studentMessage,
          aiResponse: assistantMessage,
          subject: conversation.title,
          timestamp: new Date(lastActivityAt),
          needsReview,
        },
        totalChats,
        createdAt: new Date(conversation.createdAt),
      };
    });

    // ソート適用
    const sortedStudents = this.sortStudents(students, sortOption);

    return {
      students: sortedStudents,
      newhireOptions,
    };
  }

  /**
   * ソートロジック
   */
  private sortStudents(students: StudentViewModel[], sortOption: SortOption): StudentViewModel[] {
    return [...students].sort((a, b) => {
      switch (sortOption) {
        case "lastActivity":
          return b.lastActivity.getTime() - a.lastActivity.getTime();
        case "createdDate":
          return b.createdAt.getTime() - a.createdAt.getTime();
        case "name":
          return a.name.localeCompare(b.name, "ja");
        default:
          return 0;
      }
    });
  }

  /**
   * ステータス導出
   */
  private deriveStatus(lastActivityAt: string): StudentStatus {
    const last = new Date(lastActivityAt).getTime();
    const diffMinutes = (Date.now() - last) / 60000;

    if (!Number.isFinite(diffMinutes) || diffMinutes < 0) {
      return "active";
    }
    if (diffMinutes < 5) {
      return "active";
    }
    if (diffMinutes < 60) {
      return "idle";
    }
    return "offline";
  }
}
