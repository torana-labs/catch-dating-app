import {
  getSupportConversation,
  listSupportConversations,
  listSupportSavedReplies,
  recordSupportMessage,
  updateSupportConversation,
  upsertSupportSavedReply,
} from "../../../shared/api/adminApi";
import type {AdminListSupportConversationsCallablePayload} from
  "../../../generated/contracts/adminListSupportConversationsCallablePayload";
import type {AdminListSupportConversationsCallableResponse} from
  "../../../generated/contracts/adminListSupportConversationsCallableResponse";
import type {AdminGetSupportConversationCallableResponse} from
  "../../../generated/contracts/adminGetSupportConversationCallableResponse";
import type {AdminUpdateSupportConversationCallablePayload} from
  "../../../generated/contracts/adminUpdateSupportConversationCallablePayload";
import type {AdminRecordSupportMessageCallablePayload} from
  "../../../generated/contracts/adminRecordSupportMessageCallablePayload";
import type {AdminListSupportSavedRepliesCallableResponse} from
  "../../../generated/contracts/adminListSupportSavedRepliesCallableResponse";
import type {AdminUpsertSupportSavedReplyCallablePayload} from
  "../../../generated/contracts/adminUpsertSupportSavedReplyCallablePayload";

export type SupportQuery = AdminListSupportConversationsCallablePayload;
export type SupportView = SupportQuery["view"];
export type SupportAudience = NonNullable<SupportQuery["audience"]>;
export type SupportPage = AdminListSupportConversationsCallableResponse;
export type SupportSummary = SupportPage["items"][number];
export type SupportDetail = AdminGetSupportConversationCallableResponse;
export type SupportLink = SupportDetail["conversation"]["links"][number];
export type SupportStatus = SupportDetail["conversation"]["status"];
export type SupportUpdate = AdminUpdateSupportConversationCallablePayload;
export type SupportMessageInput = AdminRecordSupportMessageCallablePayload;
export type SavedReply =
  AdminListSupportSavedRepliesCallableResponse["items"][number];
export type SavedReplyInput = AdminUpsertSupportSavedReplyCallablePayload;

/** Open (longest waiting first), mine, waiting on them, or closed. */
export function loadSupportConversations(
  query: SupportQuery
): Promise<SupportPage> {
  return listSupportConversations(query);
}

/** Opening a conversation shows the full address; the server logs it. */
export function loadSupportConversation(
  conversationId: string
): Promise<SupportDetail> {
  return getSupportConversation({conversationId});
}

export function saveSupportConversation(payload: SupportUpdate) {
  return updateSupportConversation(payload);
}

/** A reply staff sent, a logged email, or an internal note. */
export function saveSupportMessage(payload: SupportMessageInput) {
  return recordSupportMessage(payload);
}

export async function loadSavedReplies(): Promise<SavedReply[]> {
  return (await listSupportSavedReplies()).items;
}

export function saveSavedReply(payload: SavedReplyInput) {
  return upsertSupportSavedReply(payload);
}
