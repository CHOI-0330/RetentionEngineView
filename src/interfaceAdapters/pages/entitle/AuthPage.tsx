"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import AuthView from "../../../views/AuthView";
import { useAuthController } from "../../controllers/useAuthController";
import { useAuthPresenter } from "../../presenters/useAuthPresenter";
import { useSession } from "../../../components/SessionProvider";
import { apiFetch, invalidateSessionCache } from "../../../lib/api";

const AuthPage = () => {
  const controller = useAuthController();
  const presenter = useAuthPresenter(controller);
  const processingRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const { session: globalSession, interactions } = useSession();

  // SessionProvider의 세션을 컨트롤러에 동기화
  useEffect(() => {
    if (globalSession) {
      controller.actions.setSession({
        accessToken: globalSession.accessToken,
        refreshToken: globalSession.refreshToken,
        userId: globalSession.userId,
        role: globalSession.role,
      });
    } else {
      controller.actions.setSession(null);
    }
  }, [globalSession, controller.actions]);

  // ログイン成功後、ロールに応じて自動遷移します。
  const redirectedUserRef = useRef<string | null>(null);
  useEffect(() => {
    const session = controller.state.session;
    if (!session) {
      redirectedUserRef.current = null;
      return;
    }
    if (!pathname) {
      return;
    }
    const target = session.role === "MENTOR" ? "/mentor" : "/student/dashboard";
    const alreadyThere = pathname === target || pathname.startsWith(target);
    if (!alreadyThere && redirectedUserRef.current !== session.userId) {
      redirectedUserRef.current = session.userId;
      router.replace(target);
    }
  }, [controller.state.session, pathname, router]);

  useEffect(() => {
    if (processingRef.current || !controller.state.pendingEffects.length) {
      return;
    }

    const effect = controller.state.pendingEffects[0];
    processingRef.current = true;

    const run = async () => {
      try {
        switch (effect.kind) {
          case "REQUEST_REGISTER": {
            const result = await apiFetch("/api/auth/register", {
              method: "POST",
              body: {
                email: effect.payload.email,
                password: effect.payload.password,
                displayName: effect.payload.displayName,
                role: effect.payload.role,
              },
            });
            if (!result.ok) {
              throw new Error(result.error);
            }
            break;
          }
          case "REQUEST_LOGIN": {
            const result = await apiFetch<{
              accessToken: string;
              refreshToken: string;
              userId: string;
              role: "NEW_HIRE" | "MENTOR" | "ADMIN";
            }>("/api/auth/login", {
              method: "POST",
              body: {
                email: effect.payload.email,
                password: effect.payload.password,
              },
            });
            if (!result.ok) {
              throw new Error(result.error);
            }
            controller.actions.setSession({
              accessToken: result.data.accessToken,
              refreshToken: result.data.refreshToken,
              userId: result.data.userId,
              role: result.data.role,
            });
            break;
          }
          case "REQUEST_LOGOUT": {
            const result = await apiFetch("/api/auth/logout", {
              method: "POST",
            });
            if (!result.ok) {
              throw new Error(result.error);
            }
            controller.actions.setSession(null);
            break;
          }
          default:
            break;
        }
      } catch (error) {
        console.error(error);
        controller.actions.setSession(null);
        controller.actions.setError(
          error instanceof Error
            ? { kind: "ValidationError", message: error.message }
            : { kind: "ValidationError", message: "Unexpected auth error" }
        );
      } finally {
        controller.actions.acknowledgeEffect(effect.id);
        processingRef.current = false;
        // 로그인/로그아웃 후 세션 캐시 무효화하고 갱신
        invalidateSessionCache();
        await interactions.refetchSession();
      }
    };

    void run();
  }, [controller.actions, controller.state.pendingEffects, interactions]);

  return <AuthView viewModel={presenter.viewModel} status={presenter.status} interactions={presenter.interactions} />;
};

export default AuthPage;
