# ApiDocuments

## 1. 背景
- 本リポジトリは Next.js のビュー層だけを保持し、データ操作は Supabase(BaaS) に直接アクセスする API Route で肩代わりしている。今後、専用の API サーバーを立てて **認証・権限制御・BaaS 隠蔽** を行う必要がある。
- UI から見た主要ユースケースは 4 つ: 認証 (`AuthPage`)、学生チャット (`StudentChatPage`)、メンターダッシュボード (`MentorDashboardPage`)、メンター個別レビュー (`MentorStudentChatPage`)。さらに LLM(Gemini) へのプロキシ API が存在する。
- API サーバーは Clean Architecture のユースケース (`src/application/entitle`) を満たすエンドポイントを提供し、Supabase のサービスロール鍵はサーバー側のみで保持する。

## 2. ドメイン / BaaS テーブル整理

| エンティティ | 主フィールド | 概要 / Supabase テーブル |
| --- | --- | --- |
| `User` | `userId`, `role` (`NEW_HIRE`/`MENTOR`/`ADMIN`), `displayName`, `email`, `createdAt`, `disabledAt?` | `user` テーブル。認証後のプロフィールにも使用。 |
| `Conversation` | `convId`, `ownerId`(=新入社員), `title`, `state`, `createdAt`, `lastActiveAt`, `archivedAt?` | `conversation` テーブル。チャット単位。 |
| `Message` | `msgId`, `convId`, `role` (`NEW_HIRE`/`ASSISTANT`), `content`, `status?` (`DRAFT` 等), `createdAt` | `message` テーブル。 |
| `Feedback` | `fbId`, `targetMsgId`, `authorId`, `authorRole`, `content`, `createdAt`, `updatedAt?`, `visibility?` | `feedback` テーブル。メンター/新入社員によるメッセージレビュー。 |
| `MentorAssignment` | `mentorId`, `newhireId`, `createdAt`, `revokedAt?`, `createdBy?`, `note?` | `mentor_assignment` テーブル。メンターの担当範囲。 |
| `StudentSummary` | `newhire` (User), `conversation`, `recentMessage?`, `needsReview`, `totalChats`, `lastActivityAt` | メンターダッシュボード用の集計。複数テーブルを JOIN/集計して算出。 |
| セッション | `accessToken`, `refreshToken`, `userId`, `role`, `displayName?` | HTTP-only Cookie ( `auth_access_token` など ) + `/api/auth/session` レスポンスで配布。 |

## 3. 認証 / セッション API

API サーバーは Supabase Auth 管理 API を内部で呼び出し、HTTP-only Cookie(`auth_access_token`,`auth_refresh_token`,`auth_user_id`,`auth_role`)を設定する。UI 側は `SessionProvider` と `AuthPage` から下表のエンドポイントを呼び出す。

### 3.1 エンドポイント一覧

| Method & Path | 用途 / 認可 | リクエスト | レスポンス |
| --- | --- | --- | --- |
| `POST /auth/register` | 未認証 / 新規登録。`registerUserUseCase` のバリデーションを反映。許可ロール: `NEW_HIRE`,`MENTOR` | `{ email, password, displayName, role }` | `{ userId }` |
| `POST /auth/login` | 未認証。サインイン成功時に Cookie セット | `{ email, password }` | `{ accessToken, refreshToken, userId, role }` |
| `POST /auth/logout` | 要 Cookie。`logoutUserUseCase` の入力を流用し Supabase admin signOut。 | (body 無し) | `{ ok: true }` & Cookie 全削除 |
| `POST /auth/refresh` | 要 `auth_refresh_token` Cookie。セッション再発行。 | (body 無し) | `{ accessToken, refreshToken, userId, role }` |
| `GET /auth/session` | 要 Cookie。`auth_access_token` を検証し、`displayName` 付きプロフィールを返却。 | - | `{ accessToken, refreshToken, userId, role, displayName }` or `401` |

### 3.2 実装メモ
- Supabase サービスロール鍵で `auth.admin` を叩くのは API サーバーのみ。フロントには流出させない。
- 401/403 の場合は Next.js ミドルウェア相当のリダイレクト処理が走るため、JSON `{ error: string }` を返す。
- `SessionProvider` は `/auth/session` → (401) → `/auth/refresh` の順でフェイルオーバーするため、両方同じ JSON 形を守る。

## 4. 学生チャット API

`StudentChatPage` は現在 `POST /api/entitle/student-chat` の `action` パラメータで複数操作を呼び出している。API サーバーでは以下の 2 パターンが考えられる:
1. **互換モード:** 既存 UI を変更せず `POST /student-chat` に `action` を渡して分岐する。
2. **REST 化:** 操作ごとに明示的なエンドポイントを公開し、既存 `action` とのマッピングを用意する。

ここでは後者 (推奨) の形を提示し、最後に互換マッピング表を付ける。

### 4.1 ブートストラップ / マスターデータ
- `GET /student/chat/bootstrap?convId=`  
  - **認可:** ログイン済み `NEW_HIRE` または担当メンター。`conversation.ownerId` と `MentorAssignment` で検証。  
  - **レスポンス例**
    ```json
    {
      "conversation": { "convId": "...", "title": "...", "ownerId": "...", "state": "ACTIVE", "lastActiveAt": "..." } | null,
      "currentUser": { "userId": "...", "role": "NEW_HIRE", "displayName": "...", "email": "...", "createdAt": "..." },
      "initialMessages": [ { "msgId": "...", "role": "NEW_HIRE", "content": "...", "status": null, "createdAt": "..." }, ... ],
      "initialFeedbacks": { "<msgId>": [ { "fbId": "...", "authorId": "...", "content": "...", "createdAt": "..."} ] },
      "authorNames": { "<userId>": "表示名" },
      "mentorAssignments": [ { "mentorId": "...", "newhireId": "...", "revokedAt": null } ],
      "availableConversations": [ { "convId": "...", "title": "...", "lastActiveAt": "..." } ],
      "availableMentors": [ { "mentorId": "...", "displayName": "...", "email": "..." } ]
    }
    ```
  - Supabase で `conversation`・`message`・`feedback`・`mentor_assignment`・`user` をまとめて参照し、初期表示に必要なすべてを返す。
- `GET /student/mentors`  
  - `mentor_assignment` に既に紐付いているメンターが居ればその集合、なければ全メンターをアルファベット順で返す (現行 `listAvailableMentors` と同じ挙動)。

### 4.2 会話管理
- `POST /student/conversations`
  - **認可:** `NEW_HIRE` のみ。`createConversationUseCase` のルール(件名長、選択可能メンター)を適用。
  - **リクエスト:** `{ "title": "CS 基礎", "mentorId": "uuid" | null }`
  - **レスポンス:** `Conversation` オブジェクト。必要に応じて `mentor_assignment` を upsert。

### 4.3 メッセージ / アシスタント操作
- `GET /student/conversations/{convId}/messages?cursor=&limit=`  
  - ページング (cursor=msgId, createdAt desc) でメッセージ一覧を返す。
- `POST /student/conversations/{convId}/messages`
  - 新入社員による送信。`createUserMessageUseCase` を通し、`conv.ownerId === requester` を確認。
  - **リクエスト:** `{ "content": "質問本文" }`.
- `POST /student/conversations/{convId}/assistant-messages`
  - 新しい AI メッセージのプレースホルダを作成し、`status: "DRAFT"` メッセージを返す。戻り値の `msgId` は後続の LLM 連携で利用。
- `POST /assistant/messages/{msgId}/finalize`
  - LLM から得た回答全文を保存 (`finalizeAssistantMessageUseCase`)。  
  - **リクエスト:** `{ "finalText": "..." }`
- `POST /assistant/messages/{msgId}/cancel`
  - 進行中の応答を `status: "CANCELLED"` にする。

### 4.4 フィードバック
- `GET /messages/{msgId}/feedbacks?cursor=&limit=`
  - メッセージ単位で最新フィードバックと `authorNames` を返却。  
  - **レスポンス:** `{ "items": Feedback[], "nextCursor": string?, "authorNames": { "<userId>": "..." } }`
- `POST /messages/{msgId}/feedbacks`
  - 新入社員/担当メンターの双方が AI メッセージに 1 件だけ付与可能 (`validateFeedbackRulesUseCase`)。  
  - **リクエスト:** `{ "content": "...", "visibility": "ALL" }`  
  - **レスポンス:** `{ "feedback": Feedback, "authorName": "..." }`

### 4.5 現行 action とのマッピング

| 既存 action ( `/api/entitle/student-chat` ) | 新 API (例) | 備考 |
| --- | --- | --- |
| `createUserMessage` | `POST /student/conversations/{convId}/messages` | 本文長 4000 文字制限 |
| `beginAssistantMessage` | `POST /student/conversations/{convId}/assistant-messages` | 返却 `msgId` を LLM に渡す |
| `finalizeAssistantMessage` | `POST /assistant/messages/{msgId}/finalize` | |
| `cancelAssistantMessage` | `POST /assistant/messages/{msgId}/cancel` | |
| `listConversationMessages` | `GET /student/conversations/{convId}/messages` | `cursor`/`limit` パラメータ |
| `listFeedbacks` | `GET /messages/{msgId}/feedbacks` | `authorNames` 付き |
| `createFeedback` | `POST /messages/{msgId}/feedbacks` | `ValidatedFeedback` を payload に |
| `createConversation` | `POST /student/conversations` | メンター割当も upsert |

## 5. メンターダッシュボード API

`MentorDashboardPage` は担当学生一覧と AI 応答品質フラグ送信を行う。いずれも認可ロールは `MENTOR`。

- `GET /mentor/dashboard/students`
  - `mentor_assignment` → `user` → `conversation` → `message` → `feedback` を参照して `StudentSummary[]` を作成。  
  - **レスポンス**
    ```json
    {
      "students": [
        {
          "newhire": { "userId": "...", "displayName": "..." },
          "conversation": { "convId": "...", "title": "...", "lastActiveAt": "..." },
          "recentMessage": { "msgId": "...", "role": "ASSISTANT", "content": "..." },
          "needsReview": true,
          "totalChats": 42,
          "lastActivityAt": "2024-05-01T10:00:00Z"
        }
      ]
    }
    ```
  - `needsReview` は最新メッセージが AI かつフィードバック未作成の場合に `true`。
- `POST /mentor/dashboard/students/{studentId}/quality`
  - UI では「良い / 改善が必要」ボタンとして表示。現在は No-op だが API として `isPositive` ブール値を受け取りログを保存できるようにする。  
  - **リクエスト:** `{ "isPositive": true }`

## 6. メンター個別レビュー API

`MentorStudentChatPage` は `/mentor/chat/[convId]` で利用。担当メンターのみアクセス可能。

- `GET /mentor/conversations/{convId}`
  - `resolveMentorRequest` と同等にアクセス権を検証後、以下を返す。  
    ```json
    {
      "conversation": Conversation,
      "student": User,
      "mentor": User,
      "messages": Message[],
      "feedbackByMessageId": { "<msgId>": [ Feedback ] },
      "authorNames": { "<userId>": "表示名" }
    }
    ```
- `POST /mentor/conversations/{convId}/feedback`
  - メンターが対象メッセージにフィードバックを作成/上書き。1 メッセージにつき 1 件。  
  - **リクエスト:** `{ "messageId": "msg-123", "content": "..." }` (既存フィードバックがある場合は `feedbackId` を含めても良い)  
  - **レスポンス:** `{ "feedback": Feedback, "authorName": "mentor display name" }`  
  - ドメインでは `validateFeedbackUpdateUseCase` と `validateFeedbackRulesUseCase` を使い、`assignment` による担当者チェックも必須。

## 7. LLM プロキシ API

- `POST /llm/generate` (現行: `/api/llm/gemini`)
  - **認可:** 要ログイン (新入社員が AI に質問するタイミングで呼ばれる)。  
  - **リクエスト**
    ```json
    {
      "prompt": {
        "system": "You are a helpful mentor assisting a new hire.",
        "messages": [
          { "role": "user", "content": "..." },
          { "role": "assistant", "content": "..." }
        ]
      },
      "modelId": "gemini-2.0-flash-exp"
    }
    ```
  - **レスポンス:** `{ "text": "LLM 出力", "model": "..." }`  
  - Google Gemini API へのリクエストは API サーバーで行い、外部鍵 `GEMINI_API_KEY` もサーバー側にのみ配置。

## 8. 代表シーケンス

### 8.1 新入社員がメッセージを送信する
1. `GET /auth/session` → セッション確立後 `/student/chat/bootstrap` で会話・メンター候補を取得。
2. UI で送信 → `POST /student/conversations/{convId}/messages`。
3. 即座に `POST /student/conversations/{convId}/assistant-messages` でドラフト作成し `msgId` を取得。
4. `POST /llm/generate` で Gemini から回答を取得。
5. `POST /assistant/messages/{msgId}/finalize` で確定。失敗時は `POST /assistant/messages/{msgId}/cancel`。
6. 追加履歴が必要になった場合 `GET /student/conversations/{convId}/messages?cursor=` で前方読み込み。

### 8.2 メンターが AI 応答にフィードバックを付与する
1. `GET /mentor/dashboard/students` で担当一覧とレビュー対象を把握。
2. 個別チャットへ遷移し `GET /mentor/conversations/{convId}` で全文と既存フィードバックを取得。
3. モーダルで編集 → `POST /mentor/conversations/{convId}/feedback`。成功レスポンスを UI ストアに反映。
4. 品質集計を記録したい場合は `POST /mentor/dashboard/students/{studentId}/quality` を送信。

## 9. 実装・セキュリティ注意点
- **アクセストークン** は HTTP-only Cookie として保持し、API サーバー内では常に Supabase Admin API で再検証してロールを取得する。UI 側では token を扱わない。
- **権限制御** はユースケースに沿って実装する:  
  - 新入社員のみメッセージ/会話作成可。  
  - `mentor_assignment` に紐付くメンターのみ学生データへアクセス可。  
  - フィードバックは AI メッセージに 1 件のみ。
- **BaaS との接続**: Supabase サービスロール鍵をサーバー環境変数 (例: `SUPABASE_SERVICE_ROLE_KEY`) に置き、API サーバー経由でのみ `insert/update` を実行する。
- **エラーハンドリング**: 既存 UI は `{ error: string }` を期待し、401/403 で `/` へリダイレクトするミドルウェアが動作する。新 API も `message` を含む JSON を返す。
- **互換レイヤ**: 移行期間中は `/student-chat` や `/mentor-dashboard` の `action` ベース API を HTTP 302 か内部ディスパッチでラップし、前後方互換性を確保できる。
- **監査/ロギング**: アシスタント応答やフィードバックは後から監査可能なように、API サーバー側で操作ログ (誰がいつどの convId に対して行ったか) を記録する。

以上により、API サーバー側で Supabase / Gemini へのアクセスを集約し、既存のフロントエンドが必要とするすべての機能をカバーできる。
