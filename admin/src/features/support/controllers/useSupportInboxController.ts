import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useState} from "react";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {useAdminPendingOperationGuard} from
  "../../../shared/pendingOperation";
import {
  loadSavedReplies,
  loadSupportConversation,
  loadSupportConversations,
  saveSavedReply,
  saveSupportConversation,
  saveSupportMessage,
  type SavedReply,
  type SavedReplyInput,
  type SupportAudience,
  type SupportDetail,
  type SupportLink,
  type SupportPage,
  type SupportStatus,
  type SupportSummary,
  type SupportView,
} from "../api/supportInboxRepository";

export interface SupportInboxController {
  view: SupportView;
  audience: SupportAudience | null;
  items: SupportSummary[];
  counts: SupportPage["counts"] | null;
  selectedId: string | null;
  detail: SupportDetail | null;
  savedReplies: SavedReply[];
  loadState: "loading" | "error" | "ready";
  detailState: "idle" | "loading" | "error" | "ready";
  isSaving: boolean;
  setView: (view: SupportView) => void;
  setAudience: (audience: SupportAudience | null) => void;
  select: (conversationId: string | null) => void;
  reply: (text: string, savedReplyId?: string | null) => Promise<boolean>;
  addNote: (text: string) => Promise<boolean>;
  logEmail: (input: {address: string; displayName: string | null;
    text: string}) => Promise<boolean>;
  assign: (ownerUid: string | null) => Promise<boolean>;
  setStatus: (status: SupportStatus) => Promise<boolean>;
  setLinks: (links: SupportLink[]) => Promise<boolean>;
  saveReply: (input: SavedReplyInput) => Promise<boolean>;
}

/**
 * Support (board AdminSupport): guest and organizer conversations from
 * WhatsApp, Instagram and logged email, longest waiting first, with the
 * selected conversation, saved replies, and reply, note, owner, status and
 * link actions. Replies are recorded; staff send them from the channel.
 */
export function useSupportInboxController({
  onError,
  onNotice,
}: {
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}): SupportInboxController {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [view, setViewState] = useState<SupportView>("open");
  const [audience, setAudience] = useState<SupportAudience | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: adminQueryKeys.support.conversations(view, audience),
    queryFn: () => loadSupportConversations({view, audience, limit: 200}),
  });
  const items = list.data?.items ?? [];
  const selectedId = chosenId && items.some((item) =>
    item.conversationId === chosenId) ? chosenId :
    items[0]?.conversationId ?? null;
  const detail = useQuery({
    queryKey: adminQueryKeys.support.conversation(selectedId ?? ""),
    queryFn: () => loadSupportConversation(selectedId!),
    enabled: selectedId !== null,
  });
  const replies = useQuery({
    queryKey: adminQueryKeys.support.savedReplies(),
    queryFn: loadSavedReplies,
  });
  const messageMutation = useMutation({mutationFn: saveSupportMessage});
  const updateMutation = useMutation({mutationFn: saveSupportConversation});
  const replyMutation = useMutation({mutationFn: saveSavedReply});

  const run = useCallback(async (
    work: () => Promise<unknown>,
    notice: string,
    failure: string
  ): Promise<boolean> => {
    const operation = beginOperation();
    if (!operation) return false;
    try {
      await work();
      await queryClient.invalidateQueries({
        queryKey: [...adminQueryKeys.all, "support"],
      });
      onError(null);
      onNotice(notice);
      return true;
    } catch (error) {
      onError(error instanceof Error && error.message ? error.message :
        failure);
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, endOperation, onError, onNotice, queryClient]);

  const current = detail.data?.conversation ?? null;
  const record = useCallback((direction: "outbound" | "note",
    text: string, savedReplyId: string | null, notice: string) => {
    if (!current) return Promise.resolve(false);
    const trimmed = text.trim();
    if (!trimmed) {
      onError("Write something first.");
      return Promise.resolve(false);
    }
    return run(() => messageMutation.mutateAsync({
      conversationId: current.conversationId, channel: current.channel,
      contactAddress: null, displayName: null, direction, text: trimmed,
      savedReplyId}), notice, "Unable to save the message.");
  }, [current, messageMutation, onError, run]);

  const update = useCallback((patch: {ownerUid?: string | null;
    status?: SupportStatus; links?: SupportLink[]}, notice: string) => {
    if (!current) return Promise.resolve(false);
    return run(() => updateMutation.mutateAsync({
      conversationId: current.conversationId,
      ownerUid: patch.ownerUid !== undefined ? patch.ownerUid :
        current.ownerUid,
      status: patch.status ?? current.status,
      links: patch.links ?? current.links,
    }), notice, "Unable to update the conversation.");
  }, [current, run, updateMutation]);

  return {
    view,
    audience,
    items,
    counts: list.data?.counts ?? null,
    selectedId,
    detail: detail.data ?? null,
    savedReplies: (replies.data ?? []).filter((reply) => reply.active),
    loadState: list.isPending ? "loading" : list.isError ? "error" :
      "ready",
    detailState: selectedId === null ? "idle" : detail.isPending ?
      "loading" : detail.isError ? "error" : "ready",
    isSaving: messageMutation.isPending || updateMutation.isPending ||
      replyMutation.isPending,
    setView: useCallback((next: SupportView) => {
      setViewState(next);
      setChosenId(null);
    }, []),
    setAudience,
    select: setChosenId,
    reply: useCallback((text: string, savedReplyId: string | null = null) =>
      record("outbound", text, savedReplyId, "Reply recorded."), [record]),
    addNote: useCallback((text: string) =>
      record("note", text, null, "Note added."), [record]),
    logEmail: useCallback((input) => {
      const address = input.address.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(address)) {
        onError("Enter the email address it came from.");
        return Promise.resolve(false);
      }
      if (!input.text.trim()) {
        onError("Paste the email first.");
        return Promise.resolve(false);
      }
      return run(() => messageMutation.mutateAsync({conversationId: null,
        channel: "email", contactAddress: address,
        displayName: input.displayName?.trim() || null,
        direction: "inbound", text: input.text.trim(), savedReplyId: null}),
      "Email logged.", "Unable to log the email.");
    }, [messageMutation, onError, run]),
    assign: useCallback((ownerUid: string | null) => update({ownerUid},
      ownerUid ? "Conversation assigned." : "Owner cleared."), [update]),
    setStatus: useCallback((status: SupportStatus) => update({status},
      status === "closed" ? "Conversation closed." : "Status updated."),
    [update]),
    setLinks: useCallback((links: SupportLink[]) => update({links},
      "Links updated."), [update]),
    saveReply: useCallback((input: SavedReplyInput) => run(
      () => replyMutation.mutateAsync({...input, title: input.title.trim(),
        body: input.body.trim()}),
      "Saved reply kept.", "Unable to save the reply."), [replyMutation, run]),
  };
}
