"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  KnowledgeGateway,
  type KCCandidate,
} from "../gateways/api/KnowledgeGateway";
import type {
  TriggerDetectionResult,
  TriggerSessionResponse,
  TriggerKCCandidate,
} from "../gateways/api/types";

// ============================================
// 型定義
// ============================================

export interface TriggerItem {
  /** 一意のトリガーID */
  id: string;
  /** トリガーに対応するユーザーメッセージID */
  userMsgId: string;
  /** トリガー種別 */
  triggerType: string | null;
  /** 信頼度 */
  confidence: number;
  /** 原文抜粋 (V1互換) */
  excerpt: string | null;
  /** フォローアップ質問 (V1互換) */
  followUpQuestion?: string;
  /** V2: 初期KC候補（トリガー検出時のAI分析結果） */
  initialKC?: TriggerKCCandidate;
  /** V2: ヒアリング質問 */
  hearingQuestion?: string;
  /** 状態 */
  status: "pending" | "saved" | "dismissed";
}

/**
 * Story 2-10: 自動ヒアリングセッション状態
 */
export interface HearingSession {
  /** セッションID */
  id: string;
  /** 状態: hearing=ヒアリング中, ready=KC準備完了 */
  status: "hearing" | "ready";
  /** 現在のヒアリングラウンド (1-3) */
  hearingRound: number;
  /** トリガーが発生したユーザーメッセージID（星表示用） */
  triggerMsgId?: string;
  /** KC候補（ready状態時） */
  kcCandidate?: TriggerKCCandidate;
}

interface UseTriggerDetectionProps {
  accessToken?: string;
  conversationId?: string;
}

export interface TriggerDetectionState {
  triggers: TriggerItem[];
  unsavedCount: number;
  hasTriggers: boolean;
  /** 保存完了メッセージ表示用 */
  savedMessage: string | null;
  /** Story 2-10: 自動ヒアリングセッション状態 */
  hearingSession: HearingSession | null;
  /** Story 2-10: ヒアリング完了KCがある */
  hasReadyKC: boolean;
}

export interface TriggerDetectionActions {
  /** LLM応答からトリガーを記録 (V1互換) */
  recordTrigger: (
    userMsgId: string,
    result: TriggerDetectionResult,
  ) => void;
  /** Story 2-10: セッション状態を記録 (V2) */
  recordSession: (
    sessionResponse: TriggerSessionResponse | undefined,
    triggerMsgId?: string,
  ) => void;
  /** 単件トリガーを保存 */
  saveTrigger: (
    triggerId: string,
    candidate: KCCandidate,
  ) => Promise<void>;
  /** 複数トリガーを一括保存 */
  saveTriggers: (
    items: Array<{ triggerId: string; candidate: KCCandidate }>,
  ) => Promise<void>;
  /** Story 2-10: ヒアリング完了KCを保存（編集済みの場合はeditedを渡す） */
  saveSessionKC: (edited?: KCCandidate) => Promise<void>;
  /** Story 2-10: セッションKCをKCCandidate形式で取得（レビュー用） */
  getSessionKCAsCandidate: () => KCCandidate | null;
  /** Story 2-10: ヒアリングセッションを無視 */
  dismissSession: () => void;
  /** トリガーを無視 */
  dismissTrigger: (triggerId: string) => void;
  /** 会話切替時にクリア */
  clearTriggers: () => void;
  /** 保存完了メッセージをクリア */
  clearSavedMessage: () => void;
  /** 特定メッセージIDのトリガーを取得 */
  getTriggerByMsgId: (msgId: string) => TriggerItem | undefined;
}

export interface UseTriggerDetectionOutput {
  state: TriggerDetectionState;
  actions: TriggerDetectionActions;
}

// ============================================
// Hook
// ============================================

export function useTriggerDetection({
  accessToken,
  conversationId,
}: UseTriggerDetectionProps): UseTriggerDetectionOutput {
  const triggerCounterRef = useRef(0);
  const [triggers, setTriggers] = useState<TriggerItem[]>([]);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  // Story 2-10: ヒアリングセッション状態
  const [hearingSession, setHearingSession] = useState<HearingSession | null>(null);

  // 保存完了メッセージの自動クリア（メモリリーク対策）
  useEffect(() => {
    if (!savedMessage) return;
    const timeoutId = setTimeout(() => {
      setSavedMessage(null);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [savedMessage]);

  // 未保存件数（ヒアリングセッション中のトリガーは除外）
  const unsavedCount = useMemo(
    () => triggers.filter((t) => {
      if (t.status !== "pending") return false;
      // アクティブなヒアリングセッションに紐づくトリガーは除外
      if (hearingSession && hearingSession.triggerMsgId === t.userMsgId) return false;
      return true;
    }).length,
    [triggers, hearingSession],
  );

  const hasTriggers = unsavedCount > 0;

  // Story 2-10: ヒアリング完了KCがあるか
  const hasReadyKC = useMemo(
    () => hearingSession?.status === "ready" && !!hearingSession.kcCandidate,
    [hearingSession],
  );

  /**
   * LLM応答からトリガーを記録 (V2対応)
   */
  const recordTrigger = useCallback(
    (userMsgId: string, result: TriggerDetectionResult & {
      initialKC?: TriggerKCCandidate;
      hearingQuestion?: string;
    }) => {
      if (!result.detected) return;

      const newTrigger: TriggerItem = {
        id: `trigger-${conversationId ?? 'default'}-${++triggerCounterRef.current}`,
        userMsgId,
        triggerType: result.triggerType,
        confidence: result.confidence,
        // V2: initialKCからexcerptを生成（V1互換）
        excerpt: result.initialKC?.knowhow ?? result.excerpt,
        followUpQuestion: result.hearingQuestion ?? result.followUpQuestion,
        // V2固有フィールド
        initialKC: result.initialKC,
        hearingQuestion: result.hearingQuestion,
        status: "pending",
      };

      setTriggers((prev) => [...prev, newTrigger]);
    },
    [conversationId],
  );

  /**
   * Story 2-10: セッション状態を記録 (V2)
   * @param triggerMsgId トリガーが発生したユーザーメッセージID（新規セッション開始時のみ）
   */
  const recordSession = useCallback(
    (sessionResponse: TriggerSessionResponse | undefined, triggerMsgId?: string) => {
      if (!sessionResponse) {
        return;
      }

      // hearing または ready 状態のみ追跡
      if (sessionResponse.status === "hearing" || sessionResponse.status === "ready") {
        const status = sessionResponse.status as "hearing" | "ready";
        setHearingSession((prev) => ({
          id: sessionResponse.id,
          status,
          hearingRound: sessionResponse.hearingRound,
          // 新規セッション開始時: triggerMsgIdを設定
          // 継続ラウンド時: 既存のtriggerMsgIdを維持
          triggerMsgId: triggerMsgId ?? prev?.triggerMsgId ?? sessionResponse.triggerMsgId,
          kcCandidate: sessionResponse.kcCandidate,
        }));
      }
    },
    [],
  );

  /**
   * 単件トリガーを保存
   */
  const saveTrigger = useCallback(
    async (triggerId: string, candidate: KCCandidate) => {
      if (!accessToken || !conversationId) return;

      try {
        const gateway = new KnowledgeGateway({ accessToken });
        await gateway.saveKnowledgeCard({
          conversationId,
          candidate,
        });

        setTriggers((prev) =>
          prev.map((t) =>
            t.id === triggerId ? { ...t, status: "saved" as const } : t,
          ),
        );
      } catch (error) {
        toast.error('保存に失敗しました');
        console.error('Save failed:', error);
      }
    },
    [accessToken, conversationId],
  );

  /**
   * 複数トリガーを一括保存
   */
  const saveTriggers = useCallback(
    async (items: Array<{ triggerId: string; candidate: KCCandidate }>) => {
      if (!accessToken || !conversationId) return;

      try {
        const gateway = new KnowledgeGateway({ accessToken });

        // 並列で保存
        await Promise.all(
          items.map(({ candidate }) =>
            gateway.saveKnowledgeCard({
              conversationId,
              candidate,
            }),
          ),
        );

        const savedIds = new Set(items.map((item) => item.triggerId));
        setTriggers((prev) =>
          prev.map((t) =>
            savedIds.has(t.id) ? { ...t, status: "saved" as const } : t,
          ),
        );

        // 保存完了メッセージを表示（useEffectで自動クリア）
        setSavedMessage(`${items.length}件 保存完了!`);
      } catch (error) {
        toast.error('保存に失敗しました');
        console.error('Save failed:', error);
      }
    },
    [accessToken, conversationId],
  );

  /**
   * Story 2-10: ヒアリング完了KCを保存
   * @param edited ユーザーが編集したKC（省略時はhearingSession.kcCandidateから変換）
   */
  const saveSessionKC = useCallback(async (edited?: KCCandidate) => {
    if (!accessToken || !conversationId) {
      return;
    }
    // 編集版がない場合はセッションKCが必要
    if (!edited && !hearingSession?.kcCandidate) {
      return;
    }

    try {
      const gateway = new KnowledgeGateway({ accessToken });

      let candidate: KCCandidate;
      if (edited) {
        // ユーザーが編集済み
        candidate = edited;
      } else {
        // TriggerKCCandidate → KCCandidate 変換（同一構造）
        const kc = hearingSession!.kcCandidate!;
        candidate = {
          title: kc.title,
          situation: kc.situation,
          knowhow: kc.knowhow,
          precaution: kc.precaution,
          importance: kc.importance,
          example: kc.example,
          tags: kc.tags,
          confidence: 0.8, // ヒアリング完了時のデフォルト信頼度
        };
      }

      await gateway.saveKnowledgeCard({
        conversationId,
        candidate,
      });

      // セッションクリア
      setHearingSession(null);

      // 保存完了メッセージ（useEffectで自動クリア）
      setSavedMessage("暗黙知カード 保存完了!");
    } catch (error) {
      toast.error('保存に失敗しました');
      console.error('Save failed:', error);
    }
  }, [accessToken, conversationId, hearingSession]);

  /**
   * Story 2-10: セッションKCをKCCandidate形式で取得（レビュー用）
   */
  const getSessionKCAsCandidate = useCallback((): KCCandidate | null => {
    if (!hearingSession?.kcCandidate) return null;
    const kc = hearingSession.kcCandidate;
    return {
      title: kc.title,
      situation: kc.situation,
      knowhow: kc.knowhow,
      precaution: kc.precaution,
      importance: kc.importance,
      example: kc.example,
      tags: kc.tags,
      confidence: 0.8,
    };
  }, [hearingSession]);

  /**
   * Story 2-10: ヒアリングセッションを無視
   */
  const dismissSession = useCallback(() => {
    setHearingSession(null);
  }, []);

  /**
   * トリガーを無視
   */
  const dismissTrigger = useCallback((triggerId: string) => {
    setTriggers((prev) =>
      prev.map((t) =>
        t.id === triggerId ? { ...t, status: "dismissed" as const } : t,
      ),
    );
  }, []);

  /**
   * 会話切替時にクリア
   */
  const clearTriggers = useCallback(() => {
    setTriggers([]);
    setSavedMessage(null);
    setHearingSession(null);
  }, []);

  /**
   * 保存完了メッセージをクリア
   */
  const clearSavedMessage = useCallback(() => {
    setSavedMessage(null);
  }, []);

  /**
   * 特定メッセージIDのトリガーを取得
   */
  const getTriggerByMsgId = useCallback(
    (msgId: string) => {
      return triggers.find(
        (t) => t.userMsgId === msgId && t.status === "pending",
      );
    },
    [triggers],
  );

  return {
    state: {
      triggers,
      unsavedCount,
      hasTriggers,
      savedMessage,
      hearingSession,
      hasReadyKC,
    },
    actions: {
      recordTrigger,
      recordSession,
      saveTrigger,
      saveTriggers,
      saveSessionKC,
      getSessionKCAsCandidate,
      dismissSession,
      dismissTrigger,
      clearTriggers,
      clearSavedMessage,
      getTriggerByMsgId,
    },
  };
}
