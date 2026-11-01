import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useState} from "react";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  loadAppPaymentRouting,
  replaceAppPaymentRouting,
} from "../api/paymentRoutingRepository";
import {
  confirmationsSatisfied,
  draftFromPolicy,
  replacementFromDraft,
  requiredConfirmations,
  routingDiff,
  type PurposeDraft,
  type RoutingConfirmation,
  type RoutingDiffRow,
  type RoutingDraft,
  type RoutingPolicy,
  type RoutingPurpose,
  type RoutingReplacement,
} from "./paymentRoutingForm";

export interface PaymentRoutingEditor {
  /** The policy revision this edit started from. */
  base: RoutingPolicy;
  draft: RoutingDraft;
  preview: RoutingDiffRow[] | null;
  confirmations: RoutingConfirmation[];
  typed: Record<string, string>;
  error: string | null;
  unconfirmed: RoutingReplacement | null;
}

export interface PaymentRoutingController {
  canManage: boolean;
  policy: RoutingPolicy | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  editor: PaymentRoutingEditor | null;
  isSaving: boolean;
  confirmed: boolean;
  refresh: () => void;
  startEdit: () => void;
  cancelEdit: () => void;
  setPurpose: (purpose: RoutingPurpose, change: Partial<PurposeDraft>) => void;
  review: () => boolean;
  backToEdit: () => void;
  setTyped: (id: string, text: string) => void;
  save: () => Promise<boolean>;
}

export function usePaymentRoutingController({
  canManage,
  onError,
  onNotice,
}: {
  canManage: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}): PaymentRoutingController {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const policyQuery = useQuery({
    queryKey: adminQueryKeys.finance.paymentRouting(),
    queryFn: loadAppPaymentRouting,
    enabled: canManage,
    retry: false,
  });
  const saveMutation = useMutation({
    mutationKey: adminQueryKeys.finance.paymentRoutingReplace(),
    mutationFn: replaceAppPaymentRouting,
  });
  const [editor, setEditor] = useState<PaymentRoutingEditor | null>(null);
  const policy = policyQuery.data ?? null;

  const startEdit = useCallback(() => {
    if (!policy) return;
    setEditor({base: policy, draft: draftFromPolicy(policy), preview: null,
      confirmations: [], typed: {}, error: null, unconfirmed: null});
    onError(null);
  }, [onError, policy]);

  const setPurpose = useCallback((purpose: RoutingPurpose,
    change: Partial<PurposeDraft>) => {
    setEditor((current) => current && {...current, preview: null,
      confirmations: [], typed: {}, error: null,
      draft: {...current.draft, [purpose]: {...current.draft[purpose],
        ...change}}});
  }, []);

  const review = useCallback((): boolean => {
    if (!editor) return false;
    const rows = routingDiff(editor.base, editor.draft);
    if (!rows.some((row) => row.changed)) {
      setEditor({...editor, preview: null,
        error: "Nothing has changed from the saved routing."});
      return false;
    }
    setEditor({...editor, preview: rows, error: null, typed: {},
      confirmations: requiredConfirmations(editor.base, editor.draft)});
    return true;
  }, [editor]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!editor?.preview) return false;
    if (!confirmationsSatisfied(editor.confirmations, editor.typed)) {
      setEditor({...editor, error: "Type each confirmation exactly as shown."});
      return false;
    }
    const payload = editor.unconfirmed ??
      replacementFromDraft(editor.base, editor.draft);
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const result = await saveMutation.mutateAsync(payload);
      queryClient.setQueryData(adminQueryKeys.finance.paymentRouting(), result);
      setEditor(null);
      onError(null);
      onNotice(`Payment routing saved as revision ${result.revision}. ` +
        "New checkouts use it; payments already started keep their route.");
      return true;
    } catch (error) {
      const code = errorCode(error);
      if (code === "aborted") {
        const latest = await policyQuery.refetch();
        setEditor(latest.data ? {base: latest.data, draft: editor.draft,
          preview: null, confirmations: [], typed: {}, unconfirmed: null,
          error: "Someone changed payment routing while you were editing. " +
            "Review your change against the latest settings."} : null);
      } else if (isDefinitive(code) || (error instanceof Error &&
          error.name === "AdminCallableValidationError")) {
        setEditor({...editor, unconfirmed: null,
          error: error instanceof Error ? error.message :
            "Payment routing could not be saved."});
      } else {
        setEditor({...editor, unconfirmed: payload,
          error: "The save may not have reached Catch. Retry the same save; " +
            "it is applied once even if the first one arrived."});
      }
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, editor, endOperation, onError, onNotice, policyQuery,
    queryClient, saveMutation]);

  return {
    canManage,
    policy,
    loadState: !canManage ? "error" : policyQuery.isPending ? "loading" :
      policyQuery.isError ? "error" : "ready",
    loadError: !canManage ?
      "Payment routing is open to Finance and Admin Owner only." :
      policyQuery.isError ? (policyQuery.error instanceof Error ?
        policyQuery.error.message : "Payment routing could not be loaded.") :
        null,
    editor,
    isSaving: saveMutation.isPending,
    confirmed: editor ? confirmationsSatisfied(editor.confirmations,
      editor.typed) : false,
    refresh: () => void policyQuery.refetch(),
    startEdit,
    cancelEdit: () => setEditor(null),
    setPurpose,
    review,
    backToEdit: () => setEditor((current) => current && {...current,
      preview: null, confirmations: [], typed: {}, error: null}),
    setTyped: (id, text) => setEditor((current) => current && {...current,
      typed: {...current.typed, [id]: text}}),
    save,
  };
}

function errorCode(error: unknown): string | null {
  const code = (error as {code?: unknown} | null)?.code;
  return typeof code === "string" ? code.replace(/^functions\//u, "") : null;
}

function isDefinitive(code: string | null): boolean {
  return code !== null && ["invalid-argument", "permission-denied",
    "unauthenticated", "not-found", "failed-precondition",
    "resource-exhausted", "already-exists", "out-of-range"].includes(code);
}
