"use client";

import React, { memo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { cn } from "../ui/utils";
import type { AvatarEmotion, AvatarUrls } from "../../domain/core";

export interface AIAvatarProps {
  avatars: AvatarUrls | null;
  emotion?: AvatarEmotion;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: "size-8",   // 32px
  md: "size-10",  // 40px
  lg: "size-12",  // 48px
};

/**
 * AIメンターアバターコンポーネント
 *
 * 感情に応じて表情が変わるアバターを表示
 */
export const AIAvatar = memo(function AIAvatar({
  avatars,
  emotion = "neutral",
  size = "md",
  className,
}: AIAvatarProps) {
  const sizeClass = SIZE_MAP[size];

  // アバターがない場合はデフォルトアイコンを表示
  if (!avatars) {
    return (
      <Avatar className={cn(sizeClass, className)}>
        <AvatarFallback className="bg-primary/10 text-primary">
          AI
        </AvatarFallback>
      </Avatar>
    );
  }

  const imageUrl = avatars[emotion] || avatars.neutral;

  return (
    <Avatar className={cn(sizeClass, "transition-all duration-200", className)}>
      <AvatarImage
        src={imageUrl}
        alt={`AI mentor - ${emotion}`}
        className="object-cover"
      />
      <AvatarFallback className="bg-primary/10 text-primary">
        AI
      </AvatarFallback>
    </Avatar>
  );
});

export default AIAvatar;
