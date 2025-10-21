# アーキテクチャガイドライン概要（Clean Architecture 志向）

このドキュメントは TMA Webpage における Clean Architecture 運用方針のハブです。レイヤー間の責務、依存方向、設計判断の原則を俯瞰し、詳細な実装ルールやコード例は各専用ドキュメントへのリンクから参照してください。

> 詳細ガイドの索引は [ドキュメント一覧](#ドキュメント一覧) を参照してください。

## 1. レイヤー構成と依存方向

```
Framework / UI
  └─ Presenter / View
        ↓
Interface Adapters
  ├─ Controller
  ├─ Presenter (ViewModel)
  ├─ UI Event Adapter
  └─ Gateway
        ↓
Application / Use Cases
        ↓
Domain / Entities
```

- 依存矢印は常に内向き（UI → Interface Adapters → Application → Domain）。
- Domain / Use Case は純粋関数で構成し、副作用は Interface Adapters に閉じ込めます。
- 型定義 (`@/type/**`) と定数 (`@/constants/**`) はレイヤー間契約として扱い、変更時は影響範囲をレビューします。

レイヤーごとの責務は以下の表を参照し、詳細なルールやコード例は各リンクから確認してください。

> UI に関する詳細なレイアウト・カラー・アクセシビリティの規約は [DESIGN_GUIDELINES.md](DESIGN_GUIDELINES.md) を参照してください。

| Layer | 主な責務 | 代表ディレクトリ | 詳細ガイド |
|-------|----------|------------------|------------|
| Framework / UI | ページ構成・コンテナ・描画 | `app/**`, `src/interfaceAdapters/pages/**`, `src/views/**` | [Framework / Presenter / View](architecture/framework-presenter-view.md) |
| Interface Adapters: Controller | Use Case 呼び出しと UI 状態管理 | `interfaceAdapters/controllers/**` | [Controller ガイド](architecture/controller.md) |
| Interface Adapters: Presenter | ViewModel 生成・派生値計算 | `interfaceAdapters/presenters/**` | [Presenter (ViewModel) ガイド](architecture/viewmodel-presenter.md) |
| Interface Adapters: UI Event Adapter | DOM/Pointer 変換・正規化 | `interfaceAdapters/adapters/**` | [UI Event Adapter ガイド](architecture/ui-event-adapter.md) |
| Interface Adapters: Gateway | 副作用・外部 API 抽象化 | `interfaceAdapters/gateways/**` | [Gateway ガイド](architecture/gateway.md) |
| Application / Use Cases | シナリオ制御・状態遷移 | `application/**/useCases/**` | [Use Case ガイド](architecture/usecase.md) |
| Domain / Entities | ビジネスロジックの中核 | `domain/**`, `utils/**` | [Domain ガイド](architecture/domain.md) |
| Cross-cutting | 型・定数・設定 | `type/**`, `constants/**`, `tsconfig.json` | [Cross-cutting ガイド](architecture/cross-cutting.md) |
| Error Handling / Logging | 例外処理・ログ基準 | `interfaceAdapters/gateways/**`, `infra/**` | [エラーハンドリング & ロギング](architecture/error-handling.md) |

## 2. 依存関係の基本ルール

- `@/*` のエイリアス（`tsconfig.json`）を使用し、深い相対パスを禁止します。
- import 順序は「外部依存 → `@/` エイリアス → 同一ディレクトリ相対」を遵守します。
- レイヤーをまたぐ再利用が必要な場合は、共通モジュールを新設して公開 API からアクセスさせます。
- テストは対象モジュールと同じ階層、または `__tests__` 配下に配置し、ユースケースごとの依存方向を崩さない構成を維持します。

## 3. AI / 自動生成向けワークフロー

自動生成エージェントが新機能を追加するときは、以下の手順を順番に実施してください。

1. **要件分析**: ユーザー要望をレイヤーごとの責務にマッピングし、該当ドキュメント (Controller, Use Case など) を参照する。
2. **型・定数定義**: 必要な値オブジェクトや定数を `type/**`, `constants/**` に追加し、Cross-cutting ガイドに従って設計する。
3. **Domain / Use Case 実装**: 純粋関数でロジックを構築し、テスト (テーブル駆動) を用意する。詳細は [Use Case ガイド](architecture/usecase.md) と [Domain ガイド](architecture/domain.md) を参照。
4. **Interface Adapters 実装**: Controller・Presenter(ViewModel)・Adapter・Gateway を順に作成し、各ガイドの命名規約とテスト戦略に従う。
5. **ページコンテナ / View 統合**: `src/interfaceAdapters/pages/**` で各フックを組み合わせ、`src/views/**` に Props を渡す。UI 開発ルールは [Framework / Presenter / View](architecture/framework-presenter-view.md) を参照。
6. **検証**: `npm run lint` や関連テストを実行し、依存方向が守られているか確認する。必要に応じてドキュメントを更新し、変更点を記録する。
7. **ケーススタディ照合**: 類似機能が存在する場合 (例: WEB-24) を参照し、実装差分をレビューする。

## 4. 写真切り抜き・描画機能（WEB-24）のリファレンスフロー

1. **Routing**: `app/(loggined)/painting/page.tsx` が Presenter をマウント。
2. **Presenter 初期化**: Gateway・Controller・Presenter(ViewModel)・Adapter を束ね、ViewModel を組み立てる。
3. **イベント処理**: UI Event Adapter が Pointer/Click をキャンバス座標へ正規化し Controller へ伝播。
4. **状態遷移**: Controller が Use Case (`manageDrawing.ts`, `manageCut.ts`) を呼び出し、新しい状態を生成。
5. **ViewModel**: Interface Presenter が派生データと UI 制御フラグを生成。
6. **副作用**: Gateway (`useDrawingCompositionGateway`, `useCutImageGateway`) が Canvas API や Blob URL を扱う。
7. **描画**: View (`View/Painting/InclinedBaselineBezierArchView.tsx`) が ViewModel を受け取り UI を描画。

このパイプラインは全機能で共通する基本形です。詳細な実装手順とコード例は [Presenter ガイド](architecture/framework-presenter-view.md) ほか各ドキュメントを参照してください。

## 5. 新機能開発チェックリスト

1. 要件をレイヤーごとの責務に分類し、既存ドキュメントで該当章を確認。
2. Domain → Use Case → Controller → Presenter(ViewModel) → View → Gateway / Adapter の順に設計。
3. 依存方向が内向きかどうか `eslint-import` などで検証。
4. テスト（Domain: テーブル駆動、Controller/Presenter: `renderHook`, Gateway: API モック, View: インタラクション）を用意。
5. 変更点をガイドラインに反映する必要があれば該当詳細ドキュメントを更新。

## 6. ベストプラクティス

- 命名規則：`useSomethingController`, `useSomethingPresenter`, `somethingUseCase` など責務が一目で分かる名前を採用。
- Gateway では `isApplying` などの排他フラグとリソース解放（`URL.revokeObjectURL` 等）を必ず実装。
- ESLint (`extends: next/core-web-vitals`) と Prettier を必ず通し、Tailwind クラスは「レイアウト → サイズ → 色 → 装飾」の順で整理。
- `import type` を活用し、未使用 import は `npm run lint -- --fix` で除去。
- Presenter が肥大化した場合は責務ごとに分割し、Context への昇格は複数 Presenter / View で共有する場合に限定。

## 7. ドキュメント一覧

| ドキュメント | 内容 |
|--------------|------|
| [Framework / Presenter / View](architecture/framework-presenter-view.md) | ページコンテナ・View コンポーネントの責務とコード例 |
| [Controller ガイド](architecture/controller.md) | Use Case 呼び出し・状態管理パターン |
| [Presenter (ViewModel) ガイド](architecture/viewmodel-presenter.md) | ViewModel 変換・フラグ算出パターン |
| [UI Event Adapter ガイド](architecture/ui-event-adapter.md) | Pointer / Mouse 変換のベストプラクティス |
| [Gateway ガイド](architecture/gateway.md) | 副作用管理・Canvas / Blob 取り扱い例 |
| [Use Case ガイド](architecture/usecase.md) | 状態遷移と Domain 結合方法、テスト例 |
| [Domain ガイド](architecture/domain.md) | 純粋関数・幾何演算ユーティリティの設計指針 |
| [Cross-cutting ガイド](architecture/cross-cutting.md) | 型・定数・設定ファイルの統一ルール |
| [エラーハンドリング & ロギング](architecture/error-handling.md) | 共通エラー分類とログフォーマット、通知パターン |

各詳細ドキュメントでは、`WEB-24/drawing/photo_cropping_function` で実装された実例コードを基に、責務・依存関係・テスト戦略・アンチパターンを解説しています。新規開発やリファクタリングの際は概要 → 詳細の順に参照し、プロジェクト全体の一貫性を維持してください。
