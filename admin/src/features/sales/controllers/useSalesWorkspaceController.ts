import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {salesErrorMessage} from "./salesLabels";
import {useCallback, useRef} from "react";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {
  createSalesCustomField, getSalesAccount,
  listSalesCustomFields,
  recordSalesActivity, setSalesCustomFieldValue,
  updateSalesAccount,
  upsertSalesOpportunity, upsertSalesTask,
  applySalesImport, listSalesContacts,
  applySalesImportCompensation, previewSalesImportCompensation,
  previewSalesImport,
} from "../api/salesRepository";
import type {
  SalesAccount, SalesCreateCustomFieldInput,
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

export function toLocalDateTimeInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function useSalesWorkspaceController({
  area,
  selectedOrganizerId,
  assignedStaffOnly = false,
  onError,
  onNotice,
}: {
  area: "hosts" | "settings";
  selectedOrganizerId: string | null;
  assignedStaffOnly?: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const pendingRequestIds = useRef(new Map<string, string>());

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

  const accountMutation = useMutation({mutationFn: updateSalesAccount});
  const taskMutation = useMutation({mutationFn: upsertSalesTask});
  const activityMutation = useMutation({mutationFn: recordSalesActivity});
  const opportunityMutation = useMutation({mutationFn: upsertSalesOpportunity});
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

  return {
    customFields,
    contacts,
    detail,
    saveAccount, saveTask, logActivity,
    saveOpportunity,
    addCustomField, saveCustomValue,
    previewImport, applyImport, importPreviewPending: importPreviewMutation.isPending,
    previewCompensation, applyCompensation,
    compensationPreviewPending: compensationPreviewMutation.isPending,
    isSaving: accountMutation.isPending || taskMutation.isPending ||
      activityMutation.isPending || opportunityMutation.isPending ||
      createCustomFieldMutation.isPending ||
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
