# Gateway ガイド（Interface Adapters 層）

> **注意**: 以下のコード例は `WEB-24/drawing/photo_cropping_function` を題材にしていますが、任意の機能でも同じパターンを適用できます。パラメータやモジュール名は要件に合わせて置き換えてください。

## 1. 役割概要

- ブラウザ API、外部サービス、ストレージなど副作用のある処理を抽象化し、Application/Domain から切り離します。
- React フック (`useSomethingGateway`) あるいはクラスとして実装し、Presenter から呼び出されます。
- 副作用のライフサイクル（実行中フラグ、リソース解放、例外ハンドリング）を責任範囲で完結させます。

## 2. ディレクトリと命名

| ディレクトリ | 命名規約 | 例 |
|---------------|-----------|----|
| `interfaceAdapters/gateways` | `useFeatureGateway.ts` / `FeatureGateway.ts` | `useCutImageGateway.ts`, `useDrawingCompositionGateway.ts`, `useImageObjectUrlGateway.ts` |

- Hook ベースで実装する場合は `useXxxGateway`、クラスベースの場合は `XxxGateway` と命名します。
- テストファイルは同階層に配置し、ブラウザ API (`URL`, `CanvasRenderingContext2D` など) をモックします。

## 3. 実装パターン

### 3.1 画像切り抜き Gateway

```ts
import { useCallback, useEffect, useRef, useState } from "react";

export const useCutImageGateway = () => {
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const [cutImageUrl, setCutImageUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (cutImageUrl) {
        URL.revokeObjectURL(cutImageUrl);
      }
    };
  }, [cutImageUrl]);

  const resetCutImage = useCallback(() => {
    setCutImageUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
  }, []);

  const cutImage = useCallback(async (polyline: ArchPolyline | null) => {
    const imageElement = imageElementRef.current;
    if (!polyline || !imageElement) return;

    if (!imageElement.complete) {
      try {
        await imageElement.decode();
      } catch (error) {
        console.error("画像の読み込みに失敗しました", error);
        return;
      }
    }

    // Canvas を生成し、アーチでクリップして描画
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    // ... 座標をスケーリングしてクリップパスを描画

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve);
    });
    if (!blob) return;

    const nextUrl = URL.createObjectURL(blob);
    setCutImageUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return nextUrl;
    });
  }, []);

  return { imageElementRef, cutImageUrl, cutImage, resetCutImage } as const;
};
```

**ポイント**
- Blob URL は Gateway 内で `URL.revokeObjectURL` を責任持って解放します。
- Canvas API の操作は try/catch で囲み、Presenter へは結果 (`cutImageUrl`) だけを返します。
- `imageElementRef` を返して Presenter がキャンバス DOM を管理できるようにします。

### 3.2 描画合成 Gateway

```ts
export const useDrawingCompositionGateway = ({ imageElementRef, strokes, replaceImageWithBlob, resetDrawingStrokes, resetCutState }: Params) => {
  const [isApplying, setIsApplying] = useState(false);

  const applyDrawingToImage = useCallback(async () => {
    if (strokes.length === 0 || !imageElementRef.current || isApplying) return;
    setIsApplying(true);

    try {
      const blob = await composeImageWithDrawingStrokes({ imageElement: imageElementRef.current, strokes });
      if (!blob) return;

      replaceImageWithBlob(blob);
      resetDrawingStrokes();
      resetCutState();
    } catch (error) {
      console.error("描画を画像へ反映する処理に失敗しました", error);
    } finally {
      setIsApplying(false);
    }
  }, [imageElementRef, isApplying, replaceImageWithBlob, resetCutState, resetDrawingStrokes, strokes]);

  return { applyDrawingToImage, isApplying } as const;
};
```

**ポイント**
- `isApplying` で並列実行を防ぎ、例外が起きても `finally` でフラグを解除します。
- Presenter に渡すのは副作用の実行関数と進行状況（`isApplying`）のみです。

## 4. 設計ルール

- Gateway 内で取得したリソース（Object URL、WebSocket、イベントリスナーなど）は必ず同一スコープでクリーンアップします。
- 副作用の成否は boolean フラグや戻り値で Presenter に伝え、UI 側でフィードバックを出せるようにします。
- 非同期処理で Use Case を呼び出したくなる場合は、Promise の解決後に Presenter が必要なデータを Use Case へ渡せる設計を検討します。

## 5. テスト戦略

- Vitest / Jest でブラウザ API (`URL.createObjectURL`, `HTMLCanvasElement`) をモックし、リソース解放が行われるか検証します。
- 並列ガード (`isApplying`) が正しく動作し、連続呼び出しで二重実行しないことを確認します。
- 例外発生時のログ出力やリカバリ挙動をテストします。

## 6. 実装チェックリスト

1. ブラウザ API のリソースが確実に解放されているか。
2. 実行中フラグやローディング状態を返して UI が制御できるか。
3. 例外処理が `finally` を含めて適切に実装されているか。
4. Gateway が Presenter 以外に依存していないか（Controller/Use Case から呼び出さない）。
5. テストで主要な副作用パス（成功・失敗）がカバーされているか。

## 7. アンチパターン

- Gateway から Use Case や Domain を直接 import し、状態遷移を行う。
- Presenter で Object URL を生成・解放し、責務が分散する。
- `isApplying` を実装せず、連続クリックで副作用が多重実行される。

Gateway はアプリケーションの副作用を安全に扱うための境界です。例外処理とリソース管理を徹底し、Presenter / Controller に副作用を漏らさない設計を行ってください。

## 関連ドキュメント

- [アーキテクチャ概要](../ARCHITECTURE_GUIDELINES.md)
- [Presenter / View ガイド](framework-presenter-view.md)
- [Use Case ガイド](usecase.md)
- [エラーハンドリング & ロギング](error-handling.md)

