"use client";

import { useState, useEffect, useCallback } from "react";
import type { AvatarEmotion, AvatarUrls } from "../../domain/core";
import { AVATAR_EMOTIONS } from "../../domain/core";

export interface UseAvatarPreloaderOptions {
  userId?: string;
  enabled?: boolean;
}

export interface UseAvatarPreloaderResult {
  avatars: AvatarUrls | null;
  isLoaded: boolean;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * アバター画像プリローダーフック
 *
 * チャットルーム進入時に全ての表情画像をブラウザキャッシュにプリロード
 */
export function useAvatarPreloader(
  options: UseAvatarPreloaderOptions = {}
): UseAvatarPreloaderResult {
  const { userId, enabled = true } = options;

  const [avatars, setAvatars] = useState<AvatarUrls | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAvatars = useCallback(async () => {
    if (!userId || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // まず設定を照会
      const response = await fetch("/api/avatar/settings");
      if (!response.ok) {
        throw new Error("Failed to fetch avatar settings");
      }

      const { data } = await response.json();

      if (!data.avatarUrls) {
        // アバターが生成されていない
        setAvatars(null);
        setIsLoaded(false);
        setIsLoading(false);
        return;
      }

      const urls = data.avatarUrls as AvatarUrls;

      // 全ての画像をプリロード
      const loadPromises = AVATAR_EMOTIONS.map((emotion) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load ${emotion} avatar`));
          img.src = urls[emotion];
        });
      });

      await Promise.all(loadPromises);

      setAvatars(urls);
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setAvatars(null);
      setIsLoaded(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    loadAvatars();
  }, [loadAvatars]);

  return {
    avatars,
    isLoaded,
    isLoading,
    isError: error !== null,
    error,
    reload: loadAvatars,
  };
}
