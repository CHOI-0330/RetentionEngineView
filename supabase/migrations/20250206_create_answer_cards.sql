-- Answer Cards: メンターが新入社員の質問に対してAIと対話しながら作成する回答カード
-- 専門用語を平易な表現に変換し、わかりやすい回答を作成する

-- 1. answer_cards テーブル作成
CREATE TABLE IF NOT EXISTS answer_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_card_id UUID NOT NULL REFERENCES question_cards(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,                    -- AI加工後の最終回答
  original_content TEXT,                            -- メンターが入力した元の回答
  creator_id      UUID NOT NULL REFERENCES "user"(user_id),
  view_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_answer_cards_question ON answer_cards(question_card_id);
CREATE INDEX IF NOT EXISTS idx_answer_cards_created ON answer_cards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answer_cards_creator ON answer_cards(creator_id);

-- 全文検索用インデックス（日本語）
CREATE INDEX IF NOT EXISTS idx_answer_cards_content_search ON answer_cards
  USING gin(to_tsvector('simple', content));

-- 2. question_cardsにanswer_countカラム追加（オプション：回答数を高速に取得）
ALTER TABLE question_cards ADD COLUMN IF NOT EXISTS answer_count INTEGER NOT NULL DEFAULT 0;

-- 3. RLS ポリシー
ALTER TABLE answer_cards ENABLE ROW LEVEL SECURITY;

-- 全認証済みユーザーが閲覧可能
CREATE POLICY answer_cards_select_policy ON answer_cards
  FOR SELECT TO authenticated
  USING (true);

-- MENTOR/MANAGER ロールのみ作成可能
CREATE POLICY answer_cards_insert_policy ON answer_cards
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE user_id = auth.uid()
        AND role IN ('MENTOR', 'MANAGER')
    )
  );

-- 作成者本人のみ更新可能
CREATE POLICY answer_cards_update_policy ON answer_cards
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid());

-- 作成者本人のみ削除可能
CREATE POLICY answer_cards_delete_policy ON answer_cards
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- 4. answer_count更新用トリガー関数
CREATE OR REPLACE FUNCTION update_question_answer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE question_cards
    SET answer_count = answer_count + 1
    WHERE id = NEW.question_card_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE question_cards
    SET answer_count = answer_count - 1
    WHERE id = OLD.question_card_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trg_answer_cards_count ON answer_cards;
CREATE TRIGGER trg_answer_cards_count
  AFTER INSERT OR DELETE ON answer_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_question_answer_count();

-- 5. updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_answer_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_answer_cards_updated_at ON answer_cards;
CREATE TRIGGER trg_answer_cards_updated_at
  BEFORE UPDATE ON answer_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_answer_cards_updated_at();

-- 6. view_countインクリメント用RPC
CREATE OR REPLACE FUNCTION increment_ac_view_count(row_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE answer_cards
  SET view_count = view_count + 1
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
