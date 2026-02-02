"use client";

import { useSessionGuard } from "../../hooks";
import { useKCListPresenter } from "../../presenters/useKCListPresenter";
import KCLibraryView from "../../../views/KCLibraryView";
import { Skeleton } from "../../../components/ui/skeleton";

const KCLibraryPage = () => {
  // 全認証ユーザーがアクセス可能（requiredRoleなし）
  const { state: sessionState, session } = useSessionGuard({});

  const presenter = useKCListPresenter({
    accessToken: session?.accessToken,
  });

  if (sessionState === "loading") {
    return (
      <div className="p-6">
        <Skeleton className="h-6 w-32" />
      </div>
    );
  }

  if (sessionState === "unauthenticated") {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        ログインしてください。{" "}
        <a className="text-primary underline" href="/entitle/auth">
          Auth
        </a>
      </div>
    );
  }

  return (
    <KCLibraryView
      viewModel={presenter.viewModel}
      actions={presenter.actions}
      accessToken={session?.accessToken}
    />
  );
};

export default KCLibraryPage;
