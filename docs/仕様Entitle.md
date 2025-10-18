以下は、TypeScript + React (Next.js) 実装を前提に、codex.cli の出力と添付アーキテクチャ資料を踏まえてまとめ直した **Entitle（エンティティ）設計書（Markdown）**です。Clean Architecture の責務分離・依存方向・型/状態・ポート/アダプタ結線・テスト/運用指針まで、実装に直結する形で記述しています。

---

# Entitle 設計書（for TypeScript + Next.js）

## 0) 目的と範囲

本書は、新入社員—メンターの学習支援システムにおける **ドメイン・エンティティ**の定義と、Clean Architecture に沿った依存方向・設計指針を確定する。エンティティ/ユースケースは **純粋関数**で保持し、ブラウザ・外部 API 等の **副作用は Interface Adapters（Gateway）** に隔離する。

---

## 1) レイヤーと依存方向

```
Framework / UI（Next.js app, Presenter, View）
   ↓
Interface Adapters（Controller, Presenter VM, UI Event Adapter, Gateway）
   ↓
Application / Use Cases
   ↓
Domain / Entities
```

- 依存は常に内向き（UI → IA → UseCases → Domain）
- Domain / Use Case は純粋（副作用なし）、副作用は Gateway に閉じ込める
- 共通の型/定数は契約として `@/type/**` / `@/constants/**` に集約
- Next.js では **Presenter がページ単位のコンテナ**、**View は純粋描画**に徹する
- DOM/Pointer 正規化は **UI Event Adapter** が受け持つ
- **Controller は Use Case の橋渡し＋最小状態のみ**（副作用禁止）

---

## 2) エンティティ・カタログ

| エンティティ         | 役割                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| **User**             | 行為主体（NEW_HIRE / MENTOR / ADMIN）。権限判断の基準。                       |
| **MentorAssignment** | メンター ↔ 新入社員の担当リンク（権限の根拠、履歴管理）。                     |
| **Conversation**     | 新入社員が所有する会話スレッド。並び替え/アーカイブ状態を保持。               |
| **Message**          | 会話の 1 発話（NEW_HIRE / ASSISTANT）。ASSISTANT はストリーミング状態をもつ。 |
| **Feedback**         | ASSISTANT メッセージへのコメント（主にメンター）。                            |
| **ModelConfig**      | どのモデルをどのパラメータで使うか（既定/バージョン追跡）。                   |
| **LLMRuntime**       | 実行環境（remote/local、アダプタ、エンドポイント）定義。                      |

> すべて UUID を PK に採用し、FK で厳格に結合。型は `@/type/**` に集約してレイヤー間の契約にする。

---

## 3) TypeScript 型（POJO）

```ts
// @/type/core.ts
export type UserRole = "NEW_HIRE" | "MENTOR" | "ADMIN";
export type ConvState = "ACTIVE" | "ARCHIVED";
export type AssistantStatus = "DRAFT" | "PARTIAL" | "DONE" | "CANCELLED";

export interface User {
  userId: string;
  role: UserRole;
  displayName: string;
  email: string;
  createdAt: string;
  disabledAt?: string | null;
}

export interface MentorAssignment {
  mentorId: string;
  newhireId: string;
  createdAt: string;
  revokedAt?: string | null;
  createdBy?: string | null;
  note?: string | null;
}

export interface Conversation {
  convId: string;
  ownerId: string;
  title: string;
  state: ConvState;
  createdAt: string;
  lastActiveAt: string;
  archivedAt?: string | null;
}

export type MessageRole = "NEW_HIRE" | "ASSISTANT";
export interface Message {
  msgId: string;
  convId: string;
  role: MessageRole;
  content: string;
  status?: AssistantStatus;
  createdAt: string;
}

export type FeedbackAuthorRole = "MENTOR" | "NEW_HIRE";
export interface Feedback {
  fbId: string;
  targetMsgId: string;
  authorId: string;
  authorRole: FeedbackAuthorRole;
  content: string;
  createdAt: string;
  updatedAt?: string | null;
  visibility?: "ALL" | "OWNER_ONLY" | "MENTOR_ONLY";
}

export interface LLMRuntime {
  runtimeId: string;
  kind: "remote" | "local";
  adapter: string;
  endpoint: string;
  modelPath?: string | null;
  authRef?: string | null;
  headers?: Record<string, string>;
  settings?: Record<string, unknown>;
  createdAt: string;
  archivedAt?: string | null;
}

export interface ModelConfig {
  modelId: string;
  runtimeId: string;
  name: string;
  params: { temperature?: number; maxTokens?: number; topP?: number };
  isDefault: boolean;
  createdAt: string;
}
```

- 共通型は `@/type/**` に集約（契約の単一場所）。パスは `@/*` エイリアスで統一。

---

## 4) 状態機械（State Machines）

### 4.1 Conversation

- `ACTIVE ↔ ARCHIVED`。
- 新規メッセージ/FB が発生したとき **ACTIVE のみ** `lastActiveAt` を更新。
- 並び順は `ORDER BY lastActiveAt DESC, convId` で安定させる。

### 4.2 Message（ASSISTANT）

```
DRAFT → PARTIAL（最初のデルタ）
PARTIAL → PARTIAL（追加デルタ）
PARTIAL → DONE（finalize）
DRAFT/PARTIAL → CANCELLED（中断）
```

- ストリーミングの順序/冪等性を担保するため、`(msgId, seqNo)` ユニークを持つ補助テーブルでデルタを保持し、最終合本は `message.content` に集約する。
- Domain / UseCase は純粋関数で状態のみを更新。

---

## 5) 権限とポリシー概説

- **所有者原則**：NEW_HIRE は自分の Conversation 範囲のみ操作/閲覧。
- **メンター範囲**：`MentorAssignment(mentorId,newhireId)` の **アクティブ行** がある場合のみ対象 Conversation/Feedback にアクセス可。
- ポリシーは **PolicyPort** で抽象化し、IA/UseCase から問い合わせる（任意）。
- 失敗は Use Case で **早期失敗** として扱い、Presenter が UI 状態へ反映。

---

## 6) ポート/アダプタ（Ports & Adapters）

### 6.1 Ports（Domain/Application 側のインタフェース）

```ts
// @/application/ports.ts
export interface MessagePort {
  createUserMessage(
    convId: string,
    content: string
  ): Promise<{ msgId: string }>;
  beginAssistantMessage(convId: string): Promise<{ msgId: string }>;
  appendAssistantDelta(
    msgId: string,
    delta: string,
    seqNo: number
  ): Promise<void>;
  finalizeAssistantMessage(msgId: string, finalText: string): Promise<void>;
  listConversationMessages(
    convId: string,
    cursor?: string,
    limit?: number
  ): Promise<{ items: Message[]; nextCursor?: string }>;
}

export interface FeedbackPort {
  createFeedback(input: {
    targetMsgId: string;
    authorId: string;
    content: string;
  }): Promise<{ fbId: string }>;
  listFeedbacks(
    msgId: string,
    cursor?: string,
    limit?: number
  ): Promise<{ items: Feedback[]; nextCursor?: string }>;
}

export interface LLMPort {
  streamGenerate(args: {
    prompt: unknown;
    model: { name: string; params?: Record<string, unknown> };
    runtime: LLMRuntime;
  }): AsyncIterable<string>;
}

export interface PolicyPort {
  isOwner(userId: string, convId: string): Promise<boolean>;
  isMentorMapped(mentorId: string, newhireId: string): Promise<boolean>;
  canCreateFeedback(authorId: string, targetMsgId: string): Promise<boolean>;
}
```

### 6.2 Adapters（Prisma Repository / LLM Adapter / RLS Adapter）

- Gateway は **副作用（API/ストレージ/ブラウザ API）をカプセル化**。実行中フラグ、リソース解放、例外処理まで責任範囲で完結。
- Presenter が Gateway を呼び出し、内部詳細は隠蔽。
- **UI Event Adapter** は DOM/Pointer をドメインフレンドリーなデータへ正規化（座標変換・Pointer Capture 等）。
- **Controller** は Use Case の呼び出しと最小状態の保持に限定（副作用なし）。
- **Presenter** は派生値/制御フラグを計算する純粋フック（`useMemo` 活用）。

---

## 7) Use Case（Application）— 純粋関数による状態展開

- Use Case は **ドメイン関数（純粋）** を組み合わせ、 **完全な新状態** を返す。非決定性や副作用は禁止（テスト容易性）。

例（抜粋）:

```ts
// @/application/chat/useCases.ts
export const createUserMessageUseCase = (
  conv: Conversation,
  payload: { content: string }
) => {
  // ここでは状態遷移の意思決定のみ行い、永続化は Port 経由で IA に委譲する方針
  return {
    kind: "READY_TO_PERSIST",
    convId: conv.convId,
    content: payload.content,
  } as const;
};

export const reduceAssistantStreamUseCase = (prev: Message, delta: string) => {
  if (prev.status === "DRAFT")
    return { ...prev, status: "PARTIAL", content: delta };
  if (prev.status === "PARTIAL")
    return { ...prev, content: prev.content + delta };
 return prev; // DONE/CANCELLED は変更しない
};
```

- `createConversationUseCase`
  - **入力**: `requester (NEW_HIRE)`, `title`, `mentorId`, `allowedMentorIds`
  - **検証**:
    - タイトルが必須かつ上限文字数以内であること
    - 発話者が `NEW_HIRE` であること
    - 選択した `mentorId` が `allowedMentorIds` に含まれていること（候補が存在する場合）
  - **出力**: 正規化されたタイトルとメンター ID を返し、永続化ロジック（Gateway）がこれを利用して `conversation` と `mentor_assignment` を作成する
  - **備考**: 候補メンターが一人もいない場合は `mentorId` を `null` とし、学生が後で手動で設定できるようにする

---

## 8) DB スキーマ（PostgreSQL ヒント）

> 実マイグレーション時はチーム規約に沿って命名/制約を調整

```sql
create table "user" (
  user_id uuid primary key,
  role text not null check (role in ('NEW_HIRE','MENTOR','ADMIN')),
  display_name text not null,
  email text not null unique,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table conversation (
  conv_id uuid primary key,
  owner_id uuid not null references "user"(user_id),
  title text not null,
  state text not null check (state in ('ACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  archived_at timestamptz
);
create index idx_conv_owner_lastactive on conversation(owner_id, last_active_at desc, conv_id);

create table message (
  msg_id uuid primary key,
  conv_id uuid not null references conversation(conv_id) on delete cascade,
  role text not null check (role in ('NEW_HIRE','ASSISTANT')),
  status text check (status in ('DRAFT','PARTIAL','DONE','CANCELLED')),
  content text not null default '',
  created_at timestamptz not null default now()
);
create index idx_message_conv_time on message(conv_id, created_at, msg_id);

create table feedback (
  fb_id uuid primary key,
  target_msg_id uuid not null references message(msg_id) on delete cascade,
  author_id uuid not null references "user"(user_id),
  author_role text not null check (author_role in ('MENTOR','NEW_HIRE')),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  visibility text check (visibility in ('ALL','OWNER_ONLY','MENTOR_ONLY'))
);
create index idx_fb_target_time on feedback(target_msg_id, created_at desc, fb_id);

create table mentor_assignment (
  mentor_id uuid not null references "user"(user_id),
  newhire_id uuid not null references "user"(user_id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_by uuid references "user"(user_id),
  note text,
  primary key (mentor_id, newhire_id)
);
create index idx_ma_newhire_active on mentor_assignment(newhire_id) where revoked_at is null;

create table llm_runtime (
  runtime_id uuid primary key,
  kind text not null check (kind in ('remote','local')),
  adapter text not null,
  endpoint text not null,
  model_path text, auth_ref text, headers jsonb, settings jsonb,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table model_config (
  model_id uuid primary key,
  runtime_id uuid not null references llm_runtime(runtime_id),
  name text not null,
  params jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index uq_model_default on model_config(is_default) where is_default = true;
```

> ストリーミング・デルタの厳密追跡が必要な場合は `message_chunk(msg_id, seq_no, delta_text)` を追加し、`(msg_id, seq_no)` ユニークで冪等性を担保。

---

## 9) エラーハンドリング & ロギング

- **区分**：ドメイン検証（Use Case で早期失敗）/ ユーザー操作 / 外部サービス（Gateway が捕捉しログ、Presenter は再試行 UI）/ 想定外（ErrorBoundary）
- Presenter は `canRetry` 等の **UI フラグ**を返し、View はアラート/再試行ボタンを出す。
- ログは統一フォーマット（component / action / context / error）で Sentry/Datadog などへ転送。

---

## 10) テスト戦略（要点）

- **Domain/UseCase**：テーブル駆動で境界/異常系まで網羅（純粋性の担保）
- **Controller**：`renderHook` で操作ごとの状態遷移を検証（副作用なし）
- **Presenter**：派生値/フラグ計算（`useMemo` 依存性）を検証
- **UI Event Adapter**：Pointer/Mouse の正規化（座標/Pointer Capture）をモックで確認
- **Gateway**：外部失敗のモック、リソース解放と再試行フローの検証

---

## 11) 実装チェックリスト

1. **型契約**：エンティティ/値オブジェクトは `@/type/**`、import は `@/*` に統一
2. **依存方向**：UI→IA→UseCase→Domain の順守
3. **純粋性**：Domain/UseCase は副作用なし。副作用は Gateway へ
4. **Presenter 役割**：派生値/フラグのみ（状態や副作用を持たない）
5. **Controller 役割**：Use Case 呼び出し＋最小状態（副作用禁止）
6. **UI Event Adapter**：DOM イベントの正規化に限定
7. **Gateway 規律**：実行中フラグ、例外、リソース解放の徹底
8. **ストリーミング信頼性**：デルタ順序/冪等性（補助テーブル＋ユニークキー）
9. **体験最適**：`Conversation.lastActiveAt` 基準ソート
10. **モデル切替**：`ModelConfig.runtimeId` の差し替えのみで remote ↔ local を切替

---

## 12) Next.js 配置ガイド（例）

```
app/
  (logged-in)/
    chat/[convId]/page.tsx          // ページエントリ。Presenter をマウント
Presenter/
  Chat/
    ConversationPresenter.tsx       // Controller/Presenter/Gateway/Adapter を束ね View へ渡す:contentReference[oaicite:38]{index=38}
interfaceAdapters/
  controllers/  useConversationController.ts:contentReference[oaicite:39]{index=39}
  presenters/   useConversationPresenter.ts:contentReference[oaicite:40]{index=40}
  adapters/     useChatPointerAdapter.ts:contentReference[oaicite:41]{index=41}
  gateways/     useChatStreamGateway.ts:contentReference[oaicite:42]{index=42}
application/
  chat/useCases.ts                   // 純粋な状態遷移:contentReference[oaicite:43]{index=43}
domain/
  chat/**                            // 純粋関数群:contentReference[oaicite:44]{index=44}
type/
  core.ts                            // 本章のエンティティ型:contentReference[oaicite:45]{index=45}
```

---

### ひと言まとめ

**エンティティは POJO ＋明確な状態遷移**、**Use Case は純粋関数**、**副作用は IA(Gateway)**。
**Presenter/Controller/Adapter の責務線を厳密に保つ**ことで、Next.js でも保守性・テスト容易性・拡張性を同時に確保できる。
