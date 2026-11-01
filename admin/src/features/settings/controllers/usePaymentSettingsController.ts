import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {
  loadMoneySettings,
  saveMoneySettings,
  type MoneySettings,
  type MoneySettingsState,
} from "../api/paymentSettingsRepository";

export interface PaymentSettingsController {
  state: MoneySettingsState | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  isSaving: boolean;
  saveError: string | null;
  /** Saves a change against the revision on screen. */
  save: (change: (settings: MoneySettings) => MoneySettings) =>
    Promise<boolean>;
}

const key = ["admin", "settings", "money"] as const;

/** Settings → Payments' GST switch, bill due day and nominator credit. */
export function usePaymentSettingsController(): PaymentSettingsController {
  const client = useQueryClient();
  const query = useQuery({queryKey: key, queryFn: loadMoneySettings});
  const mutation = useMutation({
    mutationFn: (input: {revision: number; settings: MoneySettings}) =>
      saveMoneySettings(input.revision, input.settings),
    onSuccess: (data) => client.setQueryData(key, data),
  });
  return {
    state: query.data ?? null,
    loadState: query.isPending ? "loading" : query.isError ? "error" : "ready",
    loadError: query.error instanceof Error ? query.error.message : null,
    isSaving: mutation.isPending,
    saveError: mutation.error instanceof Error ? mutation.error.message : null,
    save: async (change) => {
      if (!query.data) return false;
      try {
        await mutation.mutateAsync({revision: query.data.revision,
          settings: change(query.data.settings)});
        return true;
      } catch {
        return false;
      }
    },
  };
}
