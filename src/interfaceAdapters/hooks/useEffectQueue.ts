import { useCallback, useEffect, useRef } from "react";

/**
 * Effect 큐 처리를 위한 공통 훅
 *
 * 여러 Page에서 중복되던 Effect 큐 관리 로직을 통합합니다.
 * - 중복 Effect 방지 (동일 ID는 한 번만 처리)
 * - 순차적 처리 (한 번에 하나씩)
 * - 재귀적 큐 처리 (하나 완료 후 다음 자동 처리)
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
   * 처리할 Effect 목록 (Controller/Presenter에서 제공)
   */
  pendingEffects: T[];

  /**
   * 각 Effect를 처리하는 함수
   * 비동기 작업 (API 호출 등)을 수행
   */
  processEffect: (effect: T) => Promise<void>;

  /**
   * Effect 처리 완료 후 호출 (acknowledgeEffect 등)
   */
  onEffectComplete: (effect: T) => void;

  /**
   * 에러 발생 시 호출
   */
  onError?: (error: unknown, effect: T) => void;

  /**
   * 특정 Effect 종류에 대한 후처리
   * 예: "REQUEST_REFRESH" 완료 후 finalizeRefresh() 호출
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
    // 이미 처리 중이면 대기
    if (processingRef.current) {
      return;
    }

    // 큐에서 다음 Effect 꺼내기
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
        // Effect 종류별 후처리
        onEffectKindComplete?.(nextEffect);

        // Effect 완료 처리
        onEffectComplete(nextEffect);

        // 큐에서 ID 제거
        enqueuedEffectIdsRef.current.delete(nextEffect.id);

        // 처리 완료 표시
        processingRef.current = false;

        // 다음 Effect 처리 (재귀)
        processQueuedEffects();
      });
  }, [processEffect, onEffectComplete, onError, onEffectKindComplete]);

  useEffect(() => {
    // 새 Effect를 큐에 추가 (중복 방지)
    pendingEffects.forEach((effect) => {
      if (!enqueuedEffectIdsRef.current.has(effect.id)) {
        enqueuedEffectIdsRef.current.add(effect.id);
        effectQueueRef.current.push(effect);
      }
    });

    // 큐 처리 시작
    processQueuedEffects();
  }, [pendingEffects, processQueuedEffects]);
}
