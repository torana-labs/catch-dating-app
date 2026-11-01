import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useMemo, useState} from "react";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {useAdminPendingOperationGuard} from
  "../../../shared/pendingOperation";
import {
  decideAppeal,
  liftAccountAction,
  loadAccountActions,
  takeAccountAction,
  type AccountAction,
  type AccountActionKind,
  type AccountActionView,
  type AppealDecision,
  type TakeAccountAction,
} from "../api/accountSafetyRepository";

export type AccountKindFilter = AccountActionKind | "all";

export interface AccountSafetyController {
  view: AccountActionView;
  kind: AccountKindFilter;
  items: AccountAction[];
  counts: Record<AccountKindFilter, number>;
  selected: AccountAction | null;
  loadState: "loading" | "error" | "ready";
  isMutating: boolean;
  setView: (view: AccountActionView) => void;
  setKind: (kind: AccountKindFilter) => void;
  select: (actionId: string | null) => void;
  take: (payload: TakeAccountAction) => Promise<boolean>;
  lift: (actionId: string, note: string) => Promise<boolean>;
  decide: (payload: AppealDecision) => Promise<boolean>;
  refresh: () => void;
}

const kinds: AccountKindFilter[] = ["all", "warn", "restrict", "suspend",
  "ban"];

/**
 * Safety → Account actions and Appeals (board AdminSafetyActions): the
 * actions in force or waiting on an appeal, a kind filter, the selected
 * action, and the take, lift and appeal decisions.
 */
export function useAccountSafetyController({
  onError,
  onNotice,
  uid = null,
}: {
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  uid?: string | null;
}): AccountSafetyController {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [view, setViewState] = useState<AccountActionView>("active");
  const [kind, setKind] = useState<AccountKindFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: adminQueryKeys.safety.actions(view, uid),
    queryFn: () => loadAccountActions({view, uid, limit: 200}),
  });
  const takeMutation = useMutation({mutationFn: takeAccountAction});
  const liftMutation = useMutation({mutationFn: liftAccountAction});
  const decideMutation = useMutation({mutationFn: decideAppeal});
  const all = useMemo(() => query.data?.items ?? [], [query.data]);
  const counts = useMemo(() => Object.fromEntries(kinds.map((item) => [item,
    item === "all" ? all.length :
      all.filter((action) => action.kind === item).length])) as Record<
    AccountKindFilter, number>, [all]);
  const items = useMemo(() => kind === "all" ? all :
    all.filter((action) => action.kind === kind), [all, kind]);
  const selected = items.find((item) => item.actionId === selectedId) ??
    items[0] ?? null;

  const run = useCallback(async (
    work: () => Promise<unknown>,
    notice: string,
    failure: string
  ): Promise<boolean> => {
    const operation = beginOperation();
    if (!operation) return false;
    try {
      await work();
      await queryClient.invalidateQueries({
        queryKey: [...adminQueryKeys.all, "safety"],
      });
      onError(null);
      onNotice(notice);
      return true;
    } catch (error) {
      onError(error instanceof Error && error.message ? error.message :
        failure);
      return false;
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, endOperation, onError, onNotice, queryClient]);

  const take = useCallback((payload: TakeAccountAction) => run(
    () => takeMutation.mutateAsync(payload),
    "Account action taken.", "Unable to act on this account."),
  [run, takeMutation]);
  const lift = useCallback((actionId: string, note: string) => run(
    () => liftMutation.mutateAsync({actionId, note}),
    "Account action lifted.", "Unable to lift this action."),
  [liftMutation, run]);
  const decide = useCallback((payload: AppealDecision) => run(
    () => decideMutation.mutateAsync(payload),
    "Appeal decided.", "Unable to decide this appeal."),
  [decideMutation, run]);

  return {
    view,
    kind,
    items,
    counts,
    selected,
    loadState: query.isPending ? "loading" : query.isError ? "error" :
      "ready",
    isMutating: takeMutation.isPending || liftMutation.isPending ||
      decideMutation.isPending,
    setView: useCallback((next: AccountActionView) => {
      setViewState(next);
      setSelectedId(null);
    }, []),
    setKind,
    select: setSelectedId,
    take,
    lift,
    decide,
    refresh: useCallback(() => {
      void query.refetch();
    }, [query]),
  };
}
