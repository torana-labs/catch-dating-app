import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {
  createSalesAccount, createSalesCustomField, getSalesAccount,
  linkSalesInboundIntent, nominateSalesOrganizer,
  listSalesAccounts, listSalesCustomFields,
  listSalesInboundIntents, listSalesOpportunities, listSalesTasks,
  recordSalesActivity, searchCanonicalOrganizers, setSalesCustomFieldValue,
  updateSalesAccount,
  upsertSalesOpportunity, upsertSalesTask,
  applySalesImport, listSalesContacts, listSalesEvidence,
  applySalesImportCompensation, previewSalesImportCompensation,
  previewSalesImport,
} from "../api/salesRepository";
import type {
  SalesAccount, SalesCreateAccountInput, SalesCreateCustomFieldInput,
  SalesLinkInboundIntentInput,
  SalesListAccountsInput, SalesNominateOrganizerInput,
  SalesRecordActivityInput,
  SalesResearchStatus, SalesSetCustomFieldValueInput, SalesUpdateAccountInput,
  SalesUpsertOpportunityInput,
  SalesUpsertTaskInput,
  SalesImportPacket, SalesImportPreview,
  SalesImportCompensationInput, SalesImportCompensationPreview,
} from "../api/salesTypes";

export const researchStatusOptions: Array<{value: SalesResearchStatus; label: string}> = [
  {value: "new", label: "New"},
  {value: "needs_research", label: "Needs research"},
  {value: "ready_for_review", label: "Ready for review"},
  {value: "qualified", label: "Qualified"},
  {value: "benchmark_only", label: "Benchmark only"},
  {value: "no_fit", label: "No fit"},
  {value: "archived", label: "Archived"},
];

export function salesErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/aborted|revision mismatch|record changed since review/iu.test(message)) {
    return "Someone updated this record. Compare the latest details before saving again. Your edits are still here.";
  }
  return message || "The change could not be saved. Your edits are still here.";
}

export function toLocalDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isSalesSearchWord(value: string): boolean {
  return /^[A-Za-z0-9]{2,80}$/u.test(value);
}

export function useSalesWorkspaceController({
  area,
  selectedOrganizerId,
  assignedStaffOnly = false,
  onError,
  onNotice,
}: {
  area: "today" | "hosts" | "pipeline" | "research" | "pilots" | "settings";
  selectedOrganizerId: string | null;
  assignedStaffOnly?: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [identitySearch, setIdentitySearch] = useState("");
  const [debouncedIdentitySearch, setDebouncedIdentitySearch] = useState("");
  const [canonicalSearch, setCanonicalSearch] = useState("");
  const [debouncedCanonicalSearch, setDebouncedCanonicalSearch] = useState("");
  const [researchStatus, setResearchStatus] = useState<"all" | SalesResearchStatus>("all");
  const [ownerUid, setOwnerUid] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const [previousCursors, setPreviousCursors] = useState<Array<string | undefined>>([]);
  const [opportunityStage, setOpportunityStage] = useState("");
  const [opportunityCursor, setOpportunityCursor] = useState<string | undefined>();
  const [opportunityPreviousCursors, setOpportunityPreviousCursors] =
    useState<Array<string | undefined>>([]);
  const [inboundCursor, setInboundCursor] = useState<string | undefined>();
  const [inboundPreviousCursors, setInboundPreviousCursors] =
    useState<Array<string | undefined>>([]);
  const [taskCursor, setTaskCursor] = useState<string | undefined>();
  const [taskPreviousCursors, setTaskPreviousCursors] =
    useState<Array<string | undefined>>([]);
  const pendingRequestIds = useRef(new Map<string, string>());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const timer = window.setTimeout(() =>
      setDebouncedIdentitySearch(identitySearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [identitySearch]);
  useEffect(() => {
    const timer = window.setTimeout(() =>
      setDebouncedCanonicalSearch(canonicalSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [canonicalSearch]);
  useEffect(() => {
  }, [selectedOrganizerId]);

  const listInput = useMemo<SalesListAccountsInput>(() => ({
    limit: 25, cursor,
    query: debouncedQuery || undefined,
    ownerUid: ownerUid.trim() || undefined,
    researchStatus: researchStatus === "all" ? undefined : researchStatus,
  }), [cursor, debouncedQuery, ownerUid, researchStatus]);
  const validAccountQuery = !debouncedQuery || isSalesSearchWord(debouncedQuery);

  const accounts = useQuery({
    enabled: !selectedOrganizerId &&
      (area === "hosts" || (!assignedStaffOnly && area === "research")) &&
      validAccountQuery,
    queryKey: ["sales", "accounts", listInput],
    queryFn: () => listSalesAccounts(listInput),
  });
  const identityMatches = useQuery({
    enabled: !assignedStaffOnly && area === "research" &&
      isSalesSearchWord(debouncedIdentitySearch),
    queryKey: ["sales", "identity-matches", debouncedIdentitySearch],
    queryFn: () => listSalesAccounts({limit: 25, query: debouncedIdentitySearch}),
  });
  const canonicalMatches = useQuery({
    enabled: !assignedStaffOnly && area === "hosts" &&
      debouncedCanonicalSearch.length >= 2,
    queryKey: ["sales", "canonical-matches", debouncedCanonicalSearch],
    queryFn: () => searchCanonicalOrganizers(debouncedCanonicalSearch),
  });
  const tasks = useQuery({
    enabled: area === "today" && !selectedOrganizerId,
    queryKey: ["sales", "tasks", "open", taskCursor],
    queryFn: () => listSalesTasks({limit: 50, cursor: taskCursor, status: "open"}),
  });
  const opportunities = useQuery({
    enabled: !selectedOrganizerId &&
      (area === "pipeline" || (!assignedStaffOnly && area === "pilots")),
    queryKey: ["sales", "opportunities", opportunityStage, opportunityCursor],
    queryFn: () => listSalesOpportunities({
      limit: 25, cursor: opportunityCursor,
      stage: opportunityStage || undefined,
    }),
  });
  const inboundIntents = useQuery({
    enabled: !assignedStaffOnly && area === "research" && !selectedOrganizerId,
    queryKey: ["sales", "inbound", inboundCursor],
    queryFn: () => listSalesInboundIntents({
      limit: 25, cursor: inboundCursor, status: "needs_identity_review",
    }),
  });
  const customFields = useQuery({
    enabled: !assignedStaffOnly &&
      (area === "settings" || Boolean(selectedOrganizerId)),
    queryKey: ["sales", "custom-fields"],
    queryFn: listSalesCustomFields,
  });
  const detail = useQuery({
    enabled: Boolean(selectedOrganizerId),
    queryKey: ["sales", "account", selectedOrganizerId],
    queryFn: () => getSalesAccount(selectedOrganizerId!),
  });
  const contacts = useQuery({
    enabled: Boolean(selectedOrganizerId),
    queryKey: ["sales", "contacts", selectedOrganizerId],
    queryFn: () => listSalesContacts(selectedOrganizerId!),
  });
  const evidence = useQuery({
    enabled: Boolean(selectedOrganizerId),
    queryKey: ["sales", "evidence", selectedOrganizerId],
    queryFn: () => listSalesEvidence(selectedOrganizerId!),
  });

  const accountMutation = useMutation({mutationFn: updateSalesAccount});
  const createAccountMutation = useMutation({mutationFn: createSalesAccount});
  const nominationMutation = useMutation({mutationFn: nominateSalesOrganizer});
  const taskMutation = useMutation({mutationFn: upsertSalesTask});
  const activityMutation = useMutation({mutationFn: recordSalesActivity});
  const opportunityMutation = useMutation({mutationFn: upsertSalesOpportunity});
  const inboundLinkMutation = useMutation({mutationFn: linkSalesInboundIntent});
  const createCustomFieldMutation = useMutation({mutationFn: createSalesCustomField});
  const setCustomValueMutation = useMutation({mutationFn: setSalesCustomFieldValue});
  const importPreviewMutation = useMutation({mutationFn: previewSalesImport});
  const importApplyMutation = useMutation({mutationFn: applySalesImport});
  const compensationPreviewMutation = useMutation({
    mutationFn: previewSalesImportCompensation});
  const compensationApplyMutation = useMutation({
    mutationFn: applySalesImportCompensation});

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey: ["sales", "accounts"]}),
      queryClient.invalidateQueries({queryKey: ["sales", "tasks"]}),
      queryClient.invalidateQueries({queryKey: ["sales", "opportunities"]}),
      queryClient.invalidateQueries({queryKey: ["sales", "inbound"]}),
      queryClient.invalidateQueries({queryKey: ["sales", "custom-fields"]}),
      queryClient.invalidateQueries({queryKey: ["sales", "account"]}),
      queryClient.invalidateQueries({queryKey: ["sales", "contacts"]}),
      queryClient.invalidateQueries({queryKey: ["sales", "evidence"]}),
      queryClient.invalidateQueries({queryKey: ["sales", "evidence-proposals"]}),
    ]);
  }, [queryClient]);

  const execute = useCallback(async <T,>(
    action: string,
    material: unknown,
    invoke: (requestId: string) => Promise<T>,
    success: string
  ): Promise<boolean> => {
    const token = beginOperation();
    if (!token) return false;
    const key = `${action}:${JSON.stringify(material)}`;
    const requestId = pendingRequestIds.current.get(key) ?? crypto.randomUUID();
    pendingRequestIds.current.set(key, requestId);
    onError(null);
    try {
      await invoke(requestId);
      pendingRequestIds.current.delete(key);
      onNotice(success);
      try {
        await invalidate();
      } catch {
        onError("The change was saved, but the latest view could not be loaded. Refresh before editing again.");
      }
      return true;
    } catch (error) {
      onError(salesErrorMessage(error));
      if (/aborted|revision mismatch|record changed since review/iu.test(
        error instanceof Error ? error.message : String(error)
      ) && selectedOrganizerId) {
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["sales", "account", selectedOrganizerId],
          }),
          queryClient.invalidateQueries({
            queryKey: ["sales", "contacts", selectedOrganizerId],
          }),
          queryClient.invalidateQueries({
            queryKey: ["sales", "evidence", selectedOrganizerId],
          }),
        ]);
      }
      return false;
    } finally {
      endOperation(token);
    }
  }, [beginOperation, endOperation, invalidate, onError, onNotice,
    queryClient, selectedOrganizerId]);

  const saveAccount = useCallback((
    input: Omit<SalesUpdateAccountInput, "requestId">
  ) => execute("account", input, (requestId) =>
    accountMutation.mutateAsync({...input, requestId}), "Host research saved."),
  [accountMutation, execute]);

  const addAccount = useCallback((
    input: Omit<SalesCreateAccountInput, "requestId">
  ) => execute("account-create", input, (requestId) =>
    createAccountMutation.mutateAsync({...input, requestId}),
  "Host added to Sales."), [createAccountMutation, execute]);

  const nominateOrganizer = useCallback((
    input: Omit<SalesNominateOrganizerInput, "requestId">
  ) => execute("nomination", input, (requestId) =>
    nominationMutation.mutateAsync({...input, requestId}),
  "Nomination queued. Its listing appears in the Inbox for review."),
  [execute, nominationMutation]);

  const saveTask = useCallback((
    input: Omit<SalesUpsertTaskInput, "requestId">
  ) => execute("task", input, (requestId) =>
    taskMutation.mutateAsync({...input, requestId}), "Task saved."),
  [execute, taskMutation]);

  const logActivity = useCallback((
    input: Omit<SalesRecordActivityInput, "requestId">
  ) => execute("activity", input, (requestId) =>
    activityMutation.mutateAsync({...input, requestId}), "Activity recorded."),
  [activityMutation, execute]);

  const saveOpportunity = useCallback((
    input: Omit<SalesUpsertOpportunityInput, "requestId">
  ) => execute("opportunity", input, (requestId) =>
    opportunityMutation.mutateAsync({...input, requestId}), "Opportunity saved."),
  [execute, opportunityMutation]);

  const linkInboundIntent = useCallback((
    input: Omit<SalesLinkInboundIntentInput, "requestId">
  ) => execute("inbound-link", input, (requestId) =>
    inboundLinkMutation.mutateAsync({...input, requestId}),
  "Enquiry linked to the host for review."), [execute, inboundLinkMutation]);

  const addCustomField = useCallback((
    input: Omit<SalesCreateCustomFieldInput, "requestId">
  ) => execute("custom-field", input, (requestId) =>
    createCustomFieldMutation.mutateAsync({...input, requestId}),
  "Field added."), [createCustomFieldMutation, execute]);

  const saveCustomValue = useCallback((
    input: Omit<SalesSetCustomFieldValueInput, "requestId">
  ) => execute("custom-value", input, (requestId) =>
    setCustomValueMutation.mutateAsync({...input, requestId}),
  "Field value saved."), [execute, setCustomValueMutation]);

  const previewImport = useCallback(async (packet: SalesImportPacket):
    Promise<SalesImportPreview | null> => {
    onError(null);
    try {return await importPreviewMutation.mutateAsync(packet);} catch (error) {
      onError(salesErrorMessage(error)); return null;
    }
  }, [importPreviewMutation, onError]);
  const applyImport = useCallback((packet: SalesImportPacket, previewHash: string) =>
    execute("import", {packet, previewHash}, (requestId) =>
      importApplyMutation.mutateAsync({...packet, previewHash, requestId}),
    "Reviewed import applied."), [execute, importApplyMutation]);
  const previewCompensation = useCallback(async (
    input: SalesImportCompensationInput
  ): Promise<SalesImportCompensationPreview | null> => {
    onError(null);
    try {
      return await compensationPreviewMutation.mutateAsync(input);
    } catch (error) {
      onError(salesErrorMessage(error));
      return null;
    }
  }, [compensationPreviewMutation, onError]);
  const applyCompensation = useCallback((
    input: SalesImportCompensationInput & {previewHash: string; reason: string}
  ) => execute("import-compensation", input, (requestId) =>
    compensationApplyMutation.mutateAsync({...input, requestId}),
  "Reviewed import correction recorded. Refresh the account before new work."),
  [execute, compensationApplyMutation]);

  const setAccountFilters = useCallback((next: {
    query?: string; researchStatus?: "all" | SalesResearchStatus; ownerUid?: string;
  }) => {
    if (next.query !== undefined) setQuery(next.query);
    if (next.researchStatus !== undefined) setResearchStatus(next.researchStatus);
    if (next.ownerUid !== undefined) setOwnerUid(next.ownerUid);
    setCursor(undefined);
    setPreviousCursors([]);
  }, []);

  const nextPage = useCallback(() => {
    if (!accounts.data?.nextCursor) return;
    setPreviousCursors((previous) => [...previous, cursor]);
    setCursor(accounts.data.nextCursor);
  }, [accounts.data?.nextCursor, cursor]);

  const previousPage = useCallback(() => {
    const previous = previousCursors.at(-1);
    setCursor(previous);
    setPreviousCursors((stack) => stack.slice(0, -1));
  }, [previousCursors]);

  const setStageFilter = useCallback((stage: string) => {
    setOpportunityStage(stage);
    setOpportunityCursor(undefined);
    setOpportunityPreviousCursors([]);
  }, []);

  const nextOpportunityPage = useCallback(() => {
    if (!opportunities.data?.nextCursor) return;
    setOpportunityPreviousCursors((previous) => [...previous, opportunityCursor]);
    setOpportunityCursor(opportunities.data.nextCursor);
  }, [opportunities.data?.nextCursor, opportunityCursor]);

  const previousOpportunityPage = useCallback(() => {
    setOpportunityCursor(opportunityPreviousCursors.at(-1));
    setOpportunityPreviousCursors((stack) => stack.slice(0, -1));
  }, [opportunityPreviousCursors]);

  const nextInboundPage = useCallback(() => {
    if (!inboundIntents.data?.nextCursor) return;
    setInboundPreviousCursors((previous) => [...previous, inboundCursor]);
    setInboundCursor(inboundIntents.data.nextCursor);
  }, [inboundIntents.data?.nextCursor, inboundCursor]);
  const previousInboundPage = useCallback(() => {
    setInboundCursor(inboundPreviousCursors.at(-1));
    setInboundPreviousCursors((stack) => stack.slice(0, -1));
  }, [inboundPreviousCursors]);

  const nextTaskPage = useCallback(() => {
    if (!tasks.data?.nextCursor) return;
    setTaskPreviousCursors((previous) => [...previous, taskCursor]);
    setTaskCursor(tasks.data.nextCursor);
  }, [taskCursor, tasks.data?.nextCursor]);
  const previousTaskPage = useCallback(() => {
    setTaskCursor(taskPreviousCursors.at(-1));
    setTaskPreviousCursors((stack) => stack.slice(0, -1));
  }, [taskPreviousCursors]);


  return {
    accounts, tasks, opportunities, inboundIntents, identityMatches,
    canonicalMatches, canonicalSearch, setCanonicalSearch,
    customFields,
    contacts, evidence,
    identitySearch, setIdentitySearch, detail, query,
    researchStatus, ownerUid, validAccountQuery,
    opportunityStage, setStageFilter, nextOpportunityPage, previousOpportunityPage,
    hasPreviousOpportunityPage: opportunityPreviousCursors.length > 0,
    nextInboundPage, previousInboundPage,
    hasPreviousInboundPage: inboundPreviousCursors.length > 0,
    nextTaskPage, previousTaskPage,
    hasPreviousTaskPage: taskPreviousCursors.length > 0,
    setAccountFilters, nextPage, previousPage,
    hasPreviousPage: previousCursors.length > 0,
    saveAccount, addAccount, nominateOrganizer, saveTask, logActivity,
    saveOpportunity, linkInboundIntent,
    addCustomField, saveCustomValue,
    previewImport, applyImport, importPreviewPending: importPreviewMutation.isPending,
    previewCompensation, applyCompensation,
    compensationPreviewPending: compensationPreviewMutation.isPending,
    isSaving: accountMutation.isPending || createAccountMutation.isPending ||
      nominationMutation.isPending || taskMutation.isPending ||
      activityMutation.isPending || opportunityMutation.isPending ||
      inboundLinkMutation.isPending || createCustomFieldMutation.isPending ||
      setCustomValueMutation.isPending || importApplyMutation.isPending ||
      compensationApplyMutation.isPending,
  };
}

export type SalesWorkspaceController = ReturnType<typeof useSalesWorkspaceController>;

export function accountFormValues(account: SalesAccount) {
  return {
    researchStatus: account.researchStatus,
    assignedOwnerUid: account.assignedOwnerUid ?? "",
    summary: account.summary ?? "",
    nextAction: account.nextAction ?? "",
  };
}
