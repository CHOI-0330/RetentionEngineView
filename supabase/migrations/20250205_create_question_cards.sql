-- Question Cards: 新人が先輩に聞きたい質問を構造化したカード
-- AI対話を通じて作成され、ナレッジベースの「質問」タブに表示される

-- 1. question_cards テーブル作成
CREATE TABLE IF NOT EXISTS question_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  background    TEXT NOT NULL,
  question_body TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'resolved')),
  creator_id    UUID NOT NULL REFERENCES "user"(user_id),
  is_anonymous  BOOLEAN NOT NULL DEFAULT false,
  tags          TEXT[] DEFAULT '{}',
  source_conv_id UUID REFERENCES conversation(conv_id),
  source_msg_id  UUID REFERENCES message(msg_id),
  view_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_cards_status ON question_cards(status);
CREATE INDEX IF NOT EXISTS idx_question_cards_created ON question_cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_cards_creator ON question_cards(creator_id);

-- 2. conversation type に question_creation を追加
ALTER TABLE conversation DROP CONSTRAINT IF EXISTS conversation_type_check;
ALTER TABLE conversation ADD CONSTRAINT conversation_type_check
  CHECK (type IN ('student_chat', 'mentor_ai_chat', 'question_creation'));

-- 3. RLS ポリシー
ALTER TABLE question_cards ENABLE ROW LEVEL SECURITY;

-- 全認証済みユーザーが閲覧可能
CREATE POLICY question_cards_select_policy ON question_cards
  FOR SELECT TO authenticated
  USING (true);

-- NEW_HIRE ロールのみ作成可能
CREATE POLICY question_cards_insert_policy ON question_cards
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE user_id = auth.uid()
        AND role = 'NEW_HIRE'
    )
  );

-- 作成者本人のみ更新可能
CREATE POLICY question_cards_update_policy ON question_cards
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid());
