import {useQuery} from "@tanstack/react-query";
import {useCallback, useState} from "react";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  findPeople,
  type PeopleSearchResult,
  type PersonRow,
} from "../api/peopleRepository";

export interface PeopleSearchController {
  draft: string;
  submitted: string;
  result: PeopleSearchResult | null;
  rows: PersonRow[];
  selected: PersonRow | null;
  loadState: "idle" | "loading" | "error" | "ready";
  setDraft: (value: string) => void;
  search: () => void;
  select: (uid: string | null) => void;
}

/**
 * People (board AdminPeople): search by name, phone or user id. A search
 * runs only when submitted, because the server logs each one with the
 * searcher's name.
 */
export function usePeopleSearchController(): PeopleSearchController {
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const query = useQuery({
    queryKey: adminQueryKeys.people.search(submitted),
    queryFn: () => findPeople(submitted),
    enabled: submitted.length > 0,
  });
  const rows = query.data?.rows ?? [];
  const search = useCallback(() => {
    const next = draft.trim().slice(0, 120);
    setSubmitted(next);
    setSelectedUid(null);
  }, [draft]);
  return {
    draft,
    submitted,
    result: query.data ?? null,
    rows,
    selected: rows.find((row) => row.uid === selectedUid) ?? rows[0] ?? null,
    loadState: !submitted ? "idle" : query.isPending ? "loading" :
      query.isError ? "error" : "ready",
    setDraft,
    search,
    select: setSelectedUid,
  };
}
