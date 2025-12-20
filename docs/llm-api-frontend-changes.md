# RetentionEngineView Frontend 修正方針

## 概要
retention-engine-serverのLLM API仕様変更に伴い、フロントエンドの修正が必要な箇所と修正方針をまとめます。

## 主な変更点

### 1. SearchSettings型の簡素化
- **削除**: `enableFileSearch`, `allowWebSearch`, `executeWebSearch`の3つのフラグ
- **追加**: `requireWebSearch: boolean`の1つのフラグのみ

### 2. レスポンス型の簡素化
- **削除**: `ResponseType.WEB_SEARCH_CONFIRMATION`
- **削除**: `needsWebSearch`, `webSearchReason`, `confirmationLabels`フィールド
- **維持**: `type`, `answer`, `sources`フィールドのみ

### 3. Web検索の仕様変更
- **変更前**: ユーザー確認ダイアログ → 承認後に再度API呼び出し
- **変更後**: フロントエンドから`requireWebSearch: true`を送信すれば自動的にWeb検索込みの結果を返す

## 修正が必要なファイル一覧

### 1. 型定義ファイル

#### `/src/interfaceAdapters/gateways/api/types.ts`
```typescript
// 変更前
export interface SearchSettings {
  enableFileSearch?: boolean;
  allowWebSearch?: boolean;
  executeWebSearch?: boolean;
}

export enum ResponseType {
  ANSWER = "ANSWER",
  WEB_SEARCH_CONFIRMATION = "WEB_SEARCH_CONFIRMATION",
}

export interface LLMGenerateResponse {
  type: ResponseType;
  answer: string;
  needsWebSearch?: boolean;
  webSearchReason?: string;
  confirmationLabels?: WebSearchConfirmationLabels;
  sources?: ResponseSources;
}

// 変更後
export interface SearchSettings {
  requireWebSearch: boolean; // デフォルト: false
}

export enum ResponseType {
  ANSWER = "ANSWER",
  // WEB_SEARCH_CONFIRMATION を削除
}

export interface LLMGenerateResponse {
  type: ResponseType;
  answer: string;
  sources?: ResponseSources; // fileSearch, webSearch含む
}
```

### 2. APIゲートウェイ

#### `/src/interfaceAdapters/gateways/api/LLMGateway.ts`
```typescript
// リクエストの型を修正
async generateResponse(input: {
  question: string;
  conversationId: string;
  requireWebSearch?: boolean; // SearchSettingsから変更
}): Promise<LLMGenerateResponse>
```

### 3. Presenterレイヤー

#### `/src/interfaceAdapters/presenters/useStudentChatPresenter.ts`

**削除する機能**:
- Web検索確認ダイアログの状態管理（`webSearchPending`）
- `confirmWebSearch`関数
- `cancelWebSearch`関数
- `ResponseType.WEB_SEARCH_CONFIRMATION`の処理

**修正する処理**:
```typescript
// 変更前の初期状態
const [state, setState] = useState<StudentChatState>({
  searchSettings: {
    enableFileSearch: true,
    allowWebSearch: false,
    executeWebSearch: false,
  },
  webSearchPending: null, // 削除
  // ...
});

// 変更後の初期状態
const [state, setState] = useState<StudentChatState>({
  requireWebSearch: false, // シンプルなboolean
  // ...
});

// sendMessage関数の修正
const sendMessage = useCallback(async () => {
  // ...
  const llmResult = await service.generateLLMResponse(
    bootstrap.currentUser,
    bootstrap.conversation,
    messageContent,
    state.requireWebSearch // 単純にbooleanを渡す
  );

  // WEB_SEARCH_CONFIRMATIONの分岐を削除
  // 常にANSWERとして処理
  // ...
});
```

### 4. UIコンポーネント

#### `/src/views/studentChat/ChatComposerLegacy.tsx`

**修正内容**:
1. 複雑な検索設定UIを簡素化
2. Web検索ON/OFFのトグルスイッチのみに

```typescript
// 変更前: 3つの設定
<div className="flex items-center gap-2">
  {/* FileSearch - 常にON */}
  <div className="...">社内検索 常時ON</div>
  
  {/* WebSearch トグル */}
  <button onClick={() => onSearchSettingsChange({
    allowWebSearch: !searchSettings.allowWebSearch
  })}>
    ウェブ検索 {searchSettings.allowWebSearch ? "許可" : "OFF"}
  </button>
</div>

// 変更後: 1つのトグルのみ
<div className="flex items-center gap-2">
  <button
    onClick={() => onRequireWebSearchChange(!requireWebSearch)}
    className={requireWebSearch ? "active" : "inactive"}
  >
    <Globe className="h-3 w-3" />
    Web検索で補強 {requireWebSearch ? "ON" : "OFF"}
  </button>
</div>
```

#### `/src/views/studentChat/StudentChatView.tsx`

**削除**:
- Web検索確認ダイアログのUI全体
- `webSearchPending`に関連するすべての表示ロジック

### 5. Service層

#### `/src/interfaceAdapters/services/StudentChatService.ts`

```typescript
// 変更前
async generateLLMResponse(
  user: User,
  conversation: Conversation,
  question: string,
  searchSettings?: SearchSettings
): Promise<Result<LLMGenerateResponse>>

// 変更後
async generateLLMResponse(
  user: User,
  conversation: Conversation,
  question: string,
  requireWebSearch: boolean = false
): Promise<Result<LLMGenerateResponse>>
```

## UI/UXへの影響

### 1. ユーザー体験の簡素化
- **変更前**: 社内検索 → 不十分な場合に確認ダイアログ → 承認してWeb検索
- **変更後**: 事前にWeb検索ON/OFFを選択 → 1回のリクエストで完結

### 2. レスポンス時間
- **改善**: 確認ダイアログ→再リクエストの往復がなくなるため高速化
- **注意**: Web検索ONの場合は初回レスポンスが若干遅くなる可能性

### 3. UI要素の削減
- Web検索確認ダイアログの削除
- 検索設定UIの簡素化（3つのオプション → 1つのトグル）

## 実装手順

1. **型定義の更新** (`types.ts`)
2. **APIゲートウェイの修正** (`LLMGateway.ts`)
3. **Service層の修正** (`StudentChatService.ts`)
4. **Presenter層の修正** (`useStudentChatPresenter.ts`)
   - 状態管理の簡素化
   - Web検索確認機能の削除
5. **UIコンポーネントの更新**
   - `ChatComposerLegacy.tsx`: 検索設定UIの簡素化
   - `StudentChatView.tsx`: 確認ダイアログの削除
6. **テスト**
   - Web検索なし/ありの両パターン
   - エラーハンドリング確認

## 注意事項

1. **後方互換性**: 移行期間中は旧APIも動作する可能性があるため、段階的な移行を検討
2. **エラーメッセージ**: Web検索失敗時のエラー表示をユーザーフレンドリーに
3. **キャッシュ**: Web検索結果もキャッシュされるため、同一質問での再検索は高速化
4. **料金**: Web検索は有料（$35/1000クエリ）のため、デフォルトOFFを推奨

## まとめ

この修正により、以下のメリットが得られます：
- コードの大幅な簡素化（削除が多い）
- ユーザー体験の向上（確認ステップ削減）
- パフォーマンス向上（往復通信削減）
- 保守性の向上（複雑な状態管理の削除）