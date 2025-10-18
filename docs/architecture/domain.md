# Domain ガイド（Domain / Entities 層）

> **注意**: 以下のコード例は `WEB-24/drawing/photo_cropping_function` を題材にしていますが、任意の機能でも同じパターンを適用できます。パラメータやモジュール名は要件に合わせて置き換えてください。

## 1. 役割概要

- ビジネスロジックの中核を担う純粋関数と値オブジェクトを提供します。
- アプリケーション全体で共有され、UI やブラウザ API に依存しない設計を徹底します。
- モジュールは単一責務で構成し、再利用性とテスト容易性を高めます。

## 2. ディレクトリと命名

| ディレクトリ | 命名規約 | 例 |
|---------------|-----------|----|
| `domain/<context>` | 機能単位のモジュール | `domain/painting/drawing.ts` |
| `type/**` | 値オブジェクトの型定義 | `type/painting.ts` |
| `utils/**` | ドメインロジックを補助する純粋関数 | `utils/painting/geometry.ts`, `utils/painting/coordinates.ts` |

- Domain モジュールでは `export interface` / `export const` を用い、デフォルトエクスポートは避けます。
- 値オブジェクトの型は `type/**` に定義し、Domain / Use Case / Interface Adapters から共通利用します。

## 3. 実装パターン

### 3.1 Drawing ドメイン

```ts
export interface DrawingState {
  strokes: DrawingStroke[];
  activeStroke: DrawingStroke | null;
}

export const createInitialDrawingState = (): DrawingState => ({
  strokes: [],
  activeStroke: null,
});

export const beginStroke = ({ tool, color, width, fillOpacity, startPoint, id }: BeginStrokeInput) => ({
  id,
  tool,
  color,
  width,
  points: [startPoint],
  fillOpacity,
} satisfies DrawingStroke);

export const appendPointToStroke = (stroke: DrawingStroke, point: Point): DrawingStroke => {
  if (stroke.points.length === 0) {
    return { ...stroke, points: [point] };
  }
  const lastPoint = stroke.points[stroke.points.length - 1];
  if (lastPoint.x === point.x && lastPoint.y === point.y) {
    return stroke;
  }
  return { ...stroke, points: [...stroke.points, point] };
};
```

**ポイント**
- 状態 (`DrawingState`) と操作関数 (`appendPointToStroke`) を同じモジュールにまとめます。
- 同じ点を二重登録しないなど、ドメインの不変条件を関数内で保証します。

### 3.2 幾何ユーティリティ

`utils/painting/geometry.ts` はアーチを計算する純粋関数を提供します。

```ts
const calculateEuclideanDistanceBetweenPoints = (firstPoint: Point, secondPoint: Point) =>
  Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);

const createInclinedBaselineLocalCoordinateFrame = (baselineLeftPoint: Point, baselineRightPoint: Point) => {
  const baselineMidpoint = {
    x: (baselineLeftPoint.x + baselineRightPoint.x) / 2,
    y: (baselineLeftPoint.y + baselineRightPoint.y) / 2,
  };
  const baselineAngleInRadians = Math.atan2(
    baselineRightPoint.y - baselineLeftPoint.y,
    baselineRightPoint.x - baselineLeftPoint.x
  );

  const convertToLocalFrameYUp = (pointOnImage: Point): Point => {
    const rotatedPoint = rotatePointAroundOrigin(pointOnImage, baselineMidpoint, -baselineAngleInRadians);
    return { x: rotatedPoint.x - baselineMidpoint.x, y: -(rotatedPoint.y - baselineMidpoint.y) };
  };

  return { convertToLocalFrameYUp, convertFromLocalFrameYUp };
};
```

**ポイント**
- 幾何演算を純粋関数で提供し、描画や切り抜きなど複数レイヤーから再利用できるようにします。
- 定数 (`ARCH_POINT_LIMIT` など) は `constants/painting.ts` に定義し、マジックナンバーを排除します。

## 4. 設計ルール

- Domain 関数は引数・戻り値ともに Plain Object を使用し、クラスや可変状態を避けます。
- 不変条件を内包し、無効な入力に対しては `null` や `Result` パターンで明確に扱います。
- 計算ロジック（幾何、整列、ID 生成など）は Domain か Utility へ集約し、Interface Adapters に複製しないようにします。

## 5. テスト戦略

- テーブル駆動テストで多数のケースを網羅します（例: 座標の並び順、垂直・水平基線など）。
- 演算結果が浮動小数点誤差を含む場合は許容誤差を設け、`toBeCloseTo` を利用します。
- 失敗パス（点不足、距離不足など）も明示的にテストし、`null` やエラーを返すことを確認します。

## 6. 実装チェックリスト

1. 関数が純粋で、入出力だけで完結しているか。
2. 定数や型が `constants/**`, `type/**` に切り出されているか。
3. 不変条件やガードが実装されているか（例: 最小ポイント数）。
4. 冗長な計算が `useMemo` やキャッシュで最適化可能か検討したか（必要に応じて）。
5. Domain 関数を直接テストし、Interface Adapters に依存しないか。

## 7. アンチパターン

- Domain 関数で `document`, `window`, `Date` などブラウザ API を利用する。
- Interface Adapters の事情で Domain に UI ロジックを追加する。
- 値オブジェクトの型をファイルごとに重複定義する。

Domain 層はアプリケーションの耐久性を左右します。純粋性と不変条件を守り、他レイヤーが安心して利用できる関数群として設計してください。

## 関連ドキュメント

- [アーキテクチャ概要](../ARCHITECTURE_GUIDELINES.md)
- [Use Case ガイド](usecase.md)
- [Cross-cutting ガイド](cross-cutting.md)

