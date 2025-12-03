"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import AuthView from "../../../views/AuthView";
import { useAuthController } from "../../controllers/useAuthController";
import { useAuthPresenter } from "../../presenters/useAuthPresenter";

const AuthPage = () => {
  const controller = useAuthController();
  const presenter = useAuthPresenter(controller);
  const processingRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const syncSessionFromApi = useMemo(
    () =>
      async () => {
        try {
          const response = await fetch("/api/auth/session", {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          });
          const raw = await response.text();
          let json: any = null;
          if (raw) {
            try {
              json = JSON.parse(raw);
            } catch {
              json = null;
            }
          }
          if (!response.ok) {
            controller.actions.setSession(null);
            return;
          }
          const data = json?.data;
          if (!data) {
            controller.actions.setSession(null);
            return;
          }
          controller.actions.setSession({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            userId: data.userId,
            role: data.role,
          });
        } catch {
          controller.actions.setSession(null);
        }
      },
    [controller.actions]
  );

  useEffect(() => {
    void syncSessionFromApi();
  }, [syncSessionFromApi]);

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
            const response = await fetch("/api/auth/register", {
              method: "POST",
              cache: "no-store",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                email: effect.payload.email,
                password: effect.payload.password,
                displayName: effect.payload.displayName,
                role: effect.payload.role,
              }),
            });
            const raw = await response.text();
            let json: any = null;
            if (raw) {
              try {
                json = JSON.parse(raw);
              } catch {
                json = null;
              }
            }
            if (!response.ok) {
              throw new Error(json?.error ?? raw ?? "Unexpected auth error");
            }
            break;
          }
          case "REQUEST_LOGIN": {
            const response = await fetch("/api/auth/login", {
              method: "POST",
              cache: "no-store",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: effect.payload.email,
                password: effect.payload.password,
              }),
            });
            const raw = await response.text();
            let json: any = null;
            if (raw) {
              try {
                json = JSON.parse(raw);
              } catch {
                json = null;
              }
            }
            if (!response.ok) {
              throw new Error(json?.error ?? raw ?? "Unexpected auth error");
            }
            const data = json?.data as
              | {
                  accessToken: string;
                  refreshToken: string;
                  userId: string;
                  role: "NEW_HIRE" | "MENTOR" | "ADMIN";
                }
              | undefined;
            if (!data) {
              throw new Error("Invalid auth response.");
            }
            controller.actions.setSession({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              userId: data.userId,
              role: data.role,
            });
            break;
          }
          case "REQUEST_LOGOUT": {
            const response = await fetch("/api/auth/logout", {
              method: "POST",
              cache: "no-store",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
            });
            const raw = await response.text();
            let json: any = null;
            if (raw) {
              try {
                json = JSON.parse(raw);
              } catch {
                json = null;
              }
            }
            if (!response.ok) {
              throw new Error(json?.error ?? raw ?? "Unexpected auth error");
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
        void syncSessionFromApi();
      }
    };

    void run();
  }, [controller.actions, controller.state.pendingEffects, controller.state.session, syncSessionFromApi]);

  return <AuthView viewModel={presenter.viewModel} status={presenter.status} interactions={presenter.interactions} />;
};

export default AuthPage;
