import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useMemo, useState} from "react";
import {
  actOnNominatorCredit,
  loadGrowth,
  loadNominatorCredits,
  type Growth,
  type GrowthRange,
  type NominatorCredits,
  type NominatorRow,
} from "../api/growthRepository";

export type GrowthView = "cohorts" | "channels" | "nominators" | "best";
export type NominatorFilter = "all" | NominatorRow["role"];
export type BestFilter = "all" | "growing" | "quiet" | "ownTerms";

export interface GrowthController {
  view: GrowthView;
  range: GrowthRange;
  data: Growth | null;
  credits: NominatorCredits | null;
  loadState: "loading" | "error" | "ready";
  loadError: string | null;
  nominatorFilter: NominatorFilter;
  bestFilter: BestFilter;
  search: string;
  nominators: NominatorRow[];
  best: Growth["best"];
  selectedNominator: NominatorRow | null;
  /** Owed credit for the selected nominator and whether it can be paid. */
  selectedCredit: NominatorCredits["nominators"][number] | null;
  isActing: boolean;
  actionError: string | null;
  setView: (view: GrowthView) => void;
  setRange: (range: GrowthRange) => void;
  setNominatorFilter: (filter: NominatorFilter) => void;
  setBestFilter: (filter: BestFilter) => void;
  setSearch: (text: string) => void;
  selectNominator: (uid: string) => void;
  approveCredit: (note: string | null) => Promise<boolean>;
  markCreditPaid: (note: string | null) => Promise<boolean>;
}

const growthKey = (range: GrowthRange) =>
  ["admin", "growth", range] as const;
const creditsKey = ["admin", "growth", "credits"] as const;

/** Growth's four views over one range, with nominator credit approval. */
export function useGrowthController({initialView = "cohorts", view:
  routedView, selectedNominatorUid = null, onSelectNominatorUid}: {
  initialView?: GrowthView;
  /** The view the address names; without it the controller keeps its own. */
  view?: GrowthView;
  selectedNominatorUid?: string | null;
  onSelectNominatorUid?: (uid: string) => void;
} = {}): GrowthController {
  const client = useQueryClient();
  const [localView, setView] = useState<GrowthView>(initialView);
  const view = routedView ?? localView;
  const [range, setRange] = useState<GrowthRange>("12m");
  const [nominatorFilter, setNominatorFilter] =
    useState<NominatorFilter>("all");
  const [bestFilter, setBestFilter] = useState<BestFilter>("all");
  const [search, setSearch] = useState("");
  const [localSelection, setLocalSelection] = useState<string | null>(null);
  const growth = useQuery({queryKey: growthKey(range),
    queryFn: () => loadGrowth(range)});
  const credits = useQuery({queryKey: creditsKey,
    queryFn: loadNominatorCredits, enabled: view === "nominators"});
  const needle = search.trim().toLowerCase();
  const nominators = useMemo(() => (growth.data?.nominators ?? [])
    .filter((row) => (nominatorFilter === "all" ||
      row.role === nominatorFilter) &&
      (!needle || row.name.toLowerCase().includes(needle)))
    .sort((a, b) => b.creditOwedMinor - a.creditOwedMinor ||
      b.nominated - a.nominated),
  [growth.data, nominatorFilter, needle]);
  const best = useMemo(() => (growth.data?.best ?? []).filter((row) =>
    (bestFilter === "all" || (bestFilter === "growing" ?
      (row.trendPercent ?? 0) > 0 : bestFilter === "quiet" ?
        (row.trendPercent ?? 0) < 0 : row.ownTerms)) &&
    (!needle || row.name.toLowerCase().includes(needle))),
  [growth.data, bestFilter, needle]);
  const chosen = selectedNominatorUid ?? localSelection;
  const selectedNominator = nominators.find((row) => row.uid === chosen) ??
    (chosen ? null : nominators[0] ?? null);
  const action = useMutation({
    mutationFn: (input: {uid: string; action: "approve" | "markPaid";
      note: string | null}) => actOnNominatorCredit(input.uid, input.action,
      input.note),
    onSuccess: (data) => {
      client.setQueryData(creditsKey, data);
      void client.invalidateQueries({queryKey: ["admin", "growth"]});
    },
  });
  const run = async (kind: "approve" | "markPaid", note: string | null) => {
    if (!selectedNominator) return false;
    try {
      await action.mutateAsync({uid: selectedNominator.uid, action: kind,
        note});
      return true;
    } catch {
      return false;
    }
  };
  return {
    view, range, data: growth.data ?? null, credits: credits.data ?? null,
    loadState: growth.isPending ? "loading" : growth.isError ? "error" :
      "ready",
    loadError: growth.error instanceof Error ? growth.error.message : null,
    nominatorFilter, bestFilter, search, nominators, best, selectedNominator,
    selectedCredit: credits.data?.nominators.find((row) =>
      row.nominatorUid === selectedNominator?.uid) ?? null,
    isActing: action.isPending,
    actionError: action.error instanceof Error ? action.error.message : null,
    setView, setRange, setNominatorFilter, setBestFilter, setSearch,
    selectNominator: (uid) => {
      setLocalSelection(uid);
      onSelectNominatorUid?.(uid);
    },
    approveCredit: (note) => run("approve", note),
    markCreditPaid: (note) => run("markPaid", note),
  };
}
