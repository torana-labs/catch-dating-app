import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback} from "react";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {useAdminPendingOperationGuard} from
  "../../../shared/pendingOperation";
import {
  loadSafetySettings,
  saveSafetySettings,
  type SafetySettingsSnapshot,
  type SafetySettingsUpdate,
} from "../api/accountSafetyRepository";

export interface SafetySettingsController {
  snapshot: SafetySettingsSnapshot | null;
  loadState: "loading" | "error" | "ready";
  isSaving: boolean;
  canEdit: boolean;
  save: (update: SafetySettingsUpdate) => Promise<boolean>;
}

/**
 * Settings → Safety (board AdminSettingsSafety): the steps and who may take
 * them, the rules, the deadlines and the report reasons. Only the owner
 * edits; ops read.
 */
export function useSafetySettingsController({
  canEdit,
  onError,
  onNotice,
}: {
  canEdit: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}): SafetySettingsController {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const query = useQuery({
    queryKey: adminQueryKeys.safety.settings(),
    queryFn: loadSafetySettings,
  });
  const mutation = useMutation({mutationFn: saveSafetySettings});
  const save = useCallback(async (update: SafetySettingsUpdate) => {
    if (!canEdit) {
      onError("Only the owner can change safety settings.");
      return false;
    }
    const codes = update.reasons.map((reason) => reason.code);
    if (new Set(codes).size !== codes.length) {
      onError("Each reason needs its own code.");
      return false;
    }
    if (!update.reasons.some((reason) => reason.active)) {
      onError("Keep at least one reason people can choose.");
      return false;
    }
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const next = await mutation.mutateAsync(update);
      queryClient.setQueryData(adminQueryKeys.safety.settings(), next);
      onError(null);
      onNotice("Safety settings saved.");
      return true;
    } catch (error) {
      onError(error instanceof Error && error.message ? error.message :
        "Unable to save safety settings.");
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, canEdit, endOperation, mutation, onError, onNotice,
    queryClient]);
  return {
    snapshot: query.data ?? null,
    loadState: query.isPending ? "loading" : query.isError ? "error" :
      "ready",
    isSaving: mutation.isPending,
    canEdit,
    save,
  };
}
