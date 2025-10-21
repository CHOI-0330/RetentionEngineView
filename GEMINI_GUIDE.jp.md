# RetentionEngineView AI 開発ガイド

## 1. プロジェクト概要

**RetentionEngineView**は、若手社員の学習効率と定着率（リテンション）を向上させるために設計された AI 搭載の教育プラットフォームです。このシステムは「若手社員」と「メンター」という 2 つの主要な役割に応じた専用のインターフェースを備えています。中心的なコンセプトは**「メンター・イン・ザ・ループ（Mentor-in-the-Loop）」**システムであり、若手社員は AI チューターと対話し、人間のメンターがその対話をレビューしてフィードバックを提供し、AI の知識ベースを継続的に改善します。

## 2. 主要なビジネスロジック

このアプリケーションは、相互に関連する 3 つのフィードバックループに基づいて動作します。

### a. 若手社員-AI 学習ループ（基本学習）

- **主体**: 若手社員
- **プロセス**:
  1. 若手社員が`StudentChatView`（App Router: `/student`）を通じて AI チューターに質問します。
  2. AI がリアルタイムで回答し、基本的な学習体験を提供します。
  3. 会話履歴とフィードバックは同じ画面で読み込まれ、すぐに復習に活用できます。

### b. メンター-AI 品質管理ループ（フィードバックと添削）

- **主体**: メンター
- **プロセス**:
  1. システムが特定の AI との会話を「レビュー必要」として自動的に分類します。
  2. メンターは`MentorDashboardView`（App Router: `/mentor`）でレビュー対象の会話リストを確認します。
  3. 詳細レビューは`MentorStudentChatView`（App Router: `/mentor/chat/[convId]`）で行います。
  4. メンターは AI の回答を直接**添削**し、なぜそのように修正したかについての**コメント**を追加できます。
  5. 添削の結果は学生チャット画面に即時反映され、二次学習に活用されます。

### c. 知識ベース強化ループ（システムの成長）

- **主体**: メンター
- **プロセス**:
  1. メンターの添削内容は、一回限りのフィードバックに留まらず、永続的な知識資産へと転換されます。
  2. 知識ベース化のフローは現在ドキュメント設計段階であり、`docs/` の仕様に沿って今後実装される予定です。
  3. 「公開」されたドキュメントは中央知識ベースに蓄積される想定で API / UI を設計します。
  4. この検証済みの知識ベースは、将来的に AI モデルのファインチューニングや、類似の質問に対する AI の回答精度を向上させるために使用されます。これにより、システム全体が時間と共により賢くなっていきます。

## 3. 主要画面とエントリーポイント

### Next.js エントリーポイント

- **`app/page.tsx`**: 公開ホーム。認証状態を確認して `AuthPage` をレンダリングします。
- **`app/student/page.tsx`**: 若手社員用チャット画面（`StudentChatPage`）へのエントリーポイントです。
- **`app/mentor/page.tsx`**: メンター向けダッシュボード（`MentorDashboardPage`）のエントリーポイントです。
- **`app/mentor/chat/[convId]/page.tsx`**: 特定の会話をレビューするメンター向け詳細ページです。

### インターフェースアダプタ（ページコンテナ）

- **`src/interfaceAdapters/pages/entitle/AuthPage.tsx`**: 認証コントローラ／プレゼンターをまとめて `AuthView` に渡します。
- **`src/interfaceAdapters/pages/entitle/StudentChatPage.tsx`**: StudentChat のコントローラ・プレゼンター・Supabase/サンドボックス適応を統合します。
- **`src/interfaceAdapters/pages/entitle/MentorDashboardPage.tsx`**: メンターのダッシュボード処理を管理します。
- **`src/interfaceAdapters/pages/entitle/MentorStudentChatPage.tsx`**: メンターが個別会話をレビューするロジックを担当します。

### View レイヤー

- **`src/views/StudentChatView.tsx`**: 若手社員と AI の会話、フィードバック、会話選択 UI を提供します。
- **`src/views/MentorDashboardView.tsx`**: レビュー対象の学生一覧と状態指標を表示します。
- **`src/views/MentorStudentChatView.tsx`**: メンターによる個別会話レビュー UI を提供します。
- **`src/views/AuthView.tsx`**: ログイン／登録／セッション状態を表示します。

### UI プリミティブ

- **`src/components/ui/`**: shadcn/ui ベースの再利用可能なボタン、カード、ダイアログなどの基本コンポーネント群です。

## 4. 開発環境の実行

- 以下のコマンドを使用して開発サーバーを起動します。
  ```bash
  npm run dev
  ```
