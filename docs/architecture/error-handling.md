# エラーハンドリング & ロギング ガイド

> **注意**: 以下のパターンは一般的な Web アプリ（Next.js + React + API/Gateway 構成）で広く利用されている標準的な手法です。案件固有の要件が判明したら、本ガイドを上書きしてください。

## 1. 基本原則

- **失敗の早期検出**: ドメイン層で入力検証を行い、無効な状態を早期に弾きます。
- **境界ごとの責務分離**: Gateway が外部エラーを捕捉し、Presenter へエラー状態を渡します。View はユーザー向けメッセージの提示に専念します。
- **ログ一貫性**: すべてのロギングは `infra/logging` に定義したファサード (仮) を経由させ、出力先（Console / Sentry / Datadog 等）の差異を吸収します。
- **再現性**: エラーオブジェクトには `component`, `action`, `context` を含むメタデータを付与し、再現手順を特定しやすくします。

## 2. エラー分類

| 種別 | 例 | 取り扱い |
|------|----|-----------|
| バリデーション (Domain) | 入力値不足、ポイント数 < 最小値 | Use Case が早期に失敗を返し、Presenter で UI 状態に反映 |
| ユーザー操作 (UI) | ポインタキャンセル、未選択 | Adapter / Presenter で通知。ロギング不要 |
| 外部サービス (Gateway) | Canvas API 失敗、Object URL 生成失敗、API タイムアウト | Gateway で捕捉し、`logError` で送出。Presenter はリトライ UI を提示 |
| 想定外 (Bug) | null 参照、型不整合 | Global error boundary / Sentry へ報告し、ユーザーへ汎用エラーメッセージ |

## 3. 実装パターン

### 3.1 Gateway での捕捉

```ts
import { logError } from "@/infra/logging";

try {
  const blob = await composeImageWithDrawingStrokes(...);
  if (!blob) {
    throw new Error("DRAWING_COMPOSITION_EMPTY");
  }
} catch (error) {
  logError({
    component: "useDrawingCompositionGateway",
    action: "compose",
    context: { strokeCount: strokes.length },
    error,
  });
  setGatewayState({ status: "error" });
}
```

### 3.2 Presenter での UI 返却

```ts
return {
  ...viewModel,
  error: gatewayState.status === "error" ? "描画の反映に失敗しました。再試行してください" : null,
  canRetry: gatewayState.status === "error",
} as const;
```

### 3.3 View での表示

```tsx
{error && (
  <Alert severity="error" actions={canRetry ? <RetryButton onClick={onRetry} /> : null}>
    {error}
  </Alert>
)}
```

## 4. ログフォーマット推奨

```ts
interface LogPayload {
  level: "info" | "warn" | "error";
  component: string; // 例: useCutImageGateway
  action: string; // 例: cut
  message?: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

export const logError = (payload: LogPayload) => {
  if (process.env.NEXT_PUBLIC_LOG_LEVEL === "debug") {
    console.error(payload);
  }
  // TODO: Sentry など本番向け転送を実装
};
```

- Production では Sentry/Datadog など外部サービスへ送信し、Develop/Local では Console に記録します。
- ログメッセージにはユーザー情報等の個人データを含めないようにします。

## 5. エラー境界（React）

- Next.js App Router では `error.tsx` と `not-found.tsx` を利用し、ページ単位で予期せぬエラーを捕捉します。
- Client Component で大域的に捕捉したい場合は `ErrorBoundary` (react-error-boundary 等) を利用し、ログ出力後に Fallback UI を表示します。

## 6. テスト

- Gateway テスト: API 失敗・例外発生をモックし、`logError` が呼ばれるか、エラー状態が Presenter へ伝播するかを検証します。
- Presenter テスト: エラー状態が ViewModel のフラグやメッセージに反映されるか確認します。
- View テスト: エラーアラートが期待通り表示され、リトライハンドラが呼び出されるか検証します。

## 7. TODO / 追加検討

- `@/infra/logging` の具象実装（Sentry, Cloud Logging 等）
- ユーザー通知（Toast・モーダル）で使用するメッセージ辞書
- 監査ログ（ユーザー操作履歴）の扱い

## 関連ドキュメント

- [アーキテクチャ概要](../ARCHITECTURE_GUIDELINES.md)
- [Gateway ガイド](gateway.md)
- [Presenter (ViewModel) ガイド](viewmodel-presenter.md)
