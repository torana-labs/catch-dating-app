import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {
  exportLedger,
  loadFinanceMonth,
  setCost,
  type CostCategory,
  type FinanceMonth,
  type LedgerExport,
} from "../api/financeMonthRepository";

export interface FinanceMonthController {
  month: string;
  data: FinanceMonth | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  isSaving: boolean;
  isExporting: boolean;
  actionError: string | null;
  setMonth: (month: string) => void;
  /** Enters a cost by hand in rupees, or clears it with null. */
  saveCost: (category: CostCategory, rupees: number | null,
    note: string | null) => Promise<boolean>;
  /** Builds the month's ledger CSV for the accountant. */
  exportMonth: () => Promise<LedgerExport | null>;
}

const key = (month: string) => ["admin", "finance", "month", month] as const;

/** Finance for one month, with costs entered by hand and the export. */
export function useFinanceMonthController({initialMonth}: {
  initialMonth: string;
}): FinanceMonthController {
  const client = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [month, setMonth] = useState(initialMonth);
  const query = useQuery({queryKey: key(month),
    queryFn: () => loadFinanceMonth(month)});
  const save = useMutation({
    mutationFn: (input: {category: CostCategory; amountMinor: number | null;
      note: string | null}) => setCost(month, input.category,
      input.amountMinor, input.note),
    onSuccess: () => client.invalidateQueries({queryKey: key(month)}),
  });
  // lease-exempt: builds a CSV from the month's records and writes nothing.
  const ledger = useMutation({mutationFn: () => exportLedger(month)});
  const error = save.error ?? ledger.error;
  return {
    month, data: query.data ?? null,
    loadState: query.isPending ? "loading" : query.isError ? "error" : "ready",
    loadError: query.error instanceof Error ? query.error.message : null,
    isSaving: save.isPending, isExporting: ledger.isPending,
    actionError: error instanceof Error ? error.message : null,
    setMonth,
    saveCost: async (category, rupees, note) => {
      if (rupees !== null && (!Number.isFinite(rupees) || rupees < 0)) {
        return false;
      }
      const operation = beginOperation();
      if (!operation) return false;
      try {
        await save.mutateAsync({category, note, amountMinor: rupees === null ?
          null : Math.round(rupees * 100)});
        return true;
      } catch {
        return false;
      } finally {
        endOperation(operation);
      }
    },
    exportMonth: async () => {
      try {
        return await ledger.mutateAsync();
      } catch {
        return null;
      }
    },
  };
}
