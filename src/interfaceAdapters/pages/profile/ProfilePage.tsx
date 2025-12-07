"use client";

/**
 * Profile Page V2
 *
 * V2アーキテクチャを使用したプロフィールページ
 * Gateway → UseCase → Service → Presenter → View のフロー
 */

import { useSession } from "../../../components/SessionProvider";
import { useProfilePresenter } from "../../presenters/useProfilePresenter";
import ProfileView from "../../../views/ProfileView";

const ProfilePage = () => {
  // SessionProviderのセッション使用
  const { session } = useSession();

  const userId = session?.userId;
  const accessToken = session?.accessToken;

  // V2 Presenterを使用
  const presenter = useProfilePresenter({ userId, accessToken });

  // 未ログイン時
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
      isLoading={presenter.isLoading}
      isSaving={presenter.isSaving}
      error={presenter.error}
      actions={presenter.actions}
    />
  );
};

export default ProfilePage;
