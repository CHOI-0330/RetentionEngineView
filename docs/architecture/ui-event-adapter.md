# UI Event Adapter ガイド（Interface Adapters 層）

> **注意**: 以下のコード例は `WEB-24/drawing/photo_cropping_function` を題材にしていますが、任意の機能でも同じパターンを適用できます。パラメータやモジュール名は要件に合わせて置き換えてください。

## 1. 役割概要

- DOM/Pointer/Keyboard イベントをドメインが扱えるデータに変換し、Controller や Presenter に渡します。
- `useSomethingAdapter` という React フックとして実装し、イベントリスナーと変換処理をまとめて提供します。
- 責務は「入力正規化」のみに限定し、モード切替や状態保持は Presenter / Controller に委譲します。

## 2. ディレクトリと命名

| ディレクトリ | 命名規約 | 例 |
|---------------|-----------|----|
| `interfaceAdapters/adapters` | `useFeatureAdapter.ts` | `useDrawingPointerHandlersAdapter.ts`, `useOverlayClickAdapter.ts` |

- フック名は `use` + 対象イベント + `Adapter` の形式を推奨します。
- テストファイルは同階層に配置し、PointerEvent などは `@testing-library/user-event` でシミュレートします。

## 3. 実装パターン

### 3.1 Drawing Pointer Adapter

```ts
import { useCallback, useRef } from "react";
import type { PointerEvent } from "react";

import { calculateRelativePoint } from "@/utils/painting/coordinates";

export const useDrawingPointerHandlersAdapter = ({
  mode,
  onPointStart,
  onPointAppend,
  onFinalizeStroke,
  onCancelStroke,
}: Params) => {
  const isPointerActiveRef = useRef(false);
  const shouldHandlePointer = mode === "draw";

  const convertEventToPoint = useCallback((event: SvgPointerEvent) => {
    const boundingRect = event.currentTarget.getBoundingClientRect();
    return calculateRelativePoint({
      boundingRect,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }, []);

  const handlePointerDown = useCallback((event: SvgPointerEvent) => {
    if (!shouldHandlePointer) return;

    event.preventDefault();
    const nextPoint = convertEventToPoint(event);
    onPointStart(nextPoint);
    isPointerActiveRef.current = true;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 失敗しても描画には影響しないため無視。
    }
  }, [convertEventToPoint, onPointStart, shouldHandlePointer]);

  // ... move / up / cancel も同様に convertEventToPoint を使って座標を生成

  return {
    shouldHandlePointer,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } as const;
};
```

**ポイント**
- モードチェック (`shouldHandlePointer`) を Adapter 内に閉じ込め、Presenter からはハンドラを切り替えるだけにします。
- Pointer Capture の取得・解放を Adapter が責任を持って行い、例外は握りつぶして UI 中断を防ぎます。
- 座標変換ロジックは `utils/painting/coordinates.ts` のように共通化し、 Adapter から呼び出します。

### 3.2 Overlay Click Adapter

```ts
export const useOverlayClickAdapter = (addPoint: (point: Point) => void) => {
  return useCallback((event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    addPoint({ x, y });
  }, [addPoint]);
};
```

**ポイント**
- Adapter はシンプルに座標を算出し、Controller (or Presenter) が提供するハンドラへ委譲します。
- DOM API の利用は Adapter に閉じ込め、テストでは `getBoundingClientRect` をモックします。

## 4. 設計ルール

- Adapter は状態 (`useState`) を持たず、`useRef` で必要なフラグ（Pointer Active など）のみ管理します。
- ブラウザ依存の API (`setPointerCapture`, `releasePointerCapture`) を使用する際は try/catch で失敗を吸収し、Gateway に委ねないようにします。
- Adapter 同士の依存を避け、再利用したいロジックは `utils/**` へ切り出します。

## 5. テスト戦略

- `renderHook` と `act` を使い、PointerEvent / MouseEvent をモックして期待通りの座標が Controller へ渡るか検証します。
- `getBoundingClientRect` などブラウザ API は Jest / Vitest のモックで制御します。
- モードフラグ (`shouldHandlePointer`) が正しく変化するか、各ハンドラが preventDefault を呼んでいるかも確認します。

## 6. 実装チェックリスト

1. DOM イベントからドメインフレンドリーなデータへ変換できているか。
2. Presenter / Controller が Adapter に依存していないか。
3. ブラウザ API の失敗をハンドリングしているか。
4. `as const` で返却値を固定し、ハンドラの差し替えが容易か。
5. テストで主要なイベントフロー（pointerdown → move → up）がカバーされているか。

## 7. アンチパターン

- Adapter でモード変更や状態管理を行い、Presenter に責務が重複する。
- Controller を直接 import してロジックを呼び出す。
- イベントハンドラをそのまま View へ返さず、Presenter 側で毎回ラップする。

UI Event Adapter は UI とドメインの座標系・イベントを橋渡しする重要な層です。Browser API を適切に抽象化し、テスト可能性の高いイベント変換を実現してください。

## 関連ドキュメント

- [アーキテクチャ概要](../ARCHITECTURE_GUIDELINES.md)
- [Controller ガイド](controller.md)
- [Gateway ガイド](gateway.md)

