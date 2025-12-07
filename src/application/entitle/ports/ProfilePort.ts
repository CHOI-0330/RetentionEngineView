/**
 * Profile Port Interface
 *
 * プロフィール管理に関するPort定義
 * Gateway層が実装すべきインターフェース
 */

import type { MbtiType } from "../../../domain/mbti.types";

/**
 * ProfilePort
 *
 * ユーザープロフィール（MBTI）管理を定義するポート
 */
export interface ProfilePort {
  /**
   * ユーザーのMBTIタイプを取得
   *
   * @param userId - ユーザーID
   * @returns MBTIタイプ、未設定の場合はnull
   */
  fetchMbti(userId: string): Promise<MbtiType | null>;

  /**
   * ユーザーのMBTIタイプを更新
   *
   * @param userId - ユーザーID
   * @param mbti - 新しいMBTIタイプ
   */
  updateMbti(userId: string, mbti: MbtiType): Promise<void>;
}
