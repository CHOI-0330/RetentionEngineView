# Controller ガイド（Interface Adapters 層）

> **注意**: 以下のコード例は `WEB-24/drawing/photo_cropping_function` を題材にしていますが、任意の機能でも同じパターンを適用できます。パラメータやモジュール名は要件に合わせて置き換えてください。

## 1. 役割概要

- UI から届く入力を Application 層の Use Case に橋渡しし、UI が必要とする最小限の状態を保持します。
- 状態遷移は必ず Use Case の戻り値で行い、Controller 自身は副作用（API 呼び出し、デバイス操作）を行いません。
- React フックとして実装し、`useSomethingController` という命名規約を採用します。

## 2. ディレクトリと命名

| ディレクトリ | 命名規約 | 例 |
|---------------|-----------|----|
| `interfaceAdapters/controllers` | `useFeatureController.ts` | `useCutController.ts`, `useDrawingController.ts` |

- ファイル名・フック名は一致させ、テストファイルは同階層に `useFeatureController.test.ts` を配置します。
- Controller でエクスポートするのは UI で利用するステートとハンドラのみとし、内部状態・ユーティリティは外部へ公開しません。

## 3. 実装パターン

### 3.1 Cut Controller の例

```ts
import { useCallback, useState } from "react";

import {
  addCutPointUseCase,
  createInitialCutState,
  resetCutPointsUseCase,
  undoCutPointUseCase,
} from "@/application/painting/useCases/manageCut";
import type { Point } from "@/type/painting";

export const useCutController = () => {
  const [state, setState] = useState(createInitialCutState);

  const addPoint = useCallback((point: Point) => {
    setState((previous) => addCutPointUseCase(previous, point));
  }, []);

  const resetPoints = useCallback(() => {
    setState((previous) => resetCutPointsUseCase(previous));
  }, []);

  const undoPoint = useCallback(() => {
    setState((previous) => undoCutPointUseCase(previous));
  }, []);

  return {
    points: state.points,
    addPoint,
    resetPoints,
    undoPoint,
  } as const;
};
```

**ポイント**
- 初期状態は `createInitialCutState` のような Use Case から提供されるファクトリを利用します。
- `setState` のアップデーター関数内で Use Case を呼び出し、戻り値をそのまま次の状態として採用します。
- 返却値は `as const` で凍結し、呼び出し側でプロパティの変更を防ぎます。

### 3.2 Drawing Controller の例

```ts
const [state, setState] = useState(createInitialControllerState);

const beginStroke = useCallback((point: Point, options: BeginStrokeOptions) => {
  setState((previous) =>
    startStrokeUseCase(previous, {
      tool: options.tool,
      color: options.color,
      width: options.width,
      fillOpacity: options.fillOpacity,
      point,
    })
  );
}, []);

const appendPointToActiveStroke = useCallback((point: Point) => {
  setState((previous) => appendPointUseCase(previous, point));
}, []);
```

**ポイント**
- UI 固有の引数（色、ツール種別）は Use Case で必要な形へマッピングしてから渡します。
- Controller 自身は `useEffect` を持たず、非同期処理やリソース解放は Gateway に委譲します。

## 4. 状態管理ルール

- 状態は `useState` または `useReducer` を利用し、Immer などのミューテーションライブラリは使用しません。
- 冪等性を保つため、同じ入力に対して常に同じ出力を返す Use Case を利用します。
- Controller 間で状態を共有する必要がある場合は Presenter で統合し、直接依存関係を作らないようにします。

## 5. テスト戦略

- React Testing Library の `renderHook` を使用し、操作（addPoint, undoPoint など）ごとに期待する状態が返るかを検証します。
- Use Case が純粋関数であるため、エッジケース（空配列、連続 undo など）をテーブル駆動テストで網羅します。
- Gateway や Presenter へ依存しないため、テストは軽量で高速に保てます。

## 6. 実装チェックリスト

1. Use Case で生成した初期状態を利用しているか。
2. UI 入力を Use Case が期待する形へマッピングしているか。
3. Controller 内で副作用や API 呼び出しを行っていないか。
4. 返却オブジェクトが UI で必要なプロパティのみを公開しているか。
5. `useCallback` / `useMemo` でハンドラの再生成を抑制しているか。

## 7. アンチパターン

- Controller から直接 Gateway を呼び出し、副作用を持たせる。
- Use Case のロジックを Controller 内に複製する。
- `useEffect` やタイマー処理を Controller 内で扱う。
- UI 状態とドメイン状態をひとつのステートに混在させる。

Controller は Interface Adapters の起点であり、Use Case を介した純粋な状態遷移を保証します。新しい Controller を追加するときは本ガイドを参照し、責務と依存方向が守られているか確認してください。

## 関連ドキュメント

- [エラーハンドリング & ロギング](error-handling.md)
- [アーキテクチャ概要](../ARCHITECTURE_GUIDELINES.md)
- [Use Case ガイド](usecase.md)
- [Presenter (ViewModel) ガイド](viewmodel-presenter.md)

