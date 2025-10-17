# Framework / Presenter / View ガイド

> **注意**: 以下のコード例は `WEB-24/drawing/photo_cropping_function` を題材にしていますが、任意の機能でも同じパターンを適用できます。パラメータやモジュール名は要件に合わせて置き換えてください。

## 1. 役割概要

- **Presenter ディレクトリ (`Presenter/**`)** はページ単位のコンテナ。Interface Adapters のフックを束ねて ViewModel を構築し、`View/**` へ渡します。
- **View ディレクトリ (`View/**`)** は純粋な描画コンポーネント。状態を持たず、Props で受け取ったデータのみを用いて UI を描画します。
- Next.js の `app/**` ルートは Presenter をマウントするためのエントリポイントであり、サーバー／クライアントの境界を定義します。

## 2. ディレクトリと命名規約

| ディレクトリ | 内容 | 命名規約 |
|---------------|------|-----------|
| `app/(loggined)/**` | Next.js ルートとレイアウト | ページ名 + `page.tsx` / `layout.tsx` |
| `Presenter/**` | ページコンテナ（Client Component） | `FeatureName` ディレクトリ配下に PascalCase のコンポーネント |
| `View/**` | 描画専用コンポーネント | `FeatureName` ディレクトリ配下に `SomethingView.tsx` |

- Presenter は常に `"use client"` を宣言します。View は可能な限りサーバーコンポーネントですが、ブラウザ API を使う場合は `"use client"` を明示します。
- View から Presenter/Controller を直接 import しないでください。Props で必要なデータとハンドラを受け渡します。

## 3. 実装パターン

### 3.1 Presenter の組み立て

`Presenter/Painting/InclinedBaselineBezierArch.tsx` は Cut/Drawing 両モードを束ねる実例です。Controller, Presenter(ViewModel), Gateway, Adapter を初期化し、View へ Props を渡します。

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";

import { useCutController } from "@/interfaceAdapters/controllers/useCutController";
import { useDrawingController } from "@/interfaceAdapters/controllers/useDrawingController";
import { useCutPresenter } from "@/interfaceAdapters/presenters/useCutPresenter";
import { useDrawingPresenter } from "@/interfaceAdapters/presenters/useDrawingPresenter";
import { useCutImageGateway } from "@/interfaceAdapters/gateways/painting/useCutImageGateway";
import { useDrawingCompositionGateway } from "@/interfaceAdapters/gateways/painting/useDrawingCompositionGateway";
import { useDrawingPointerHandlersAdapter } from "@/interfaceAdapters/adapters/painting/useDrawingPointerHandlersAdapter";
import { useOverlayClickAdapter } from "@/interfaceAdapters/adapters/painting/useOverlayClickAdapter";
import InclinedBaselineBezierArchView from "@/View/Painting/InclinedBaselineBezierArchView";

const InclinedBaselineBezierArch = () => {
  const { imgUrl, loadFile, replaceWithBlob } = useImageObjectUrlGateway();
  const { points, addPoint, resetPoints, undoPoint } = useCutController();
  const { orderedPoints, polyline, hasCutState, hasPolyline } = useCutPresenter({ points, imgUrl });
  const { strokes, activeStroke, beginStroke, appendPointToActiveStroke, finalizeActiveStroke } =
    useDrawingController();
  const { shouldHandlePointer, handlePointerDown, handlePointerMove } = useDrawingPointerHandlersAdapter({
    mode,
    onPointStart: handleStrokeStart,
    onPointAppend: appendPointToActiveStroke,
    onFinalizeStroke: finalizeActiveStroke,
    onCancelStroke: cancelActiveStroke,
  });
  // ...中略（色・モード・プレビュー状態の useState）

  return (
    <InclinedBaselineBezierArchView
      mode={mode}
      onModeChange={handleModeChange}
      orderedPoints={orderedPoints}
      polyline={polyline}
      segments={drawableSegments}
      activeStroke={activeStroke}
      onDrawingPointerDown={shouldHandlePointer ? handlePointerDown : undefined}
      onOverlayClick={handleOverlayClick}
      // ...残りの props
    />
  );
};

export default InclinedBaselineBezierArch;
```

**ポイント**
- Presenter は UI 状態（モード、色など）を `useState` で保持しつつ、ドメイン状態は Controller (Use Case の戻り値) に任せます。
- Gateway の副作用 (`applyDrawingToImage`, `cutImage`) は Presenter から呼び出しますが、内部実装は Gateway に隠蔽されます。
- Adapter で生成したハンドラを View へ渡し、モードに応じて有効化します。

### 3.2 View の構築

`View/Painting/InclinedBaselineBezierArchView.tsx` は Presenter から渡された Props をもとに UI を描画します。

```tsx
import type { FC, ChangeEvent, PointerEvent } from "react";

import ArchControlsView from "@/View/Painting/ArchControlsView";
import ArchCanvasView from "@/View/Painting/ArchCanvasView";
import DrawingPreviewModal from "@/View/Painting/DrawingPreviewModal";

const InclinedBaselineBezierArchView: FC<Props> = ({
  mode,
  onModeChange,
  strokeWidth,
  onStrokeWidthChange,
  orderedPoints,
  polyline,
  segments,
  activeStroke,
  onDrawingPointerDown,
  onDrawingPointerMove,
  // ...省略
}) => {
  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      <ArchControlsView
        mode={mode}
        onModeChange={onModeChange}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={onStrokeWidthChange}
        // ...ボタンやセレクターの props
      />
      <ArchCanvasView
        mode={mode}
        orderedPoints={orderedPoints}
        polyline={polyline}
        segments={segments}
        activeStroke={activeStroke}
        onDrawingPointerDown={onDrawingPointerDown}
        onDrawingPointerMove={onDrawingPointerMove}
        // ...その他描画関連 props
      />
      <DrawingPreviewModal isOpen={isPreviewOpen} previewUrl={previewUrl} onClose={onClosePreview} />
    </div>
  );
};
```

**ポイント**
- View では副作用を持たず、`useEffect` や `useState` を避けます。必要な UI 状態は Presenter から渡します。
- ハンドラは直接 DOM イベントにバインドし、追加処理を行わないことでテスト容易性を高めます。

## 4. 状態管理と Context

- Presenter 内で完結する状態は `useState` / `useMemo` / `useCallback` を用いて管理します。
- 複数 Presenter / View で共有する必要がある状態のみ Context に昇格させ、Provider は Presenter でラップします。
- Context で提供する値は Interface Adapters の API をそのまま渡すのではなく、Presenter でラップした Facade を渡すようにします。

## 5. テスト戦略

- Presenter: React Testing Library の `render` と `screen` を用い、主要な UI イベントが Controller / Gateway を呼ぶかをモックして検証します。
- View: スナップショットではなく、アクセシビリティ属性・クリック／キーボード操作に対するハンドラ呼び出しのみをテストします。
- レンダリングコストが大きい場合は、Presenter と View を分けて個別にテストし、統合テストでは最小限のケースを確認します。

## 6. 実装チェックリスト

1. Presenter で Controller / Presenter(ViewModel) / Gateway / Adapter を初期化したか。
2. View に渡す Props が責務単位でグルーピングされているか（ハンドラ、UI 状態、描画データなど）。
3. 副作用を担う処理が Presenter から Gateway へ委譲されているか。
4. Tailwind クラスが読みやすい順に並び、デザイン規約に従っているか。
5. コンポーネントの分割基準（500 行超、複数ドメイン混在など）を満たしたら責務分割を検討したか。

## 7. アンチパターン

- View 内で Controller や Gateway を直接呼び出す。
- Presenter が `useEffect` を多用して副作用を直書きする。
- View コンポーネントでビジネスロジックやデータ整形を行う。
- Context を安易に導入し、依存方向を複雑化させる。

Presenter / View の構成は最上位レイヤーとして他の設計ガイドの土台になります。詳細は本書の他、関連ドキュメント（Controller・Gateway 等）を参照し、責務境界を明確にした実装を心掛けてください。

## 関連ドキュメント

- [エラーハンドリング & ロギング](error-handling.md)
- [アーキテクチャ概要](../ARCHITECTURE_GUIDELINES.md)
- [Controller ガイド](controller.md)
- [Presenter (ViewModel) ガイド](viewmodel-presenter.md)
- [Gateway ガイド](gateway.md)

