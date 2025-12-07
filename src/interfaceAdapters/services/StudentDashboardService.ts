/**
 * StudentDashboard Service
 *
 * 純粋クラス（React非依存）
 * UseCaseを通じてビジネスロジックを実行し、ViewModelに変換
 */

import type { ConversationListItem } from "../../application/entitle/ports/StudentDashboardPort";
import type { UseCaseResult } from "../../application/entitle/models";
import type { StudentDashboardUseCase } from "../../application/entitle/StudentDashboardUseCase";

// ============================================
// ViewModel型定義
// ============================================

export interface ConversationViewModel {
  id: string;
  title: string;
  lastActiveAt: Date;
  displayDate: string;
}

export interface StudentDashboardViewModel {
  conversations: ConversationViewModel[];
  hasConversations: boolean;
  totalCount: number;
}

// ============================================
// Service クラス
// ============================================

export class StudentDashboardService {
  constructor(private readonly useCase: StudentDashboardUseCase) {}

  /**
   * 会話リスト取得
   */
  async fetchConversations(): Promise<UseCaseResult<ConversationListItem[]>> {
    return this.useCase.listConversations();
  }

  /**
   * 新規会話作成
   */
  async createConversation(title: string): Promise<UseCaseResult<{ convId: string }>> {
    return this.useCase.createConversation({ title });
  }

  /**
   * 会話削除
   */
  async deleteConversation(convId: string): Promise<UseCaseResult<void>> {
    return this.useCase.deleteConversation({ convId });
  }

  /**
   * ConversationListItem配列をViewModelに変換
   */
  toViewModel(
    conversations: ConversationListItem[],
    searchQuery: string = ""
  ): StudentDashboardViewModel {
    // 検索フィルタリング
    const query = searchQuery.trim().toLowerCase();
    const filteredConversations = query
      ? conversations.filter((conv) => {
          const title = conv.title.toLowerCase();
          return title.includes(query);
        })
      : conversations;

    // 最新順にソート
    const sortedConversations = [...filteredConversations].sort((a, b) => {
      const dateA = new Date(a.lastActiveAt).getTime();
      const dateB = new Date(b.lastActiveAt).getTime();
      return dateB - dateA; // 降順
    });

    // ConversationViewModelに変換
    const conversationViewModels: ConversationViewModel[] = sortedConversations.map(
      (conv) => {
        const lastActiveDate = new Date(conv.lastActiveAt);

        return {
          id: conv.convId,
          title: conv.title,
          lastActiveAt: lastActiveDate,
          displayDate: this.formatDisplayDate(lastActiveDate),
        };
      }
    );

    return {
      conversations: conversationViewModels,
      hasConversations: conversationViewModels.length > 0,
      totalCount: conversationViewModels.length,
    };
  }

  /**
   * 日付を表示用にフォーマット
   */
  private formatDisplayDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return "たった今";
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}分前`;
    }
    if (diffHours < 24) {
      return `${diffHours}時間前`;
    }
    if (diffDays < 7) {
      return `${diffDays}日前`;
    }

    // 7日以上前は日付を表示
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}
