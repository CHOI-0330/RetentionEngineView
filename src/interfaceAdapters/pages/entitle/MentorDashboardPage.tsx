"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import MentorDashboardView from "../../../views/MentorDashboardView";
import { useMentorDashboardController } from "../../controllers/useMentorDashboardController";
import { useMentorDashboardPresenter } from "../../presenters/useMentorDashboardPresenter";
import type { MentorDashboardControllerEffect } from "../../controllers/useMentorDashboardController";
import type { UseCaseFailure } from "../../../application/entitle/models";
import type { StudentSummary } from "../../../application/entitle/ports";
import { useSession } from "../../../components/SessionProvider";
import { apiFetch } from "../../../lib/apiClient";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import type { Message } from "../../../domain/core";
import { Skeleton } from "../../../components/ui/skeleton";

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

const MentorDashboardPage = () => {
  const controller = useMentorDashboardController();
  const presenter = useMentorDashboardPresenter(controller);

  const processingRef = useRef(false);
  const hasRequestedInitial = useRef(false);
  const router = useRouter();
  const { session, isLoading: isSessionLoading } = useSession();
  const [assignmentNewhireId, setAssignmentNewhireId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const processEffectBackend = useCallback(
    async (effect: MentorDashboardControllerEffect) => {
      if (!session) throw new Error("Login required");
      switch (effect.kind) {
        case "REQUEST_REFRESH_SUMMARIES": {
          const result = await apiFetch<{ conv_id: string; title: string; created_at: string; owner_name?: string }[]>(
            `/conversations/mentor?mentorId=${encodeURIComponent(session.userId)}`,
            undefined,
            session.accessToken
          );
          const summaries: StudentSummary[] = (result ?? []).map((c) => ({
            newhire: {
              userId: "", // owner_id 미반환: 서버 개선 시 채움
              role: "NEW_HIRE",
              displayName: c.owner_name ?? "新入社員",
              email: "",
              createdAt: c.created_at,
            },
            conversation: {
              convId: c.conv_id,
              ownerId: "",
              title: c.title,
              state: "ACTIVE",
              createdAt: c.created_at,
              lastActiveAt: c.created_at,
            },
            recentMessage: undefined,
            needsReview: false,
            totalChats: 0,
            lastActivityAt: c.created_at,
          }));
          controller.actions.applySummaries(summaries);
          break;
        }
        case "REQUEST_SUBMIT_FEEDBACK_QUALITY": {
          controller.actions.finalizeSubmitFeedbackQuality(effect.payload.studentId);
          break;
        }
        default:
          break;
      }
    },
    [controller.actions, session]
  );

  useEffect(() => {
    if (processingRef.current) {
      return;
    }
    const effect = presenter.pendingEffects[0];
    if (!effect) {
      return;
    }

    processingRef.current = true;

    void processEffectBackend(effect)
      .catch((error) => {
        controller.actions.reportExternalFailure(normalizeError(error));
        if (error instanceof Error && /Unauthorized|Forbidden/i.test(error.message)) {
          router.push("/entitle/auth");
        }
      })
      .finally(() => {
        if (effect.kind === "REQUEST_REFRESH_SUMMARIES") {
          controller.actions.finalizeRefresh();
        }
        controller.actions.acknowledgeEffect(effect.id);
        processingRef.current = false;
      });
  }, [controller.actions, presenter.pendingEffects, processEffectBackend, router]);

  useEffect(() => {
    if (hasRequestedInitial.current) {
      return;
    }
    if (!session || session.role !== "MENTOR") {
      return;
    }
    hasRequestedInitial.current = true;
    controller.actions.requestRefresh();
  }, [controller.actions, session]);

  const handleCreateAssignment = async () => {
    if (!session) {
      setAssignmentError("ログインしてください。");
      return;
    }
    const trimmed = assignmentNewhireId.trim();
    if (!trimmed) {
      setAssignmentError("新入社員IDを入力してください。");
      return;
    }
    setIsAssigning(true);
    setAssignmentError(null);
    try {
      await apiFetch(
        "/mentor-assignments",
        {
          method: "POST",
          body: JSON.stringify({
            mentorId: session.userId,
            newhireId: trimmed,
          }),
        },
        session.accessToken
      );
      setAssignmentNewhireId("");
      controller.actions.requestRefresh();
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : "メンターアサインの作成に失敗しました。");
    } finally {
      setIsAssigning(false);
    }
  };

  if (isSessionLoading) {
    return <div className="p-4 text-sm text-muted-foreground">ログイン情報を確認中...</div>;
  }

  if (!session) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        ログインしてください。 <a className="text-primary underline" href="/entitle/auth">Auth</a>
      </div>
    );
  }

  if (session.role !== "MENTOR") {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        メンター権限が必要です。現在のロール: {session.role}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold">メンターアサイン作成</p>
          <p className="text-xs text-muted-foreground">新入社員IDを入力して自身にアサインできます。</p>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">新入社員IDを入力</label>
          <Input
            value={assignmentNewhireId}
            onChange={(event) => setAssignmentNewhireId(event.target.value)}
            placeholder="newhire-user-id"
          />
        </div>
        {assignmentError ? <p className="text-sm text-destructive">{assignmentError}</p> : null}
        <p className="text-xs text-muted-foreground">ユーザー一覧は表示しません。IDを直接入力してください。</p>
        <Button onClick={handleCreateAssignment} disabled={isAssigning} className="w-full sm:w-auto">
          {isAssigning ? "作成中..." : "アサインを追加"}
        </Button>
      </div>

      <MentorDashboardView
        viewModel={presenter.viewModel}
        status={presenter.status}
        meta={presenter.meta}
        interactions={presenter.interactions}
      />
    </div>
  );
};

export default MentorDashboardPage;
