"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import AuthView from "../../../views/AuthView";
import { useAuthController } from "../../controllers/useAuthController";
import { useAuthPresenter } from "../../presenters/useAuthPresenter";
import { getBrowserSupabaseClient } from "../../../lib/browserSupabaseClient";

const AuthPage = () => {
  const supabase = getBrowserSupabaseClient();
  const controller = useAuthController();
  const presenter = useAuthPresenter(controller);
  const processingRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const supabaseEnabled = useMemo(
    () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    []
  );

  const syncSessionFromSupabase = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      controller.actions.setSession(null);
      return;
    }
    const user = data.session.user;
    controller.actions.setSession({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token ?? "",
      userId: user.id,
      role: (user.user_metadata?.role as any) ?? "NEW_HIRE",
    });
  };

  useEffect(() => {
    if (!supabaseEnabled) {
      controller.actions.setSession(null);
      return;
    }
    void syncSessionFromSupabase();
  }, [controller.actions, supabaseEnabled]);

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
    if (!supabaseEnabled) {
      controller.actions.setError({ kind: "ValidationError", message: "Supabase の環境変数が設定されていません。" });
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
            const { data, error } = await supabase.auth.signUp({
              email: effect.payload.email,
              password: effect.payload.password,
              options: {
                data: {
                  role: effect.payload.role,
                  displayName: effect.payload.displayName,
                },
              },
            });
            if (error) {
              throw error;
            }
            // signUp 직후 세션이 있을 때만 세션 반영
            if (data.session) {
              controller.actions.setSession({
                accessToken: data.session.access_token,
                refreshToken: data.session.refresh_token ?? "",
                userId: data.session.user.id,
                role: (data.session.user.user_metadata?.role as any) ?? effect.payload.role,
              });
            }
            break;
          }
          case "REQUEST_LOGIN": {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: effect.payload.email,
              password: effect.payload.password,
            });
            if (error) throw error;

            // role 메타데이터가 없으면 기본 NEW_HIRE로 한번 세팅
            const user = data.user;
            const role = (user.user_metadata?.role as "NEW_HIRE" | "MENTOR" | "ADMIN" | undefined) ?? "NEW_HIRE";
            if (!user.user_metadata?.role) {
              await supabase.auth.updateUser({ data: { role } });
            }
            controller.actions.setSession({
              accessToken: data.session?.access_token ?? "",
              refreshToken: data.session?.refresh_token ?? "",
              userId: user.id,
              role,
            });
            break;
          }
          case "REQUEST_LOGOUT": {
            await supabase.auth.signOut();
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
        void syncSessionFromSupabase();
      }
    };

    void run();
  }, [controller.actions, controller.state.pendingEffects, controller.state.session, supabaseEnabled, supabase.auth]);

  return <AuthView viewModel={presenter.viewModel} status={presenter.status} interactions={presenter.interactions} />;
};

export default AuthPage;
