import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useMemo, useState} from "react";
import {
  actOnIssue,
  loadIssues,
  type IssuesView,
  type MoneyIssue,
} from "../api/moneyRepository";

export type IssueKindFilter = "all" | MoneyIssue["kind"];

export interface MoneyIssuesController {
  view: IssuesView["view"];
  data: IssuesView | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  kind: IssueKindFilter;
  search: string;
  rows: MoneyIssue[];
  selected: MoneyIssue | null;
  /** The issue after the selected one, named in the decision bar. */
  next: MoneyIssue | null;
  isActing: boolean;
  actionError: string | null;
  lastOutcome: IssuesView["outcome"];
  setView: (view: IssuesView["view"]) => void;
  setKind: (kind: IssueKindFilter) => void;
  setSearch: (text: string) => void;
  select: (issueId: string) => void;
  confirmBooking: (note: string | null) => Promise<boolean>;
  close: (note: string | null) => Promise<boolean>;
}

const key = (view: IssuesView["view"]) =>
  ["admin", "money", "issues", view] as const;

/** Money's issues queue: oldest first, one selected, with its decision. */
export function useMoneyIssuesController({view: routedView, selectedIssueId =
  null, onSelectIssueId}: {
  /** The view the address names; without it the controller keeps its own. */
  view?: IssuesView["view"];
  selectedIssueId?: string | null;
  onSelectIssueId?: (issueId: string) => void;
} = {}): MoneyIssuesController {
  const client = useQueryClient();
  const [localView, setView] = useState<IssuesView["view"]>("open");
  const view = routedView ?? localView;
  const [kind, setKind] = useState<IssueKindFilter>("all");
  const [search, setSearch] = useState("");
  const [localSelection, setLocalSelection] = useState<string | null>(null);
  const query = useQuery({queryKey: key(view),
    queryFn: () => loadIssues(view)});
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (query.data?.issues ?? []).filter((issue) =>
      (kind === "all" || issue.kind === kind) && (!needle ||
        `${issue.title} ${issue.subtitle} ${issue.organizerName ?? ""}`
          .toLowerCase().includes(needle)));
  }, [query.data, kind, search]);
  const chosen = selectedIssueId ?? localSelection;
  const index = rows.findIndex((issue) => issue.issueId === chosen);
  const selected = index >= 0 ? rows[index] : chosen ? null : rows[0] ?? null;
  const position = selected ? rows.indexOf(selected) : -1;
  const action = useMutation({
    mutationFn: (input: {issueId: string; action: "confirmBooking" | "close";
      note: string | null}) => actOnIssue(input.issueId, input.action,
      input.note),
    onSuccess: (data) => {
      client.setQueryData(key("open"), data);
      void client.invalidateQueries({queryKey: key("resolved")});
    },
  });
  const run = async (kindOfAction: "confirmBooking" | "close",
    note: string | null) => {
    if (!selected) return false;
    const following = rows[position + 1]?.issueId ?? null;
    try {
      await action.mutateAsync({issueId: selected.issueId,
        action: kindOfAction, note});
      if (following) {
        setLocalSelection(following);
        onSelectIssueId?.(following);
      }
      return true;
    } catch {
      return false;
    }
  };
  return {
    view, data: query.data ?? null,
    loadState: query.isPending ? "loading" : query.isError ? "error" : "ready",
    loadError: query.error instanceof Error ? query.error.message : null,
    kind, search, rows, selected,
    next: position >= 0 ? rows[position + 1] ?? null : null,
    isActing: action.isPending,
    actionError: action.error instanceof Error ? action.error.message : null,
    lastOutcome: action.data?.outcome ?? null,
    setView, setKind, setSearch,
    select: (issueId) => {
      setLocalSelection(issueId);
      onSelectIssueId?.(issueId);
    },
    confirmBooking: (note) => run("confirmBooking", note),
    close: (note) => run("close", note),
  };
}
