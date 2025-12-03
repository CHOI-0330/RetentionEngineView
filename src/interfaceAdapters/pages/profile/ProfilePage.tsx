"use client";

import { useEffect } from "react";
import { useMbtiController } from "../../controllers/useMbtiController";
import { useMbtiPresenter } from "../../presenters/useMbtiPresenter";
import { useSession } from "../../../components/SessionProvider";
import ProfileView from "../../../views/ProfileView";
import type { MbtiType } from "../../../domain/mbti.types";
import { apiFetch } from "../../../lib/api";

const fetchMbtiFromApi = async (userId: string, accessToken?: string): Promise<MbtiType | null> => {
  const params = new URLSearchParams({ userId });
  const result = await apiFetch<{ mbti: MbtiType | null }>(`/api/mbti?${params.toString()}`, {
    method: "GET",
    accessToken,
    cacheTtl: 60 * 1000, // MBTI는 자주 변경되지 않으므로 1분 캐시
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.data?.mbti ?? null;
};

const updateMbtiViaApi = async (userId: string, mbti: MbtiType, accessToken?: string): Promise<void> => {
  const result = await apiFetch("/api/mbti", {
    method: "PUT",
    body: { userId, mbti },
    accessToken,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
};

const ProfilePage = () => {
  // SessionProvider의 세션 사용 (중복 fetch 방지)
  const { session } = useSession();
  const controller = useMbtiController();
  const { state, actions } = controller;

  const userId = session?.userId;
  const accessToken = session?.accessToken;

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
