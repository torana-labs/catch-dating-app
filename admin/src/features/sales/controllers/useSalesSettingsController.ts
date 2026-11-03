import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {
  applySalesImport, applySalesImportCompensation, createSalesCustomField, listSalesCustomFields, listSalesImports,
  searchCanonicalOrganizers,
} from "../api/salesRepository";
import type {
  SalesCreateCustomFieldInput, SalesImportCompensationInput, SalesImportPacket,
} from "../api/salesTypes";
import {salesErrorMessage} from "./salesLabels";
import {salesImportGroups} from "./salesImports";

/** Settings → Sales: private host fields, the imports applied so far, and the owner's privacy search. */
export function useSalesSettingsController({canCorrect, onError, onNotice}: {
  canCorrect: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const pendingRequestIds = useRef(new Map<string, string>());
  const [privacyText, setPrivacyText] = useState("");
  const [privacyQuery, setPrivacyQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setPrivacyQuery(privacyText.trim()), 300);
    return () => clearTimeout(timer);
  }, [privacyText]);

  const customFields = useQuery({queryKey: ["sales", "custom-fields"], queryFn: listSalesCustomFields});
  const imports = useInfiniteQuery({
    queryKey: ["sales", "imports"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({pageParam}) => listSalesImports(pageParam ? {cursor: pageParam} : {}),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const privacyMatches = useQuery({
    enabled: canCorrect && privacyQuery.length >= 2,
    queryKey: ["sales", "privacy-search", privacyQuery],
    queryFn: () => searchCanonicalOrganizers(privacyQuery),
    retry: false,
  });
  const createField = useMutation({mutationFn: createSalesCustomField});
  const applyBatch = useMutation({mutationFn: applySalesImport});
  const applyFix = useMutation({mutationFn: applySalesImportCompensation});

  const execute = useCallback(async (action: string, material: unknown,
    invoke: (requestId: string) => Promise<unknown>, success: string): Promise<boolean> => {
    const token = beginOperation();
    if (!token) return false;
    // A failed attempt may have committed remotely, so the same material keeps its request ID.
    const key = `${action}:${JSON.stringify(material)}`;
    const requestId = pendingRequestIds.current.get(key) ?? crypto.randomUUID();
    pendingRequestIds.current.set(key, requestId);
    onError(null);
    try {
      await invoke(requestId);
      pendingRequestIds.current.delete(key);
      onNotice(success);
      await queryClient.invalidateQueries({queryKey: ["sales"]});
      return true;
    } catch (error) {
      onError(salesErrorMessage(error));
      return false;
    } finally {
      endOperation(token);
    }
  }, [beginOperation, endOperation, onError, onNotice, queryClient]);

  const addField = useCallback((input: Omit<SalesCreateCustomFieldInput, "requestId">) =>
    execute("field", input, (requestId) => createField.mutateAsync({...input, requestId}), "Field added."),
  [createField, execute]);
  const applyImport = useCallback((packet: SalesImportPacket, previewHash: string) =>
    execute("import", {packet, previewHash}, (requestId) =>
      applyBatch.mutateAsync({...packet, previewHash, requestId}), "Batch applied."),
  [applyBatch, execute]);
  const applyCorrection = useCallback((
    input: SalesImportCompensationInput & {previewHash: string; reason: string},
  ) => execute("correction", input, (requestId) => applyFix.mutateAsync({...input, requestId}),
    "Correction recorded. Refresh the host before new work."), [applyFix, execute]);

  const groups = useMemo(() => salesImportGroups(imports.data?.pages.flatMap((page) => page.rows) ?? []), [imports.data]);

  return {
    customFields, imports, groups,
    privacyText, setPrivacyText, privacyQuery, privacyMatches,
    addField, applyImport, applyCorrection,
    isSaving: createField.isPending || applyBatch.isPending || applyFix.isPending,
  };
}

export type SalesSettingsController = ReturnType<typeof useSalesSettingsController>;
