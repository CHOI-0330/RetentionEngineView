# Use Case ガイド（Application 層）

> **注意**: 以下のコード例は `WEB-24/drawing/photo_cropping_function` を題材にしていますが、任意の機能でも同じパターンを適用できます。パラメータやモジュール名は要件に合わせて置き換えてください。

## 1. 役割概要

- ドメインロジックを組み合わせ、シナリオ単位で状態遷移を定義する純粋関数群です。
- UI やブラウザに依存する型を扱わず、`Point`, `DrawingStroke` など Domain の値オブジェクトを利用します。
- 命名は `verbThingUseCase` (`startStrokeUseCase`, `resetCutPointsUseCase` など) を基本とします。

## 2. ディレクトリと命名

| ディレクトリ | 命名規約 | 例 |
|---------------|-----------|----|
| `application/<domain>/useCases` | `verbThingUseCase.ts` または `manageFeature.ts` | `manageDrawing.ts`, `manageCut.ts` |

- 関連する Use Case をひとつのファイルにまとめ、初期状態ファクトリ (`createInitial...State`) を同居させます。
- テストファイルは同階層に `somethingUseCase.test.ts` を配置し、テーブル駆動テストで境界値を検証します。

## 3. 実装パターン

### 3.1 manageDrawing.ts の例

```ts
import {
  appendPointToStroke,
  beginStroke,
  buildDrawableSegments,
  createInitialDrawingState,
  finalizeStroke,
} from "@/domain/painting/drawing";
import type { DrawingStroke, DrawingTool, Point } from "@/type/painting";

export interface DrawingControllerState extends DrawingState {
  nextStrokeId: number;
}

export const createInitialControllerState = (): DrawingControllerState => ({
  ...createInitialDrawingState(),
  nextStrokeId: 0,
});

export const startStrokeUseCase = (state: DrawingControllerState, payload: StartStrokePayload): DrawingControllerState => {
  const strokeId = `stroke-${state.nextStrokeId + 1}`;
  return {
    ...state,
    activeStroke: beginStroke({
      id: strokeId,
      tool: payload.tool,
      color: payload.color,
      width: payload.width,
      fillOpacity: payload.fillOpacity,
      startPoint: payload.point,
    }),
    nextStrokeId: state.nextStrokeId + 1,
  };
};

export const finalizeStrokeUseCase = (state: DrawingControllerState): DrawingControllerState => {
  if (!state.activeStroke) {
    return state;
  }

  const { acceptedStroke, shouldPersist } = finalizeStroke(state.activeStroke);
  if (!shouldPersist || !acceptedStroke) {
    return { ...state, activeStroke: null };
  }

  return {
    ...state,
    strokes: [...state.strokes, acceptedStroke],
    activeStroke: null,
  };
};

export const buildDrawableSegmentsUseCase = (strokes: DrawingStroke[], segmentPrefix?: string) =>
  buildDrawableSegments(strokes, segmentPrefix);
```

**ポイント**
- Domain の関数（`beginStroke`, `finalizeStroke`）を組み合わせ、純粋な状態遷移ロジックを構成します。
- `buildDrawableSegmentsUseCase` のように Domain 関数をラップし、Interface Adapters から直接 Domain に依存しないようにします。

### 3.2 manageCut.ts の例

```ts
export const createInitialCutState = (): CutState => ({ points: [] });

export const addCutPointUseCase = (state: CutState, point: Point): CutState => ({
  ...state,
  points: [...state.points, point],
});

export const resetCutPointsUseCase = (state: CutState): CutState => ({
  ...state,
  points: [],
});
```

**ポイント**
- Use Case はイミュータブルな更新のみを行い、入力状態を直接変更しません。
- UI で利用しやすいように戻り値を完全な状態として返します。

## 4. 設計ルール

- Use Case は純粋関数：同じ入力に対して同じ出力を返し、副作用を持たないこと。
- Domain の戻り値をそのまま流用せず、追加情報（ID など）が必要であれば Use Case で生成します。
- 追加のロジックが複雑化した場合は Domain の関数を増やすか、Adapter を挟むか検討します。

## 5. テスト戦略

- テーブル駆動テストで様々な入力に対する出力を検証します。
- 不正な状態（空の activeStroke、ポイント不足など）に対する防御ロジックをテストします。
- Domain 関数をモックするのではなく実際に呼び出し、Contract が破れていないか確認します。

## 6. 実装チェックリスト

1. 純粋関数として実装し、副作用が含まれていないか。
2. Domain と Use Case の責務分担が明確か（Domain に移すべきロジックが残っていないか）。
3. 新しいステートを返すときに、必要なプロパティが漏れていないか。
4. テストが境界条件・異常系もカバーしているか。
5. Controller が Use Case を正しい順序で呼び出せるよう、API がシンプルに保たれているか。

## 7. アンチパターン

- Use Case 内で Date、Math.random など非決定的な処理を行う。
- Gateway や Presenter を直接 import し、副作用を扱う。
- Controller の都合で Use Case の戻り値を部分的に更新する。

Use Case はアプリケーションロジックの中心です。純粋性とテスト容易性を保ち、Domain と UI の間で起こる状態遷移を明確に表現してください。

## 関連ドキュメント

- [アーキテクチャ概要](../ARCHITECTURE_GUIDELINES.md)
- [Domain ガイド](domain.md)
- [Controller ガイド](controller.md)

