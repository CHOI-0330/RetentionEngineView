-- AI Avatar Settings Migration
-- 실행 방법: Supabase Dashboard > SQL Editor에서 실행

-- 1. user_avatar_settings 테이블 생성
CREATE TABLE IF NOT EXISTS user_avatar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,

  -- 생성 설정
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('female', 'male', 'neutral')),
  personality_preset VARCHAR(50) NOT NULL CHECK (personality_preset IN ('friendly', 'professional', 'caring', 'energetic')),

  -- 생성 상태
  is_generated BOOLEAN DEFAULT FALSE,
  generation_status VARCHAR(20) DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  generation_progress INTEGER DEFAULT 0,
  generation_seed VARCHAR(100),

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 2. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_avatar_settings_user_id ON user_avatar_settings(user_id);

-- 3. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_avatar_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_avatar_settings_updated_at ON user_avatar_settings;
CREATE TRIGGER trigger_update_avatar_settings_updated_at
  BEFORE UPDATE ON user_avatar_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_avatar_settings_updated_at();

-- 4. RLS (Row Level Security) 정책
ALTER TABLE user_avatar_settings ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 설정만 조회/수정 가능
CREATE POLICY "Users can view their own avatar settings"
  ON user_avatar_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own avatar settings"
  ON user_avatar_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own avatar settings"
  ON user_avatar_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own avatar settings"
  ON user_avatar_settings FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Storage 버킷 설정 (Supabase Dashboard에서 수동 생성 필요)
-- Bucket name: avatars
-- Public: Yes
-- File size limit: 1MB
-- Allowed MIME types: image/webp, image/png, image/jpeg

-- Storage 정책 (SQL Editor에서 실행)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('avatars', 'avatars', true, 1048576, ARRAY['image/webp', 'image/png', 'image/jpeg']);

-- Storage RLS 정책
-- CREATE POLICY "Anyone can view avatars"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');

-- CREATE POLICY "Users can upload their own avatars"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CREATE POLICY "Users can update their own avatars"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CREATE POLICY "Users can delete their own avatars"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
