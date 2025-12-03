/**
 * MBTIタイプ定義
 * 16種類の性格タイプを表します。
 */
export type MbtiType =
  | "INTJ"
  | "INTP"
  | "ENTJ"
  | "ENTP" // 分析家型
  | "INFJ"
  | "INFP"
  | "ENFJ"
  | "ENFP" // 外交官型
  | "ISTJ"
  | "ISFJ"
  | "ESTJ"
  | "ESFJ" // 番人型
  | "ISTP"
  | "ISFP"
  | "ESTP"
  | "ESFP"; // 探検家型

/**
 * 全MBTIタイプ配列
 */
export const MBTI_TYPES: readonly MbtiType[] = [
  "INTJ",
  "INTP",
  "ENTJ",
  "ENTP",
  "INFJ",
  "INFP",
  "ENFJ",
  "ENFP",
  "ISTJ",
  "ISFJ",
  "ESTJ",
  "ESFJ",
  "ISTP",
  "ISFP",
  "ESTP",
  "ESFP",
] as const;

/**
 * MBTIタイプ別日本語ラベル
 */
export const MBTI_LABELS: Record<MbtiType, string> = {
  // 分析家型 (Analysts)
  INTJ: "建築家",
  INTP: "論理学者",
  ENTJ: "指揮官",
  ENTP: "討論者",

  // 外交官型 (Diplomats)
  INFJ: "提唱者",
  INFP: "仲介者",
  ENFJ: "主人公",
  ENFP: "広報運動家",

  // 番人型 (Sentinels)
  ISTJ: "管理者",
  ISFJ: "擁護者",
  ESTJ: "幹部",
  ESFJ: "領事",

  // 探検家型 (Explorers)
  ISTP: "巨匠",
  ISFP: "冒険家",
  ESTP: "起業家",
  ESFP: "エンターテイナー",
};

/**
 * MBTIタイプ別詳細説明（日本語）
 */
export const MBTI_DESCRIPTIONS: Record<MbtiType, string> = {
  // 分析家 (Analysts)
  INTJ: "想像力が豊かで、戦略的な思考の持ち主。あらゆる物事に対して計画を立てる建築家型。",
  INTP: "貪欲な知識欲を持つ革新的な発明家。論理的な思考を好む論理学者型。",
  ENTJ: "大胆で想像力豊か、かつ強い意志を持つ指導者。常に道を見つけるか、道を切り開く指揮官型。",
  ENTP: "賢くて好奇心旺盛な思想家。知的挑戦には必ず受けて立つ討論者型。",

  // 外交官 (Diplomats)
  INFJ: "物静かで神秘的だが、人々を非常に勇気づける飽くなき理想主義者。提唱者型。",
  INFP: "詩的で親切な利他主義者。良い物事のためなら、いつでも懸命に手を差し伸べる仲介者型。",
  ENFJ: "カリスマ性があり、人々を励ますリーダー。聞く人を魅了する主人公型。",
  ENFP: "情熱的で独創的、かつ社交的な自由人。常に笑いと喜びを見つける広報運動家型。",

  // 番人 (Sentinels)
  ISTJ: "実用的で事実に基づいた思考の持ち主。その信頼性は紛れもなく本物である管理者型。",
  ISFJ: "非常に献身的で心の温かい擁護者。いつでも大切な人を守る準備ができている擁護者型。",
  ESTJ: "優秀な管理者で、物事や人々を管理する能力に長けている幹部型。",
  ESFJ: "非常に思いやりがあり社交的で、人気がある。常に熱心に人々に手を差し伸べる領事官型。",

  // 探検家 (Explorers)
  ISTP: "大胆で実践的な思考を持つ実験者。あらゆる道具を使いこなす巨匠型。",
  ISFP: "柔軟で魅力的な芸術家。常に進んで新しいことに挑戦する冒険家型。",
  ESTP: "賢くてエネルギッシュで、非常に鋭い知覚の持ち主。危険と隣り合わせの人生を心から楽しむ起業家型。",
  ESFP: "自発的でエネルギッシュで熱心なエンターテイナー。周りが退屈することは決してないエンターテイナー型。",
};

/**
 * MBTIカテゴリ別カラーテーマ（Tailwind CSSクラスマッピング用）
 */
export const MBTI_CATEGORY_COLORS = {
  analysts:
    "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100",
  diplomats: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100",
  sentinels: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100",
  explorers:
    "text-yellow-600 bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
} as const;

/**
 * MBTIカテゴリ
 */
export const MBTI_CATEGORIES = {
  analysts: ["INTJ", "INTP", "ENTJ", "ENTP"] as MbtiType[],
  diplomats: ["INFJ", "INFP", "ENFJ", "ENFP"] as MbtiType[],
  sentinels: ["ISTJ", "ISFJ", "ESTJ", "ESFJ"] as MbtiType[],
  explorers: ["ISTP", "ISFP", "ESTP", "ESFP"] as MbtiType[],
} as const;

export type MbtiCategory = keyof typeof MBTI_CATEGORIES;

/**
 * MBTIカテゴリラベル（日本語）
 */
export const MBTI_CATEGORY_LABELS: Record<MbtiCategory, string> = {
  analysts: "分析家 (Analysts)",
  diplomats: "外交官 (Diplomats)",
  sentinels: "番人 (Sentinels)",
  explorers: "探検家 (Explorers)",
} as const;

/**
 * MBTIタイプ検証関数
 */
export function isValidMbtiType(value: unknown): value is MbtiType {
  return typeof value === "string" && MBTI_TYPES.includes(value as MbtiType);
}
