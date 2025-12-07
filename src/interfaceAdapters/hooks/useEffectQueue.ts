import { useCallback, useEffect, useRef } from "react";

/**
 * Effectキュー処理のための共通フック
 *
 * 複数Pageで重複していたEffectキュー管理ロジックを統合します。
 * - 重複Effect防止（同一IDは一度だけ処理）
 * - 順次処理（一度に一つずつ）
 * - 再帰的キュー処理（一つ完了後、次を自動処理）
 *
 * @example
 * ```tsx
 * useEffectQueue({
 *   pendingEffects: presenter.pendingEffects,
 *   processEffect: async (effect) => {
 *     switch (effect.kind) {
 *       case "FETCH_DATA": await fetchData();
 *     }
 *   },
 *   onEffectComplete: (effect) => {
 *     controller.actions.acknowledgeEffect(effect.id);
 *   },
 *   onError: (error) => {
 *     controller.actions.reportError(error);
 *   },
 * });
 * ```
 */

export interface EffectBase {
  id: string;
  kind: string;
}

export interface UseEffectQueueOptions<T extends EffectBase> {
  /**
   * 処理するEffect一覧（Controller/Presenterから提供）
   */
  pendingEffects: T[];

  /**
   * 各Effectを処理する関数
   * 非同期作業（API呼び出し等）を実行
   */
  processEffect: (effect: T) => Promise<void>;

  /**
   * Effect処理完了後に呼び出し（acknowledgeEffect等）
   */
  onEffectComplete: (effect: T) => void;

  /**
   * エラー発生時に呼び出し
   */
  onError?: (error: unknown, effect: T) => void;

  /**
   * 特定Effect種類に対する後処理
   * 例: "REQUEST_REFRESH"完了後finalizeRefresh()呼び出し
   */
  onEffectKindComplete?: (effect: T) => void;
}

export function useEffectQueue<T extends EffectBase>({
  pendingEffects,
  processEffect,
  onEffectComplete,
  onError,
  onEffectKindComplete,
}: UseEffectQueueOptions<T>): void {
  const processingRef = useRef(false);
  const effectQueueRef = useRef<T[]>([]);
  const enqueuedEffectIdsRef = useRef<Set<string>>(new Set());

  const processQueuedEffects = useCallback(() => {
    // 既に処理中なら待機
    if (processingRef.current) {
      return;
    }

    // キューから次のEffectを取り出す
    const nextEffect = effectQueueRef.current.shift();
    if (!nextEffect) {
      return;
    }

    processingRef.current = true;

    void processEffect(nextEffect)
      .catch((error) => {
        onError?.(error, nextEffect);
      })
      .finally(() => {
        // Effect種類別後処理
        onEffectKindComplete?.(nextEffect);

        // Effect完了処理
        onEffectComplete(nextEffect);

        // キューからID削除
        enqueuedEffectIdsRef.current.delete(nextEffect.id);

        // 処理完了表示
        processingRef.current = false;

        // 次のEffect処理（再帰）
        processQueuedEffects();
      });
  }, [processEffect, onEffectComplete, onError, onEffectKindComplete]);

  useEffect(() => {
    // 新しいEffectをキューに追加（重複防止）
    pendingEffects.forEach((effect) => {
      if (!enqueuedEffectIdsRef.current.has(effect.id)) {
        enqueuedEffectIdsRef.current.add(effect.id);
        effectQueueRef.current.push(effect);
      }
    });

    // キュー処理開始
    processQueuedEffects();
  }, [pendingEffects, processQueuedEffects]);
}
