import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useMemo, useState} from "react";
import {
  actOnBill,
  loadBills,
  type Bill,
  type BillAction,
  type BillsMonth,
} from "../api/moneyRepository";

/** Where a bill is, as the Bills view filters it. */
export type BillFilter = "all" | "toSend" | "sent" | "overdue" | "paid" |
  "free";

export interface BillsController {
  month: string | null;
  data: BillsMonth | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  filter: BillFilter;
  search: string;
  rows: Bill[];
  selected: Bill | null;
  isActing: boolean;
  actionError: string | null;
  setFilter: (filter: BillFilter) => void;
  setSearch: (text: string) => void;
  select: (billId: string) => void;
  act: (action: BillAction, note: string | null) => Promise<boolean>;
  generate: () => Promise<boolean>;
}

const key = (month: string | null) =>
  ["admin", "money", "bills", month ?? "last"] as const;

/**
 * True when a sent bill is past its due date.
 * @param {Bill} bill Bill.
 * @param {number} nowMillis Now.
 * @return {boolean} Overdue.
 */
export function isOverdue(bill: Bill, nowMillis: number): boolean {
  return bill.status === "sent" && bill.dueAtMillis !== null &&
    bill.dueAtMillis < nowMillis;
}

/**
 * The Bills view: one month's bills, filtered and searched, one selected,
 * with the owner's actions on it.
 */
export function useBillsController({month = null, selectedBillId = null,
  onSelectBillId, now = Date.now}: {
  month?: string | null;
  selectedBillId?: string | null;
  onSelectBillId?: (billId: string) => void;
  now?: () => number;
} = {}): BillsController {
  const client = useQueryClient();
  const query = useQuery({queryKey: key(month),
    queryFn: () => loadBills(month)});
  const [filter, setFilter] = useState<BillFilter>("all");
  const [search, setSearch] = useState("");
  const [localSelection, setLocalSelection] = useState<string | null>(null);
  const chosen = selectedBillId ?? localSelection;
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const at = now();
    return (query.data?.bills ?? []).filter((bill) =>
      (filter === "all" || (filter === "overdue" ? isOverdue(bill, at) :
        bill.status === filter)) &&
      (!needle || bill.organizerName.toLowerCase().includes(needle) ||
        (bill.invoiceNumber ?? "").includes(needle)));
  }, [query.data, filter, search, now]);
  const selected = rows.find((bill) => bill.billId === chosen) ??
    (chosen ? null : rows[0] ?? null);
  const action = useMutation({
    mutationFn: (input: {bill: Bill; action: BillAction;
      note: string | null}) => actOnBill(input.bill, input.action, input.note),
    onSuccess: (data) => client.setQueryData(key(month), data),
  });
  const generation = useMutation({
    mutationFn: () => loadBills(month, true),
    onSuccess: (data) => client.setQueryData(key(month), data),
  });
  return {
    month, data: query.data ?? null,
    loadState: query.isPending ? "loading" : query.isError ? "error" : "ready",
    loadError: query.error instanceof Error ? query.error.message : null,
    filter, search, rows, selected,
    isActing: action.isPending || generation.isPending,
    actionError: (action.error ?? generation.error) instanceof Error ?
      ((action.error ?? generation.error) as Error).message : null,
    setFilter, setSearch,
    select: (billId) => {
      setLocalSelection(billId);
      onSelectBillId?.(billId);
    },
    act: async (kind, note) => {
      if (!selected) return false;
      try {
        await action.mutateAsync({bill: selected, action: kind, note});
        return true;
      } catch {
        return false;
      }
    },
    generate: async () => {
      try {
        await generation.mutateAsync();
        return true;
      } catch {
        return false;
      }
    },
  };
}
