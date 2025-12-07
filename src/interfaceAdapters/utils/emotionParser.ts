/**
 * AIレスポンスから感情タグをパースするユーティリティ
 */

import type { AvatarEmotion } from "../../domain/core";
import { AVATAR_EMOTIONS } from "../../domain/core";

const EMOTION_REGEX = /\[EMOTION:\s*(neutral|happy|thinking|surprised|concerned|proud)\]/i;

export interface ParsedMessage {
  /** 感情タグが除去されたメッセージ内容 */
  content: string;
  /** パースされた感情 (デフォルト: neutral) */
  emotion: AvatarEmotion;
  /** 感情タグが検出されたかどうか */
  hasEmotionTag: boolean;
}

/**
 * AIレスポンスメッセージから感情タグをパース
 *
 * @example
 * parseEmotionFromMessage("いい質問ですね！ [EMOTION: happy]")
 * // => { content: "いい質問ですね！", emotion: "happy", hasEmotionTag: true }
 *
 * parseEmotionFromMessage("一般的なメッセージです。")
 * // => { content: "一般的なメッセージです。", emotion: "neutral", hasEmotionTag: false }
 */
export function parseEmotionFromMessage(rawContent: string): ParsedMessage {
  const match = rawContent.match(EMOTION_REGEX);

  if (match) {
    const emotionValue = match[1].toLowerCase();
    const emotion = AVATAR_EMOTIONS.includes(emotionValue as AvatarEmotion)
      ? (emotionValue as AvatarEmotion)
      : "neutral";
    const content = rawContent.replace(EMOTION_REGEX, "").trim();

    return {
      content,
      emotion,
      hasEmotionTag: true,
    };
  }

  return {
    content: rawContent,
    emotion: "neutral",
    hasEmotionTag: false,
  };
}

/**
 * メッセージから感情タグのみを除去（感情情報が不要な場合）
 */
export function removeEmotionTag(rawContent: string): string {
  return rawContent.replace(EMOTION_REGEX, "").trim();
}

/**
 * 感情タグ文字列を生成（LLMレスポンステスト用）
 */
export function createEmotionTag(emotion: AvatarEmotion): string {
  return `[EMOTION: ${emotion}]`;
}

/**
 * 感情別の日本語ラベル
 */
export const EMOTION_LABELS: Record<AvatarEmotion, string> = {
  neutral: "通常",
  happy: "喜び",
  thinking: "思考中",
  surprised: "驚き",
  concerned: "心配",
  proud: "誇らしい",
};

/**
 * 感情別の説明（UI表示用）
 */
export const EMOTION_DESCRIPTIONS: Record<AvatarEmotion, string> = {
  neutral: "一般的な情報伝達、傾聴",
  happy: "称賛、励まし、ポジティブなフィードバック",
  thinking: "複雑な質問の分析、検討中",
  surprised: "良いアイデアの発見、印象的な質問",
  concerned: "注意が必要、懸念事項の伝達",
  proud: "達成のお祝い、成長の認識",
};
