"use client";

import { useEffect, useMemo, useRef } from "react";

import StudentChatView from "../../src/views/StudentChatView";
import { useStudentChatController } from "../../src/interfaceAdapters/controllers/useStudentChatController";
import { useStudentChatPresenter } from "../../src/interfaceAdapters/presenters/useStudentChatPresenter";
import type { StudentChatControllerEffect } from "../../src/interfaceAdapters/controllers/useStudentChatController";
import type { MessageDelta, UseCaseFailure } from "../../src/application/entitle/models";
import { createDevEntitleAdapters } from "./devAdapters";

const normalizeError = (reason: unknown): UseCaseFailure => ({
  kind: "ValidationError",
  message: reason instanceof Error ? reason.message : String(reason),
});

const StudentChatPagePresenter = () => {
  const adapters = useMemo(() => createDevEntitleAdapters(), []);

  const controller = useStudentChatController({
    conversation: adapters.conversation,
    currentUser: adapters.newHire,
    initialMessages: adapters.initialMessages,
    initialFeedbacks: adapters.initialFeedbacks,
  });

  const presenter = useStudentChatPresenter(controller);

  const processingRef = useRef(false);

  useEffect(() => {
    if (processingRef.current) {
      return;
    }
    const effect = presenter.pendingEffects[0];
    if (!effect) {
      return;
    }

    processingRef.current = true;

    const processEffect = async (nextEffect: StudentChatControllerEffect) => {
      try {
        switch (nextEffect.kind) {
          case "REQUEST_PERSIST_USER_MESSAGE": {
            const saved = await adapters.messagePort.createUserMessage(nextEffect.payload);
            controller.actions.notifyUserMessagePersisted(saved);
            break;
          }
          case "REQUEST_BEGIN_ASSISTANT_MESSAGE": {
            const assistant = await adapters.messagePort.beginAssistantMessage(nextEffect.payload.convId);
            controller.actions.notifyAssistantMessageCreated(assistant);
            break;
          }
          case "REQUEST_STREAM_ASSISTANT_RESPONSE": {
            let accumulated = "";
            try {
              for await (const delta of adapters.llmPort.streamGenerate(nextEffect.payload)) {
                accumulated += delta.text;
                await adapters.messagePort.appendAssistantDelta({
                  msgId: controller.state.activeAssistantMessageId ?? delta.seqNo.toString(),
                  delta: delta.text,
                  seqNo: delta.seqNo,
                });
                controller.actions.notifyAssistantDelta(delta as MessageDelta);
              }
              controller.actions.notifyAssistantStreamCompleted(accumulated);
            } catch (error) {
              controller.actions.reportExternalFailure(normalizeError(error));
              controller.actions.notifyAssistantStreamCancelled();
            }
            break;
          }
          case "REQUEST_FINALIZE_ASSISTANT_MESSAGE": {
            await adapters.messagePort.finalizeAssistantMessage(nextEffect.payload);
            break;
          }
          case "REQUEST_CANCEL_ASSISTANT_MESSAGE": {
            await adapters.messagePort.cancelAssistantMessage(nextEffect.payload.msgId);
            break;
          }
          case "REQUEST_LIST_MESSAGES": {
            const response = await adapters.messagePort.listConversationMessages({
              convId: adapters.conversation.convId,
              cursor: nextEffect.payload.cursor,
            });
            controller.actions.notifyMessagesLoaded({
              items: response.items,
              nextCursor: response.nextCursor,
            });
            break;
          }
          case "REQUEST_LIST_FEEDBACKS": {
            const response = await adapters.feedbackPort.listFeedbacks({ msgId: nextEffect.payload.msgId });
            const authorEntries = await Promise.all(
              response.items.map(async (item) => {
                const displayName = await adapters.feedbackLookupPort.getUserDisplayName(item.authorId);
                return [item.authorId, displayName ?? item.authorId] as const;
              })
            );
            const authorMap = Object.fromEntries(authorEntries);
            controller.actions.applyFeedbackForMessage(nextEffect.payload.msgId, response.items, authorMap);
            break;
          }
          case "REQUEST_CREATE_FEEDBACK": {
            const created = await adapters.feedbackPort.createFeedback(nextEffect.payload);
            const existing = controller.state.feedbackByMessageId[created.targetMsgId] ?? [];
            controller.actions.applyFeedbackForMessage(created.targetMsgId, [...existing, created]);
            break;
          }
          default:
            break;
        }
      } catch (error) {
        controller.actions.reportExternalFailure(normalizeError(error));
      } finally {
        controller.actions.acknowledgeEffect(nextEffect.id);
        processingRef.current = false;
      }
    };

    void processEffect(effect);
  }, [adapters, controller.actions, controller.state.activeAssistantMessageId, presenter.pendingEffects, presenter.viewModel.mentorFeedbacks]);

  useEffect(() => {
    if (!presenter.pendingEffects.length) {
      controller.actions.requestOlderMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StudentChatView
      conversationTitle={adapters.conversation.title}
      viewModel={presenter.viewModel}
      status={presenter.status}
      meta={presenter.meta}
      interactions={presenter.interactions}
    />
  );
};

export default StudentChatPagePresenter;
