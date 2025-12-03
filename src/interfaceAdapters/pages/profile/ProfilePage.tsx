"use client";

import { useEffect } from "react";
import { useMbtiController } from "../../controllers/useMbtiController";
import { useMbtiPresenter } from "../../presenters/useMbtiPresenter";
import { useSessionPresenter } from "../../presenters/useSessionPresenter";
import ProfileView from "../../../views/ProfileView";
import * as mbtiGateway from "../../gateways/api/mbtiGateway";

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
            const mbti = await mbtiGateway.getMbti(
              effect.payload.userId,
              effect.payload.accessToken
            );
            actions.setCurrentMbti(mbti);
          } else if (effect.kind === "UPDATE_MBTI") {
            await mbtiGateway.updateMbti(
              effect.payload.userId,
              effect.payload.mbti,
              effect.payload.accessToken
            );
            actions.setCurrentMbti(effect.payload.mbti);
          }
          actions.acknowledgeEffect(effect.id);
        } catch (error) {
          actions.setError(
            error instanceof Error ? error.message : "エラーが発生しました"
          );
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
