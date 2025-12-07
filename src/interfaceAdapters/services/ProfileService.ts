/**
 * Profile Service
 *
 * 純粋クラス（React非依存）
 * UseCaseを通じてビジネスロジックを実行し、ViewModelに変換
 */

import type { MbtiType } from "../../domain/mbti.types";
import { MBTI_LABELS, MBTI_DESCRIPTIONS } from "../../domain/mbti.types";
import type { UseCaseResult } from "../../application/entitle/models";
import type { ProfileUseCase } from "../../application/entitle/ProfileUseCase";

// ============================================
// ViewModel型定義
// ============================================

/**
 * MBTI情報のViewModel
 */
export interface MbtiInfoViewModel {
  type: MbtiType;
  label: string;
  description: string;
}

/**
 * プロフィールページのViewModel
 */
export interface ProfileViewModel {
  currentMbti: MbtiInfoViewModel | null;
  selectedMbti: MbtiInfoViewModel | null;
  hasChanges: boolean;
  canSave: boolean;
}

// ============================================
// Service Class
// ============================================

/**
 * ProfileService
 *
 * プロフィール関連のビジネスロジックとViewModel変換を担当
 */
export class ProfileService {
  constructor(private readonly useCase: ProfileUseCase) {}

  /**
   * ユーザーのMBTIを取得
   */
  async fetchMbti(userId: string): Promise<UseCaseResult<MbtiType | null>> {
    return this.useCase.getMbti({ userId });
  }

  /**
   * ユーザーのMBTIを更新
   */
  async updateMbti(userId: string, mbti: MbtiType): Promise<UseCaseResult<void>> {
    return this.useCase.updateMbti({ userId, mbti });
  }

  /**
   * MBTIタイプをMbtiInfoViewModelに変換
   */
  toMbtiInfoViewModel(mbti: MbtiType | null): MbtiInfoViewModel | null {
    if (!mbti) return null;

    return {
      type: mbti,
      label: MBTI_LABELS[mbti],
      description: MBTI_DESCRIPTIONS[mbti],
    };
  }

  /**
   * プロフィールデータをViewModelに変換
   */
  toViewModel(
    currentMbti: MbtiType | null,
    selectedMbti: MbtiType | null
  ): ProfileViewModel {
    const currentMbtiInfo = this.toMbtiInfoViewModel(currentMbti);
    const selectedMbtiInfo = this.toMbtiInfoViewModel(selectedMbti);

    // 変更があるかチェック
    const hasChanges = currentMbti !== selectedMbti;

    // 保存可能かチェック（選択されていて、かつ変更がある）
    const canSave = selectedMbti !== null && hasChanges;

    return {
      currentMbti: currentMbtiInfo,
      selectedMbti: selectedMbtiInfo,
      hasChanges,
      canSave,
    };
  }
}
