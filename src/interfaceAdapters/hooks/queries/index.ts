/**
 * React Query Hooks
 *
 * 기존 useState/useEffect 패턴을 대체하는 React Query hooks
 * 주요 이점:
 * - 자동 캐싱 및 백그라운드 리페칭
 * - Optimistic Updates로 즉각적인 UI 반응
 * - 코드량 50% 이상 감소
 * - 에러 처리 및 재시도 로직 내장
 */

// Conversations
export {
  useConversationsQuery,
  useCreateConversation,
  useDeleteConversation,
  conversationKeys,
} from "./useConversationsQuery";

// Messages
export {
  useMessagesQuery,
  useSendMessage,
  useBootstrapQuery,
  messageKeys,
  bootstrapKeys,
} from "./useMessagesQuery";
