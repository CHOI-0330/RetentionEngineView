# Cross-cutting ガイド（型・定数・設定）

> **注意**: 以下のコード例は `WEB-24/drawing/photo_cropping_function` を題材にしていますが、任意の機能でも同じパターンを適用できます。パラメータやモジュール名は要件に合わせて置き換えてください。

## 1. 型 (`type/**`)

- レイヤー間で共有する値オブジェクトを `type` ディレクトリに集約します。
- 例: `type/painting.ts`

```ts
export interface Point {
  x: number;
  y: number;
}

export interface ArchPolyline {
  curvePointsOnImage: Point[];
  baselineLeftPointOnImage: Point;
  baselineRightPointOnImage: Point;
}

export type PaintingMode = "cut" | "draw";
export type DrawingTool = "brush" | "eraser" | "fill";
```

**ルール**
- 型は単一責務を意識し、ユニオン型や列挙値でモード・ツール等を表現します。
- `type` ファイルの変更は影響範囲（Use Case、Presenter など）をレビューし、破壊的変更を避けます。

## 2. 定数 (`constants/**`)

- マジックナンバーや UI 定義値を `constants` ディレクトリにまとめます。
- 例: `constants/painting.ts`

```ts
export const PAINTING_MODES: Record<"CUT" | "DRAW", PaintingMode> = {
  CUT: "cut",
  DRAW: "draw",
};

export const STROKE_WIDTH_PRESETS = [2, 4, 8, 12, 16, 24];
export const ARCH_POINT_LIMIT = 3;
export const DEFAULT_OVERLAY_OPACITY = 1;
```

**ルール**
- UI に表示する配列（カラーパレットなど）も定数化し、View/Presenter で参照します。
- 定数値が変更された場合はテスト（Domain/Use Case）が失敗していないか確認します。

## 3. モジュール解決 (`tsconfig.json`)

- `tsconfig.json` の `paths` で `@/*` をプロジェクトルートにマッピングしています。

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**ルール**
- import は常に `@/` エイリアスを利用し、深い相対パス (`../../..`) を禁止します。
- Vitest / Jest を導入する際は、同じパス設定を `vitest.config.ts` / `jest.config.ts` に反映させます。

## 4. Lint / Format

- ESLint 設定は `.eslintrc.json` で `next/core-web-vitals` を継承しています。
- `npm run lint -- --fix` を CI / ローカルで実行し、未使用 import や型の不整合を検出します。
- Tailwind クラスは「レイアウト → サイズ → 色 → 装飾」の順に並べ、読みやすさを保ちます。

## 5. テスト配置

- テストファイルは対象モジュールと同階層に `*.test.ts` として配置するか、`__tests__` ディレクトリを作成してまとめます。
- Domain / Use Case / Interface Adapters 各層に対してテストテンプレートを共有し、Coverage を確認します。

## 6. 実装チェックリスト

1. 新しい型や定数を追加した際に、関連ドキュメントとテストが更新されているか。
2. パスエイリアスを利用し、相対パスが深くなっていないか。
3. Lint / Format のルールに違反していないか (CI で検出される前にローカルで確認)。
4. 型の破壊的変更が発生する場合、マイグレーション計画とドキュメント更新が行われたか。

Cross-cutting モジュールはレイヤー全体の一貫性を支えます。型・定数・設定の変更はチーム内で共有し、ガイドラインとテストを合わせて更新してください。

## 関連ドキュメント

- [アーキテクチャ概要](../ARCHITECTURE_GUIDELINES.md)
- [Domain ガイド](domain.md)
- [Use Case ガイド](usecase.md)

