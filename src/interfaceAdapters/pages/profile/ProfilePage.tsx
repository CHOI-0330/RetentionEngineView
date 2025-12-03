"use client";

import { useEffect } from "react";
import { useMbtiController } from "../../controllers/useMbtiController";
import { useMbtiPresenter } from "../../presenters/useMbtiPresenter";
import { useSessionPresenter } from "../../presenters/useSessionPresenter";
import ProfileView from "../../../views/ProfileView";
import type { MbtiType } from "../../../domain/mbti.types";

const fetchMbtiFromApi = async (userId: string, accessToken?: string): Promise<MbtiType | null> => {
  const params = new URLSearchParams({ userId });
  const response = await fetch(`/api/mbti?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  const raw = await response.text();
  let payload: any = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    throw new Error(payload?.error ?? raw ?? "Failed to fetch MBTI.");
  }
  return (payload?.data?.mbti ?? null) as MbtiType | null;
};

const updateMbtiViaApi = async (userId: string, mbti: MbtiType, accessToken?: string): Promise<void> => {
  const response = await fetch("/api/mbti", {
    method: "PUT",
    cache: "no-store",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ userId, mbti }),
  });
  const raw = await response.text();
  let payload: any = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    throw new Error(payload?.error ?? raw ?? "Failed to update MBTI.");
  }
};

const ProfilePage = () => {
  const sessionPresenter = useSessionPresenter();
  const controller = useMbtiController();
  const { state, actions } = controller;

  const userId = sessionPresenter.session?.userId;
  const accessToken = sessionPresenter.session?.accessToken;

  const presenter = useMbtiPresenter(controller, userId ?? "", accessToken);

  // 初期MBTI取得
  useEffect(() => {
    if (userId) {
      actions.fetchMbti(userId, accessToken);
    }
  }, [userId, accessToken, actions]);

  // エフェクト処理
  useEffect(() => {
    const processEffects = async () => {
      for (const effect of state.pendingEffects) {
        try {
          if (effect.kind === "FETCH_MBTI") {
            const mbti = await fetchMbtiFromApi(effect.payload.userId, effect.payload.accessToken);
            actions.setCurrentMbti(mbti);
          } else if (effect.kind === "UPDATE_MBTI") {
            await updateMbtiViaApi(effect.payload.userId, effect.payload.mbti, effect.payload.accessToken);
            actions.setCurrentMbti(effect.payload.mbti);
          }
          actions.acknowledgeEffect(effect.id);
        } catch (error) {
          actions.setError(error instanceof Error ? error.message : "エラーが発生しました");
          actions.acknowledgeEffect(effect.id);
        }
      }
    };

    if (state.pendingEffects.length > 0) {
      processEffects();
    }
  }, [state.pendingEffects, actions]);

  if (!userId) {
    return (
      <div className="p-6 text-center">
        <p>ログインしてください</p>
      </div>
    );
  }

  return (
    <ProfileView
      viewModel={presenter.viewModel}
      status={presenter.status}
      interactions={presenter.interactions}
    />
  );
};

export default ProfilePage;
