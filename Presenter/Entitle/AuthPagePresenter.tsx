"use client";

import { useEffect, useMemo, useRef } from "react";

import AuthView from "../../src/views/AuthView";
import { useAuthController } from "../../src/interfaceAdapters/controllers/useAuthController";
import { useAuthPresenter } from "../../src/interfaceAdapters/presenters/useAuthPresenter";

type AuthAction = "register" | "login" | "logout";

const AuthPagePresenter = () => {
  const controller = useAuthController();
  const presenter = useAuthPresenter(controller);
  const processingRef = useRef(false);

  const supabaseEnabled = useMemo(
    () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    []
  );

  // 단순한 fetch 래퍼: payload가 없으면 본문을 생략해 로그아웃 호출이 간단해집니다.
  const callAuthAction = async (action: AuthAction, payload?: unknown) => {
    const init: RequestInit = { method: "POST", cache: "no-store" };
    if (payload !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(payload);
    }
    const response = await fetch(`/api/auth/${action}`, init);
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const json = (await response.json()) as { data?: unknown };
    return json.data;
  };

  useEffect(() => {
    if (!supabaseEnabled) {
      controller.actions.setSession(null);
      return;
    }
    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!cancelled && response.ok) {
          const json = (await response.json()) as {
            data: {
              accessToken: string;
              refreshToken: string;
              userId: string;
              role: "NEW_HIRE" | "MENTOR" | "ADMIN";
            };
          };
          controller.actions.setSession(json.data);
          return;
        }
        if (!cancelled && response.status === 401) {
          const refreshResponse = await fetch("/api/auth/refresh", { method: "POST", cache: "no-store" });
          if (refreshResponse.ok) {
            const json = (await refreshResponse.json()) as {
              data: {
                accessToken: string;
                refreshToken: string;
                userId: string;
                role: "NEW_HIRE" | "MENTOR" | "ADMIN";
              };
            };
            controller.actions.setSession(json.data);
            return;
          }
        }
        if (!cancelled) {
          controller.actions.setSession(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          controller.actions.setSession(null);
        }
      }
    };

    // 로그인 페이지를 열었을 때 쿠키만으로도 세션을 복원할 수 있다는 점을 보여주기 위한 초기화입니다.
    void bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, [controller.actions, supabaseEnabled]);

  useEffect(() => {
    if (processingRef.current || !controller.state.pendingEffects.length) {
      return;
    }
    if (!supabaseEnabled) {
      controller.actions.setError({ kind: "ValidationError", message: "Supabase 환경 변수가 설정되지 않았습니다." });
      processingRef.current = false;
      controller.state.pendingEffects.forEach((pending) => controller.actions.acknowledgeEffect(pending.id));
      return;
    }

    const effect = controller.state.pendingEffects[0];
    processingRef.current = true;

    const run = async () => {
      try {
        switch (effect.kind) {
          case "REQUEST_REGISTER": {
            await callAuthAction("register", effect.payload);
            break;
          }
          case "REQUEST_LOGIN": {
            const session = (await callAuthAction("login", effect.payload)) as {
              accessToken: string;
              refreshToken: string;
              userId: string;
              role: "NEW_HIRE" | "MENTOR" | "ADMIN";
            };
            controller.actions.setSession(session);
            break;
          }
          case "REQUEST_LOGOUT": {
            await callAuthAction("logout", effect.payload);
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
      }
    };

    void run();
  }, [controller.actions, controller.state.pendingEffects, controller.state.session, supabaseEnabled]);

  return <AuthView viewModel={presenter.viewModel} status={presenter.status} interactions={presenter.interactions} />;
};

export default AuthPagePresenter;
