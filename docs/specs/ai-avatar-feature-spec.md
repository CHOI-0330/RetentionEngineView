# AI 아바타 기능 스펙

## 개요

NEW_HIRE 사용자가 자신의 AI 멘토 아바타를 생성하고, AI 응답의 감정에 따라 표정이 동적으로 변하는 기능.

---

## 1. 이미지 스펙

### 1.1 생성 및 저장

| 항목 | 값 |
|------|-----|
| 생성 사이즈 | 512x512px (Nano Banana) |
| 저장 사이즈 | 256x256px |
| 포맷 | WebP |
| 품질 | 88 |
| 예상 용량 | ~40KB/장 |
| 총 용량 | ~250KB (6장) |

### 1.2 표정 종류 (6개)

| 감정 키 | 설명 | 사용 상황 |
|---------|------|----------|
| `neutral` | 기본/경청 | 일반 응답, 정보 전달 |
| `happy` | 칭찬/격려 | 좋은 성과, 격려 메시지 |
| `thinking` | 고민/분석 | 복잡한 질문 처리, 분석 중 |
| `surprised` | 흥미/발견 | 좋은 아이디어, 인상적인 질문 |
| `concerned` | 걱정/주의 | 주의 필요, 우려 사항 |
| `proud` | 성취/축하 | 목표 달성, 성장 인정 |

### 1.3 스타일 옵션

| 옵션 | 값 | 설명 |
|------|-----|------|
| 스타일 | `realistic` | 리얼리스틱 (고정) |
| 성별 | `female`, `male`, `neutral` | 사용자 선택 |
| 성격 프리셋 | `friendly`, `professional`, `caring`, `energetic` | 외형에 반영 |

---

## 2. 데이터 스키마

### 2.1 user_avatar_settings 테이블

```sql
CREATE TABLE user_avatar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 생성 설정
  gender VARCHAR(20) NOT NULL,           -- 'female', 'male', 'neutral'
  personality_preset VARCHAR(50) NOT NULL, -- 'friendly', 'professional', 'caring', 'energetic'

  -- 생성 상태
  is_generated BOOLEAN DEFAULT FALSE,
  generation_seed VARCHAR(100),          -- 캐릭터 일관성을 위한 시드값

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 인덱스
CREATE INDEX idx_user_avatar_settings_user_id ON user_avatar_settings(user_id);
```

### 2.2 Supabase Storage 구조

```
bucket: avatars (public)

avatars/
  └── {userId}/
      ├── neutral.webp
      ├── happy.webp
      ├── thinking.webp
      ├── surprised.webp
      ├── concerned.webp
      └── proud.webp
```

### 2.3 Storage URL 패턴

```
https://{project-ref}.supabase.co/storage/v1/object/public/avatars/{userId}/{emotion}.webp
```

---

## 3. API 설계

### 3.1 아바타 설정 조회

```
GET /api/avatar/settings
```

**Response:**
```json
{
  "data": {
    "userId": "uuid",
    "gender": "female",
    "personalityPreset": "friendly",
    "isGenerated": true,
    "avatarUrls": {
      "neutral": "https://...",
      "happy": "https://...",
      "thinking": "https://...",
      "surprised": "https://...",
      "concerned": "https://...",
      "proud": "https://..."
    }
  }
}
```

### 3.2 아바타 생성 요청

```
POST /api/avatar/generate
```

**Request:**
```json
{
  "gender": "female",
  "personalityPreset": "friendly"
}
```

**Response:**
```json
{
  "data": {
    "status": "generating",
    "estimatedTime": 30
  }
}
```

### 3.3 아바타 생성 상태 확인

```
GET /api/avatar/status
```

**Response:**
```json
{
  "data": {
    "status": "completed",  // 'pending', 'generating', 'completed', 'failed'
    "progress": 6,          // 생성된 이미지 수
    "total": 6
  }
}
```

---

## 4. 이미지 생성 파이프라인

### 4.1 Nano Banana (Gemini 2.5 Flash Image) 프롬프트

**Base Character Prompt:**
```
Professional photograph style portrait of a {gender} {personality_description} office mentor,
age 30-35, {personality_visual_traits},
wearing smart business casual attire,
soft studio lighting, clean white/gray background,
upper body shot, facing camera,
high quality, detailed facial features,
{emotion_expression}
```

**성격별 Visual Traits:**

| 성격 프리셋 | personality_description | personality_visual_traits |
|------------|------------------------|---------------------------|
| `friendly` | warm and approachable | gentle smile lines, soft eyes, relaxed posture |
| `professional` | confident and competent | sharp features, poised expression, elegant |
| `caring` | nurturing and supportive | kind eyes, warm complexion, gentle demeanor |
| `energetic` | dynamic and enthusiastic | bright eyes, vibrant expression, lively |

**표정별 Expression:**

| 감정 | emotion_expression |
|------|-------------------|
| `neutral` | calm and attentive expression, slight professional smile |
| `happy` | genuine warm smile, eyes slightly crinkled with joy |
| `thinking` | thoughtful expression, slight head tilt, focused gaze |
| `surprised` | pleasantly surprised, raised eyebrows, bright eyes |
| `concerned` | caring concerned look, slightly furrowed brow, empathetic |
| `proud` | beaming with pride, confident smile, approving nod |

### 4.2 캐릭터 일관성 유지

1. **첫 번째 이미지(neutral) 생성 후 시드 저장**
2. **동일 시드로 나머지 5개 표정 생성**
3. **프롬프트에 일관성 지시 추가:**
   ```
   Maintain consistent facial features, hair style, and clothing
   across all expressions. Same person, different expression only.
   ```

### 4.3 후처리 (Sharp)

```typescript
import sharp from 'sharp';

interface ProcessOptions {
  inputBuffer: Buffer;
  outputSize: number;
  quality: number;
}

async function processAvatarImage(options: ProcessOptions): Promise<Buffer> {
  const { inputBuffer, outputSize = 256, quality = 88 } = options;

  return sharp(inputBuffer)
    .resize(outputSize, outputSize, {
      fit: 'cover',
      position: 'centre'
    })
    .webp({ quality })
    .toBuffer();
}
```

---

## 5. 프론트엔드 구현

### 5.1 아바타 프리로더 훅

```typescript
type Emotion = 'neutral' | 'happy' | 'thinking' | 'surprised' | 'concerned' | 'proud';

interface AvatarUrls {
  [key in Emotion]: string;
}

interface UseAvatarPreloaderResult {
  avatars: AvatarUrls | null;
  isLoaded: boolean;
  isError: boolean;
}

function useAvatarPreloader(userId: string): UseAvatarPreloaderResult {
  const [avatars, setAvatars] = useState<AvatarUrls | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const emotions: Emotion[] = ['neutral', 'happy', 'thinking', 'surprised', 'concerned', 'proud'];
    const baseUrl = `${SUPABASE_STORAGE_URL}/avatars/${userId}`;

    const urls: AvatarUrls = {} as AvatarUrls;
    const loadPromises: Promise<void>[] = [];

    emotions.forEach(emotion => {
      const url = `${baseUrl}/${emotion}.webp`;
      urls[emotion] = url;

      // 브라우저 캐시에 프리로드
      const promise = new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = url;
      });
      loadPromises.push(promise);
    });

    Promise.all(loadPromises)
      .then(() => {
        setAvatars(urls);
        setIsLoaded(true);
      })
      .catch(() => {
        setIsError(true);
      });
  }, [userId]);

  return { avatars, isLoaded, isError };
}
```

### 5.2 AI 아바타 컴포넌트

```typescript
interface AIAvatarProps {
  emotion?: Emotion;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64
};

function AIAvatar({ emotion = 'neutral', size = 'md', className }: AIAvatarProps) {
  const { userId } = useSession();
  const { avatars, isLoaded, isError } = useAvatarPreloader(userId);

  const pixelSize = sizeMap[size];

  if (!isLoaded || isError || !avatars) {
    return (
      <div
        className={cn("rounded-full bg-muted animate-pulse", className)}
        style={{ width: pixelSize, height: pixelSize }}
      />
    );
  }

  return (
    <img
      src={avatars[emotion]}
      alt={`AI mentor - ${emotion}`}
      width={pixelSize}
      height={pixelSize}
      className={cn(
        "rounded-full object-cover transition-opacity duration-200",
        className
      )}
    />
  );
}
```

### 5.3 감정 태그 파서

```typescript
const EMOTION_REGEX = /\[EMOTION:\s*(neutral|happy|thinking|surprised|concerned|proud)\]/i;

interface ParsedMessage {
  content: string;      // 감정 태그 제거된 메시지
  emotion: Emotion;     // 파싱된 감정
}

function parseEmotionFromMessage(rawContent: string): ParsedMessage {
  const match = rawContent.match(EMOTION_REGEX);

  if (match) {
    const emotion = match[1].toLowerCase() as Emotion;
    const content = rawContent.replace(EMOTION_REGEX, '').trim();
    return { content, emotion };
  }

  return { content: rawContent, emotion: 'neutral' };
}
```

### 5.4 채팅 메시지에서 사용

```typescript
function ChatMessage({ message }: { message: Message }) {
  const { content, emotion } = useMemo(
    () => parseEmotionFromMessage(message.content),
    [message.content]
  );

  return (
    <div className="flex gap-3 items-start">
      <AIAvatar emotion={emotion} size="md" />
      <div className="flex-1">
        <p className="text-sm">{content}</p>
      </div>
    </div>
  );
}
```

---

## 6. LLM 시스템 프롬프트 수정

### 6.1 감정 태그 지시 추가

기존 시스템 프롬프트 끝에 추가:

```
## 응답 형식 규칙

모든 응답의 마지막에 현재 감정 상태를 태그로 포함하세요.

**감정 태그 형식:** [EMOTION: {감정}]

**사용 가능한 감정:**
- neutral: 일반적인 정보 전달, 경청
- happy: 칭찬, 격려, 긍정적 피드백
- thinking: 복잡한 질문 분석, 고민 중
- surprised: 좋은 아이디어 발견, 인상적인 질문
- concerned: 주의 필요, 우려 사항 전달
- proud: 성취 축하, 성장 인정

**예시:**
"좋은 질문이에요! 그 부분은 이렇게 생각해보면 어떨까요? [EMOTION: happy]"
"음, 그 상황은 조금 주의가 필요해 보이네요. [EMOTION: concerned]"
```

---

## 7. 프로필 설정 UI 플로우

### 7.1 화면 구성

```
┌─────────────────────────────────────────────────────────────┐
│  AI 멘토 아바타 설정                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐                                            │
│  │             │  ← 현재 아바타 미리보기 (또는 기본 실루엣)    │
│  │   Avatar    │                                            │
│  │   Preview   │                                            │
│  │             │                                            │
│  └─────────────┘                                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  성별 선택                                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│  │  여성   │ │  남성   │ │  중성   │                        │
│  └─────────┘ └─────────┘ └─────────┘                        │
│                                                             │
│  성격 프리셋                                                  │
│  ┌───────────────┐ ┌───────────────┐                        │
│  │   친근한       │ │   전문적인     │                        │
│  │   Friendly    │ │  Professional │                        │
│  └───────────────┘ └───────────────┘                        │
│  ┌───────────────┐ ┌───────────────┐                        │
│  │   따뜻한       │ │   활기찬      │                        │
│  │    Caring     │ │   Energetic   │                        │
│  └───────────────┘ └───────────────┘                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│           ┌────────────────────────┐                        │
│           │    아바타 생성하기      │                        │
│           └────────────────────────┘                        │
│                                                             │
│  ※ 생성에 약 30초 정도 소요됩니다                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 생성 중 화면

```
┌─────────────────────────────────────────────────────────────┐
│  AI 멘토 아바타 생성 중...                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌─────────────┐                          │
│                    │   ◠ ◠      │                          │
│                    │     ◡      │                          │
│                    │  Generating │                          │
│                    └─────────────┘                          │
│                                                             │
│              ████████████░░░░░░░░  4/6                      │
│                                                             │
│              표정 생성 중: thinking                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 완료 화면

```
┌─────────────────────────────────────────────────────────────┐
│  AI 멘토 아바타 설정 완료!                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  생성된 표정 미리보기                                         │
│                                                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                 │
│  │ 😊 │ │ 😄 │ │ 🤔 │ │ 😮 │ │ 😟 │ │ 🥹 │                 │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                 │
│  neutral happy thinking surprised concerned proud           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌────────────────┐      ┌────────────────┐                 │
│  │   다시 생성     │      │   채팅 시작     │                 │
│  └────────────────┘      └────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. 구현 체크리스트

### Phase 1: 백엔드 기반
- [ ] Supabase Storage 버킷 생성 (avatars, public)
- [ ] user_avatar_settings 테이블 마이그레이션
- [ ] Nano Banana API 연동 유틸리티
- [ ] Sharp 이미지 후처리 유틸리티

### Phase 2: API 엔드포인트
- [ ] GET /api/avatar/settings
- [ ] POST /api/avatar/generate
- [ ] GET /api/avatar/status

### Phase 3: 프론트엔드 - 생성 UI
- [ ] useAvatarPreloader 훅
- [ ] 프로필 설정 페이지 UI
- [ ] 생성 진행 상태 UI

### Phase 4: 프론트엔드 - 채팅 연동
- [ ] AIAvatar 컴포넌트
- [ ] parseEmotionFromMessage 유틸
- [ ] 채팅 메시지 컴포넌트 수정

### Phase 5: LLM 연동
- [ ] 시스템 프롬프트에 감정 태그 지시 추가
- [ ] 응답 파싱 테스트

---

## 9. 참고 사항

### 9.1 Nano Banana API

- 서비스: Google Gemini 2.5 Flash Image Generation
- 문서: (추후 추가)
- Rate Limit: (추후 확인)

### 9.2 비용 예상

| 항목 | 예상 비용 |
|------|----------|
| 이미지 생성 (6장/사용자) | ~$0.01-0.05 |
| Storage (250KB/사용자) | 무시할 수준 |
| 대역폭 | 무시할 수준 |

### 9.3 향후 확장 가능성

- 더 많은 표정 추가
- 계절/이벤트별 의상 변경
- 애니메이션 표정 전환
- 사용자 피드백 기반 표정 미세 조정
