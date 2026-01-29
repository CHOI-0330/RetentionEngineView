# ナレッジ抽出 & ナレッジライブラリ（フロントエンド）

## 概要

ベテラン社員がAIチャットで業務相談をする中で生まれた暗黙知を、チーム共有可能なナレッジとして抽出・閲覧・管理するフロントエンド機能。

2つの画面で構成される:

1. **ナレッジ抽出ダイアログ**: チャット画面内で会話からナレッジを抽出するUI
2. **ナレッジライブラリ**: 蓄積されたナレッジを一覧・検索・カテゴリ編集する画面

---

## 1. ナレッジ抽出ダイアログ

### ファイル

- `src/components/KnowledgeExtraction/KnowledgeExtractionDialog.tsx` — ダイアログ本体
- `src/components/KnowledgeExtraction/index.ts` — エクスポート
- `src/interfaceAdapters/gateways/api/KnowledgeGateway.ts` — API通信

### 配置場所

チャット画面（StudentChatView）内のボタン「知識を抽出」から起動。

### 状態遷移

```
idle → extracting → preview → saving → success
                                    ↘ error
```

| 状態 | 表示内容 |
|------|----------|
| `idle` | 抽出範囲選択（すべて / 直近20件） |
| `extracting` | ローディング（「AIが会話を分析しています...」） |
| `preview` | 候補一覧（チェックボックスで選択可能） |
| `saving` | 保存中ローディング |
| `success` | 保存完了（件数表示 + 重複スキップ件数） |
| `error` | エラー表示 |

### 抽出フロー

```
1. ユーザーが「知識を抽出」ボタンをクリック
2. 抽出範囲を選択（all / recent）
3. POST /knowledge/extract → プレビュー候補を取得
4. 候補一覧を表示、ユーザーがチェックボックスで選択
5. 「選択した項目を保存（N件）」をクリック
6. POST /knowledge/save → 保存実行
7. 結果表示（保存件数 + 重複スキップ件数）
```

### API呼び出し

| メソッド | エンドポイント | 用途 |
|---------|---------------|------|
| `extractKnowledgePreview()` | `POST /knowledge/extract` | LLM抽出（プレビューのみ） |
| `saveKnowledge()` | `POST /knowledge/save` | 選択した候補を保存 |

### カテゴリバッジの色

```typescript
const categoryColors = {
  "対応方法": "bg-blue-100 text-blue-800",
  "業界用語": "bg-purple-100 text-purple-800",
  "業務知識": "bg-green-100 text-green-800",
};
```

---

## 2. ナレッジライブラリ（一覧画面）

### ファイル

- `src/views/KnowledgeListView.tsx` — View（表示 + カテゴリ編集）
- `src/interfaceAdapters/presenters/useKnowledgeListPresenter.ts` — Presenter Hook
- `src/interfaceAdapters/pages/entitle/KnowledgeListPage.tsx` — Page（組み立て）
- `src/interfaceAdapters/gateways/api/KnowledgeGateway.ts` — API通信

### アーキテクチャ

Clean Architecture に準拠:

```
KnowledgeListPage (Page)
└── useKnowledgeListPresenter (Presenter Hook)
    └── KnowledgeGateway (Gateway)
        └── apiFetch → バックエンドAPI

KnowledgeListView (View)
├── viewModel: KnowledgeListViewModel  ← 表示に必要なデータ
└── actions: KnowledgeListActions      ← ユーザー操作
```

### ViewModel

```typescript
interface KnowledgeListViewModel {
  items: KnowledgeListItem[];
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  hasMore: boolean;
}
```

### Actions

```typescript
interface KnowledgeListActions {
  setCategory: (category: string | null) => void;  // カテゴリフィルタ
  setSearchQuery: (query: string) => void;          // 検索（300msデバウンス）
  loadMore: () => Promise<void>;                    // ページネーション
  refresh: () => Promise<void>;                     // 再読み込み
}
```

### 画面構成

```
┌─────────────────────────────────────────┐
│  ナレッジライブラリ         [更新ボタン]   │
│  チームが蓄積したナレッジを閲覧できます（N件）│
├─────────────────────────────────────────┤
│  [すべて] [対応方法] [業界用語] [業務知識]  │  ← カテゴリフィルタ
│  [🔍 ナレッジを検索...]                    │  ← テキスト検索
├─────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │カード │ │カード │ │カード │            │  ← 3カラムグリッド
│  └──────┘ └──────┘ └──────┘            │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │カード │ │カード │ │カード │            │
│  └──────┘ └──────┘ └──────┘            │
│                                         │
│          [もっと見る]                     │  ← ページネーション
└─────────────────────────────────────────┘
```

### カード → 詳細モーダル

カードをクリックすると詳細モーダルが開く。モーダル内で:

- ナレッジの全文表示
- カテゴリ変更（Selectコンポーネント）→ `PATCH /knowledge/:id`
- タグ一覧表示

カテゴリ変更時のフロー:
```
1. ユーザーがSelectでカテゴリを変更
2. KnowledgeGateway.updateKnowledge(id, { category }) を呼び出し
3. 成功時: モーダル内の表示を更新 + actions.refresh() で一覧も更新
4. エラー時: モーダル内にエラーメッセージ表示
```

### ページネーション

- 1ページあたり20件（`PAGE_SIZE = 20`）
- `hasMore` が `true` の場合「もっと見る」ボタン表示
- `loadMore` でオフセットを増やして追加読み込み（既存リストに追加）

### 検索

- テキスト入力は300msデバウンス付き
- バックエンドの `ilike` 検索（content カラムの部分一致）

---

## 3. KnowledgeGateway

### ファイル

- `src/interfaceAdapters/gateways/api/KnowledgeGateway.ts`

### メソッド一覧

| メソッド | HTTP | エンドポイント | 用途 |
|---------|------|---------------|------|
| `extractKnowledgePreview()` | POST | `/knowledge/extract` | LLM抽出プレビュー |
| `saveKnowledge()` | POST | `/knowledge/save` | 選択した候補を保存 |
| `updateKnowledge()` | PATCH | `/knowledge/:id` | カテゴリ更新 |
| `listKnowledge()` | GET | `/knowledge` | 一覧取得（フィルタ・ページネーション） |

### 認証

全リクエストに `accessToken` をヘッダーに付与（`apiFetch` 経由）。

### ベースURL

`process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001"`

---

## 4. 型定義

### KnowledgeListItem（一覧表示用）

```typescript
interface KnowledgeListItem {
  id: string;
  content: string;
  category: string;
  tags: string[];
  extracted_by: string;
  created_at: string;
}
```

### KnowledgeCandidate（抽出プレビュー用）

```typescript
interface KnowledgeCandidate {
  content: string;
  category: string;
  tags: string[];
}
```

### SaveKnowledgeItem（保存リクエスト用）

```typescript
interface SaveKnowledgeItem {
  content: string;
  category: string;
  tags: string[];
}
```

---

## 5. 関連するチャット画面のファイル

ナレッジ抽出ダイアログはチャット画面内に配置されている。

| ファイル | 役割 |
|---------|------|
| `src/interfaceAdapters/pages/entitle/StudentChatPage.tsx` | チャットページ |
| `src/views/studentChat/` | チャットView群 |
| `src/interfaceAdapters/presenters/useStudentChatPresenter.ts` | チャットPresenter |
| `src/interfaceAdapters/gateways/api/StudentChatGateway.ts` | チャットAPI Gateway |
| `src/interfaceAdapters/gateways/api/LLMGateway.ts` | LLM API Gateway |
| `src/interfaceAdapters/gateways/api/MessageGateway.ts` | メッセージAPI Gateway |

### AIチャットのパーソナリティ設定

ユーザーがAIの性格プリセットを選択する画面:

| ファイル | 役割 |
|---------|------|
| `src/interfaceAdapters/pages/entitle/AISettingsPage.tsx` | 設定ページ |
| `src/views/PersonalityPresetSelector.tsx` | プリセット選択UI |
| `src/interfaceAdapters/presenters/usePersonalityPresetPresenter.ts` | Presenter |
| `src/interfaceAdapters/gateways/api/PersonalityPresetGateway.ts` | API Gateway |

---

## 6. UIライブラリ

shadcn/ui ベースのコンポーネントを使用:

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
- `Button`, `Badge`, `Input`, `Checkbox`, `Label`
- `RadioGroup`, `RadioGroupItem`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `Skeleton`

アイコン: `lucide-react`（`Sparkles`, `Loader2`, `CheckCircle`, `AlertCircle`, `Search`, `BookOpen`, `RefreshCw`）
