# Presenter (ViewModel) ガイド（Interface Adapters 層）

> **注意**: 以下のコード例は `WEB-24/drawing/photo_cropping_function` を題材にしていますが、任意の機能でも同じパターンを適用できます。パラメータやモジュール名は要件に合わせて置き換えてください。

## 1. 役割概要

- Controller が保持する状態を UI 向けの ViewModel に整形し、派生値や UI 制御フラグを計算します。
- 副作用を持たない純粋な React フック (`useSomethingPresenter`) として実装し、`useMemo` を活用して計算結果をキャッシュします。
- Presenter は View に直接依存せず、Props で受け渡せる形のデータのみを返します。

## 2. ディレクトリと命名

| ディレクトリ | 命名規約 | 例 |
|---------------|-----------|----|
| `interfaceAdapters/presenters` | `useFeaturePresenter.ts` | `useCutPresenter.ts`, `useDrawingPresenter.ts` |

- ファイル名とフック名を一致させ、テストファイルは同階層に `useFeaturePresenter.test.ts` を配置します。
- 入出力の型は `type/**` や `domain/**` と共有し、UI 専用の型は Presenter 側で定義します。

## 3. 実装パターン

### 3.1 Cut Presenter の例

```ts
import { useMemo } from "react";

import { useOrderedCutPointsAdapter } from "@/interfaceAdapters/adapters/painting/useOrderedCutPointsAdapter";
import { useCutPolylineAdapter } from "@/interfaceAdapters/adapters/painting/useCutPolylineAdapter";
import type { Point, ArchPolyline } from "@/type/painting";

interface CutPresenterOutput {
  orderedPoints: Point[];
  polyline: ArchPolyline | null;
  hasCutState: boolean;
  hasPolyline: boolean;
}

export const useCutPresenter = ({ points, imgUrl }: { points: Point[]; imgUrl: string | null }): CutPresenterOutput => {
  const orderedPoints = useOrderedCutPointsAdapter(points);
  const polyline = useCutPolylineAdapter(orderedPoints);

  const hasCutState = points.length > 0;
  const hasPolyline = Boolean(polyline && imgUrl);

  return useMemo(() => ({ orderedPoints, polyline, hasCutState, hasPolyline }), [orderedPoints, polyline, hasCutState, hasPolyline]);
};
```

**ポイント**
- 入力（Controller の状態）を Adapter 経由で整形し、UI が必要とする派生値を `useMemo` でまとめて返します。
- Presenter 自身は画像 URL の存在チェックなど UI ロジックを担いますが、副作用や状態は持ちません。

### 3.2 Drawing Presenter の例

```ts
import { useMemo } from "react";

import { buildDrawableSegmentsUseCase } from "@/application/painting/useCases/manageDrawing";
import type { DrawingStroke } from "@/type/painting";

export const useDrawingPresenter = ({ strokes, activeStroke }: { strokes: DrawingStroke[]; activeStroke: DrawingStroke | null }) => {
  const hasPersistedDrawing = strokes.length > 0;
  const hasActiveStroke = Boolean(activeStroke);

  const segments = useMemo(() => buildDrawableSegmentsUseCase(strokes, "segment"), [strokes]);

  return { segments, hasPersistedDrawing, hasActiveStroke } as const;
};
```

**ポイント**
- Application 層のユーティリティ (`buildDrawableSegmentsUseCase`) を再利用し、ViewModel 生成を一箇所に集約します。
- `as const` を用いることで、呼び出し側でプロパティの変更を防ぎます。

## 4. 設計ルール

- Presenter の戻り値は UI に渡すデータだけに限定し、中間状態（useMemo の入力など）は返却しません。
- Adapter を併用して複雑な計算を分割し、Presenter での責務を明確に保ちます。
- 同一 Presenter が複数の UI フローを扱い始めた場合は、派生値ごとに Presenter を分割し、Presenter 同士の依存を避けます。

## 5. テスト戦略

- `renderHook` で Presenter を実行し、入力（Controller の状態）に対する出力が想定通りか検証します。
- `useMemo` を利用している部分は、依存配列が変化した場合のみ再計算されることを確認します。
- Adapter をモック化して Presenter のロジックに集中するか、実装ごとテストするかはケースに応じて選択します。

## 6. 実装チェックリスト

1. Presenter が副作用（API 呼び出し、状態変更）を行っていないか。
2. 入力・出力の型が明確で、UI 専用の派生値が揃っているか。
3. 複雑な計算を Adapter や Use Case に分割しているか。
4. `useMemo` の依存配列が適切か（不要な再計算が発生しないか）。
5. 戻り値のオブジェクトが `as const` などで読み取り専用になっているか。

## 7. アンチパターン

- Presenter で `useState` や `useEffect` を使い副作用を発生させる。
- Controller 内のロジックを Presenter に複製し、二重管理する。
- View から Presenter を飛び越え、Controller の状態に直接アクセスさせる。

Presenter (ViewModel) は UI にとっての「参照点」です。責務と依存を明確に保ち、テスト容易性の高い純粋な計算モジュールとして設計してください。

## 関連ドキュメント

- [エラーハンドリング & ロギング](error-handling.md)
- [アーキテクチャ概要](../ARCHITECTURE_GUIDELINES.md)
- [Controller ガイド](controller.md)
- [UI Event Adapter ガイド](ui-event-adapter.md)

