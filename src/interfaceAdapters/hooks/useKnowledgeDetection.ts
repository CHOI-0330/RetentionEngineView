"use client";

import { useState, useCallback, useRef } from "react";
import {
  KnowledgeGateway,
  type KCCandidate,
} from "../gateways/api/KnowledgeGateway";

// ============================================
// 型定義
// ============================================

interface UseKnowledgeDetectionProps {
  accessToken?: string;
  conversationId?: string;
  /** 自動検出を発火するラウンド間隔 (デフォルト: 8) */
  autoDetectInterval?: number;
}

export interface KnowledgeDetectionState {
  candidates: KCCandidate[];
  isDetecting: boolean;
  error: string | null;
}

export interface KnowledgeDetectionActions {
  /** 手動で暗黙知検出を実行 */
  detectManually: () => Promise<void>;
  /** メッセージ送信時に呼ぶ（ラウンドカウンタ管理） */
  onMessageSent: () => void;
  /** 候補を保存 */
  saveCandidateAtIndex: (index: number) => Promise<void>;
  /** 候補を編集後保存 */
  saveEditedCandidate: (edited: KCCandidate) => Promise<void>;
  /** 候補を閉じる */
  dismissCandidate: (index: number) => void;
  /** すべての候補をクリア */
  clearCandidates: () => void;
}

export interface UseKnowledgeDetectionOutput {
  state: KnowledgeDetectionState;
  actions: KnowledgeDetectionActions;
}

// ============================================
// Hook
// ============================================

const DEFAULT_AUTO_DETECT_INTERVAL = 8;

export function useKnowledgeDetection({
  accessToken,
  conversationId,
  autoDetectInterval = DEFAULT_AUTO_DETECT_INTERVAL,
}: UseKnowledgeDetectionProps): UseKnowledgeDetectionOutput {
  const [candidates, setCandidates] = useState<KCCandidate[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ラウンドカウンタ（ユーザー発言数）
  const roundCount = useRef(0);
  // 最後に検出した startIndex
  const lastDetectedIndex = useRef(0);

  /**
   * 暗黙知検出の実行
   */
  const runDetection = useCallback(async () => {
    if (!accessToken || !conversationId) return;

    setIsDetecting(true);
    setError(null);

    try {
      const gateway = new KnowledgeGateway({ accessToken });
      const result = await gateway.detectTacitKnowledge({
        conversationId,
        startIndex: lastDetectedIndex.current,
      });

      if (result.candidates.length > 0) {
        setCandidates((prev) => [...prev, ...result.candidates]);
      }

      // startIndex を更新（次回は新しいメッセージのみ対象）
      // ラウンドカウント × 2 (user + assistant) を目安に進める
      lastDetectedIndex.current += roundCount.current * 2;
      roundCount.current = 0;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "暗黙知の検出に失敗しました",
      );
    } finally {
      setIsDetecting(false);
    }
  }, [accessToken, conversationId]);

  /**
   * メッセージ送信時にラウンドカウンタをインクリメントし、
   * 閾値に達したら自動検出
   */
  const onMessageSent = useCallback(() => {
    roundCount.current += 1;

    if (roundCount.current >= autoDetectInterval) {
      void runDetection();
    }
  }, [autoDetectInterval, runDetection]);

  /**
   * 手動検出
   */
  const detectManually = useCallback(async () => {
    await runDetection();
  }, [runDetection]);

  /**
   * 候補をそのまま保存
   */
  const saveCandidateAtIndex = useCallback(
    async (index: number) => {
      if (!accessToken || !conversationId) return;
      const candidate = candidates[index];
      if (!candidate) return;

      try {
        const gateway = new KnowledgeGateway({ accessToken });
        await gateway.saveKnowledgeCard({
          conversationId,
          candidate,
        });

        // 保存済み候補を除去
        setCandidates((prev) => prev.filter((_, i) => i !== index));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "ナレッジカードの保存に失敗しました",
        );
      }
    },
    [accessToken, conversationId, candidates],
  );

  /**
   * 編集済み候補を保存
   */
  const saveEditedCandidate = useCallback(
    async (edited: KCCandidate) => {
      if (!accessToken || !conversationId) return;

      try {
        const gateway = new KnowledgeGateway({ accessToken });
        await gateway.saveKnowledgeCard({
          conversationId,
          candidate: edited,
        });

        // 保存済み候補を除去（タイトルで一致）
        setCandidates((prev) =>
          prev.filter((c) => c.title !== edited.title),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "ナレッジカードの保存に失敗しました",
        );
      }
    },
    [accessToken, conversationId],
  );

  /**
   * 候補を閉じる
   */
  const dismissCandidate = useCallback((index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * すべての候補をクリア
   */
  const clearCandidates = useCallback(() => {
    setCandidates([]);
  }, []);

  return {
    state: {
      candidates,
      isDetecting,
      error,
    },
    actions: {
      detectManually,
      onMessageSent,
      saveCandidateAtIndex,
      saveEditedCandidate,
      dismissCandidate,
      clearCandidates,
    },
  };
}
