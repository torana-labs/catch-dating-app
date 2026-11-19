import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback} from "react";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {useAdminPendingOperationGuard} from
  "../../../shared/pendingOperation";
import {
  loadDiscoverySettings,
  saveDiscoverySettings,
  type DiscoverySettingsSnapshot,
  type DiscoverySettingsUpdate,
} from "../api/discoverySettingsRepository";

export const HOME_ORGANIZERS_MINIMUM_RANGE = {min: 1, max: 24} as const;

export interface DiscoverySettingsController {
  snapshot: DiscoverySettingsSnapshot | null;
  loadState: "loading" | "error" | "ready";
  isSaving: boolean;
  canEdit: boolean;
  save: (update: DiscoverySettingsUpdate) => Promise<boolean>;
}

/** Whether the homepage band minimum is a whole number the callable takes. */
export function validHomeOrganizersMinimum(value: number): boolean {
  return Number.isInteger(value) &&
    value >= HOME_ORGANIZERS_MINIMUM_RANGE.min &&
    value <= HOME_ORGANIZERS_MINIMUM_RANGE.max;
}

/** The editable rules of a stored or default settings record. */
export function discoveryRules(
  source: DiscoverySettingsUpdate
): DiscoverySettingsUpdate {
  const {surfaces} = source;
  return {
    surfaces: {
      homeOrganizers: {...surfaces.homeOrganizers},
      cityOrganizers: {...surfaces.cityOrganizers},
      plans: {...surfaces.plans},
      totals: {...surfaces.totals},
    },
    homeOrganizersMinimum: source.homeOrganizersMinimum,
    homeClaimAction: source.homeClaimAction,
  };
}

/** Whether two sets of rules say the same thing. */
export function sameDiscoveryRules(
  a: DiscoverySettingsUpdate,
  b: DiscoverySettingsUpdate
): boolean {
  return JSON.stringify(discoveryRules(a)) ===
    JSON.stringify(discoveryRules(b));
}

/**
 * Settings → Discovery: where organisers on Catch and organisers not on
 * Catch yet appear on the website, the homepage organisers band minimum and
 * the claim-your-page button. Only the owner edits; ops read.
 */
export function useDiscoverySettingsController({
  canEdit,
  onError,
  onNotice,
}: {
  canEdit: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}): DiscoverySettingsController {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const query = useQuery({
    queryKey: adminQueryKeys.discovery.settings(),
    queryFn: loadDiscoverySettings,
  });
  const mutation = useMutation({mutationFn: saveDiscoverySettings});
  const save = useCallback(async (update: DiscoverySettingsUpdate) => {
    if (!canEdit) {
      onError("Only the owner can change discovery settings.");
      return false;
    }
    if (!validHomeOrganizersMinimum(update.homeOrganizersMinimum)) {
      onError("Choose a number of organisers from 1 to 24.");
      return false;
    }
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const next = await mutation.mutateAsync(discoveryRules(update));
      queryClient.setQueryData(adminQueryKeys.discovery.settings(), next);
      onError(null);
      onNotice("Discovery settings saved.");
      return true;
    } catch (error) {
      onError(error instanceof Error && error.message ? error.message :
        "Unable to save discovery settings.");
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
