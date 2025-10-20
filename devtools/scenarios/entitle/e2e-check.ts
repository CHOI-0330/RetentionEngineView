import { createDevEntitleAdapters } from '../../../src/dev/devAdapters';

async function runScenario() {
  const adapters = createDevEntitleAdapters();

  const questionContent = "新しい研修資料はどこで確認できますか？";
  const studentMessage = await adapters.messagePort.createUserMessage({
    convId: adapters.conversation.convId,
    authorId: adapters.newHire.userId,
    content: questionContent,
  });

  const assistantDraft = await adapters.messagePort.beginAssistantMessage(adapters.conversation.convId);

  const assistantText = await adapters.llmPort.generate({
    prompt: {
      messages: [
        { role: "user", content: questionContent },
      ],
    },
  });

  const assistantFinal = await adapters.messagePort.finalizeAssistantMessage({
    msgId: assistantDraft.msgId,
    finalText: assistantText,
  });

  const mentorFeedback = await adapters.feedbackPort.createFeedback({
    targetMsgId: assistantFinal.msgId,
    authorId: adapters.mentor.userId,
    authorRole: "MENTOR",
    content: "資料のリンクも案内するとさらに親切です。",
  });

  return {
    studentMessage,
    assistantFinal,
    mentorFeedback,
  };
}

runScenario()
  .then((result) => {
    console.log(
      JSON.stringify(
        {
          studentMessage: result.studentMessage.content,
          assistantReply: result.assistantFinal.content,
          feedback: result.mentorFeedback.content,
        },
        null,
        2
      )
    );
  })
  .catch((error) => {
    console.error("E2E scenario failed:", error);
    process.exit(1);
  });
