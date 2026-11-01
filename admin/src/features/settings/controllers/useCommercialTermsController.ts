import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useState} from "react";
import type {CommercialTerms} from "../../../generated/contracts/commercialTerms";
import type {CommercialTermsOverride} from
  "../../../generated/contracts/commercialTermsOverride";
import {
  ownerDecisionCommercialTerms,
  ownerDecisionCommercialTermsReason,
} from "../../../shared/domain/commercialTermsDecision";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  loadCommercialTerms,
  replaceCommercialTerms,
  type CommercialTermsListing,
  type CommercialTermsReplacement,
} from "../api/commercialTermsRepository";
import {
  draftFromOverride,
  draftFromTerms,
  overrideFromDraft,
  overrideTermsDiff,
  platformTermsDiff,
  termsFromDraft,
  type TermsDiffRow,
  type TermsDraft,
  type TermsFieldId,
} from "./commercialTermsForm";

export interface CommercialTermsEditor {
  /** The revision this edit started from; the save names it. */
  baseRevision: number;
  draft: TermsDraft;
  reason: string;
  errors: string[];
  /** Present once the operator asked to review the change. */
  preview: TermsDiffRow[] | null;
  /** Set when the outcome of the last save is unknown; retry resends it. */
  unconfirmed: CommercialTermsReplacement | null;
}

export type CommercialTermsLoadState = "loading" | "error" | "ready";

export interface CommercialTermsController {
  scope: "platform" | "organizer";
  organizerId: string | null;
  canManage: boolean;
  listing: CommercialTermsListing | null;
  loadState: CommercialTermsLoadState;
  loadError: string | null;
  editor: CommercialTermsEditor | null;
  isSaving: boolean;
  searchText: string;
  searchState: "idle" | "loading" | "error" | "ready";
  searchMatches: CommercialTermsListing["organizerMatches"];
  refresh: () => void;
  startEdit: () => void;
  startFromOwnerDecision: () => void;
  cancelEdit: () => void;
  setField: (id: TermsFieldId, text: string) => void;
  setInherited: (id: TermsFieldId, inherited: boolean) => void;
  setReason: (text: string) => void;
  review: () => boolean;
  backToEdit: () => void;
  save: () => Promise<boolean>;
  setSearchText: (text: string) => void;
  search: () => void;
}

export function useCommercialTermsController({
  canManage,
  onError,
  onNotice,
  organizerId,
}: {
  canManage: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  organizerId: string | null;
}): CommercialTermsController {
  const queryClient = useQueryClient();
  const scope = organizerId === null ? "platform" : "organizer";
  const scopeKey = organizerId ?? "platform";
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const listingQuery = useQuery({
    queryKey: adminQueryKeys.finance.commercialTerms(scopeKey),
    queryFn: () => loadCommercialTerms({organizerId, organizerQuery: null}),
    enabled: canManage,
    retry: false,
  });
  const [editorState, setEditorState] = useState<{
    scopeKey: string; editor: CommercialTermsEditor;
  } | null>(null);
  const editor = editorState?.scopeKey === scopeKey ? editorState.editor : null;
  const [searchText, setSearchText] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const searchQuery = useQuery({
    queryKey: adminQueryKeys.finance.commercialTermsSearch(submittedSearch),
    queryFn: () => loadCommercialTerms({organizerId: null,
      organizerQuery: submittedSearch}),
    enabled: canManage && submittedSearch.length >= 2,
    retry: false,
  });
  const saveMutation = useMutation({
    mutationKey: adminQueryKeys.finance.commercialTermsReplace(),
    mutationFn: replaceCommercialTerms,
  });
  const listing = listingQuery.data ?? null;

  const updateEditor = useCallback((change: (
    current: CommercialTermsEditor) => CommercialTermsEditor) => {
    setEditorState((state) => state && state.scopeKey === scopeKey ?
      {scopeKey, editor: change(state.editor)} : state);
  }, [scopeKey]);

  const open = useCallback((draft: TermsDraft, reason: string) => {
    if (!listing) return;
    const record = scope === "platform" ? listing.platform : listing.organizer;
    setEditorState({scopeKey, editor: {baseRevision: record?.revision ?? 0,
      draft, reason, errors: [], preview: null, unconfirmed: null}});
    onError(null);
  }, [listing, onError, scope, scopeKey]);

  const startEdit = useCallback(() => {
    if (!listing) return;
    open(scope === "platform" ?
      listing.platform ? draftFromTerms(listing.platform.terms) : {} :
      draftFromOverride(listing.organizer?.terms ?? null), "");
  }, [listing, open, scope]);

  const startFromOwnerDecision = useCallback(() => {
    open(draftFromTerms(ownerDecisionCommercialTerms as CommercialTerms),
      ownerDecisionCommercialTermsReason);
  }, [open]);

  const setField = useCallback((id: TermsFieldId, text: string) => {
    updateEditor((current) => ({...current, preview: null,
      draft: {...current.draft, [id]: text}}));
  }, [updateEditor]);

  const setInherited = useCallback((id: TermsFieldId, inherited: boolean) => {
    updateEditor((current) => {
      const draft = {...current.draft};
      if (inherited) delete draft[id];
      else draft[id] = inheritedDraftText(listing, id);
      return {...current, draft, preview: null};
    });
  }, [listing, updateEditor]);

  const setReason = useCallback((text: string) => {
    updateEditor((current) => ({...current, reason: text}));
  }, [updateEditor]);

  const review = useCallback((): boolean => {
    if (!editor || !listing) return false;
    const reasonError = editor.reason.trim().length < 3 ?
      ["Give a reason of at least three characters for the audit trail."] : [];
    const preview = scope === "platform" ? (() => {
      const result = termsFromDraft(editor.draft);
      return result.terms ? {rows: platformTermsDiff(
        listing.platform?.terms ?? null, result.terms), errors: undefined} :
        {rows: undefined, errors: result.errors};
    })() : (() => {
      const result = overrideFromDraft(editor.draft);
      return result.terms ? {rows: overrideTermsDiff(
        listing.platform?.terms ?? null, listing.organizer?.terms ?? null,
        result.terms), errors: undefined} :
        {rows: undefined, errors: result.errors};
    })();
    if (!preview.rows || reasonError.length > 0) {
      const errors = [...(preview.errors ?? []), ...reasonError];
      updateEditor((current) => ({...current, preview: null, errors}));
      return false;
    }
    const rows = preview.rows;
    if (!rows.some((row) => row.changed)) {
      updateEditor((current) => ({...current, preview: null,
        errors: ["Nothing has changed from the current revision."]}));
      return false;
    }
    updateEditor((current) => ({...current, errors: [], preview: rows}));
    return true;
  }, [editor, listing, scope, updateEditor]);

  const backToEdit = useCallback(() => {
    updateEditor((current) => ({...current, preview: null}));
  }, [updateEditor]);

  const cancelEdit = useCallback(() => {
    setEditorState(null);
    onError(null);
  }, [onError]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!editor || (!editor.preview && !editor.unconfirmed)) return false;
    const payload = editor.unconfirmed ?? buildPayload(scope, organizerId,
      editor);
    if (!payload) return false;
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const result = await saveMutation.mutateAsync(payload);
      setEditorState(null);
      onError(null);
      onNotice(`${scope === "platform" ? "Platform terms" :
        "This organizer's terms"} saved as revision ${result.revision}. ` +
        "New payments use them; recorded payments keep their own terms.");
      await queryClient.invalidateQueries({queryKey:
        adminQueryKeys.finance.commercialTerms(scopeKey)});
      if (scope === "organizer") {
        await queryClient.invalidateQueries({queryKey:
          adminQueryKeys.finance.commercialTerms("platform")});
      }
      return true;
    } catch (error) {
      const code = errorCode(error);
      if (code === "aborted") {
        await listingQuery.refetch();
        const latest = queryClient.getQueryData<CommercialTermsListing>(
          adminQueryKeys.finance.commercialTerms(scopeKey));
        const record = scope === "platform" ? latest?.platform :
          latest?.organizer;
        updateEditor((current) => ({...current, unconfirmed: null,
          preview: null, baseRevision: record?.revision ?? 0, errors: []}));
        onError("Someone saved these terms while you were editing. " +
          "Your draft is kept; review it against the latest revision.");
      } else if (isDefinitive(code) || isRequestValidationError(error)) {
        updateEditor((current) => ({...current, unconfirmed: null}));
        onError(messageFromError(error, "These terms could not be saved."));
      } else {
        updateEditor((current) => ({...current, unconfirmed: payload}));
        onError("The save may not have reached Catch. Retry the same save; " +
          "it is applied once even if the first one arrived.");
      }
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, editor, endOperation, listingQuery, onError, onNotice,
    organizerId, queryClient, saveMutation, scope, scopeKey, updateEditor]);

  const search = useCallback(() => {
    const query = searchText.trim();
    if (query.length < 2) {
      onError("Type at least two characters of the organizer's name.");
      return;
    }
    onError(null);
    setSubmittedSearch(query);
  }, [onError, searchText]);

  return {
    scope,
    organizerId,
    canManage,
    listing,
    loadState: !canManage ? "error" : listingQuery.isPending ? "loading" :
      listingQuery.isError ? "error" : "ready",
    loadError: !canManage ?
      "Commercial terms are open to Finance and Admin Owner only." :
      listingQuery.isError ? messageFromError(listingQuery.error,
        "Commercial terms could not be loaded.") : null,
    editor,
    isSaving: saveMutation.isPending,
    searchText,
    searchState: submittedSearch.length < 2 ? "idle" :
      searchQuery.isPending ? "loading" : searchQuery.isError ? "error" :
        "ready",
    searchMatches: searchQuery.data?.organizerMatches ?? [],
    refresh: () => void listingQuery.refetch(),
    startEdit,
    startFromOwnerDecision,
    cancelEdit,
    setField,
    setInherited,
    setReason,
    review,
    backToEdit,
    save,
    setSearchText,
    search,
  };
}

/** Starting text when an operator chooses to override an inherited field. */
function inheritedDraftText(listing: CommercialTermsListing | null,
  id: TermsFieldId): string {
  const platform = listing?.platform?.terms;
  return platform ? draftFromTerms(platform)[id] ?? "" : "";
}

function buildPayload(scope: "platform" | "organizer",
  organizerId: string | null, editor: CommercialTermsEditor):
  CommercialTermsReplacement | null {
  const terms = scope === "platform" ? termsFromDraft(editor.draft).terms :
    overrideFromDraft(editor.draft).terms;
  if (!terms) return null;
  return {action: "replace", organizerId, expectedRevision: editor.baseRevision,
    terms: terms as CommercialTerms | CommercialTermsOverride,
    reason: editor.reason.trim()};
}

function errorCode(error: unknown): string | null {
  const code = (error as {code?: unknown} | null)?.code;
  return typeof code === "string" ? code.replace(/^functions\//u, "") : null;
}

/** Codes where the server answered and did not save. */
function isDefinitive(code: string | null): boolean {
  return code !== null && ["invalid-argument", "permission-denied",
    "unauthenticated", "not-found", "failed-precondition",
    "resource-exhausted", "already-exists", "out-of-range"].includes(code);
}

/** A request the console refused to send never reached the server. */
function isRequestValidationError(error: unknown): boolean {
  return error instanceof Error &&
    error.name === "AdminCallableValidationError";
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
