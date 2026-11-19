import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import {
  getTakedownRequest,
  updateTakedownRequest,
  type TakedownDeclineReason,
  type TakedownInfoTemplate,
  type TakedownOutcome,
  type TakedownStep,
} from "../api/takedownRepository";
import {takedownStepNotices} from "./takedownLabels";

const caseIdPattern = /^TD-[0-9]{4,6}$/u;

/**
 * One listing request in the Admin Inbox: its detail and the fixed steps on
 * it. Each step needs only its own fixed choice (a template, an outcome and
 * case id, a reason or an appeal decision) and an optional note.
 */
export function useTakedownRequestController({requestId, onError, onNotice, onChanged}: {
  requestId: string;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
  /** Refreshes the inbox item after a step. */
  onChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const key = ["takedownRequest", requestId] as const;
  const detail = useQuery({queryKey: key, queryFn: () => getTakedownRequest(requestId)});
  const [infoTemplate, setInfoTemplate] = useState<TakedownInfoTemplate | null>(null);
  const [outcome, setOutcome] = useState<TakedownOutcome | null>(null);
  const [caseId, setCaseId] = useState("");
  const [declineReason, setDeclineReason] = useState<TakedownDeclineReason | null>(null);
  const [note, setNote] = useState("");
  const step = useMutation({
    mutationFn: (input: TakedownStep) => updateTakedownRequest(input),
    onSuccess: async (_request, input) => {
      onError(null);
      onNotice(takedownStepNotices[input.action]);
      setNote("");
      await queryClient.invalidateQueries({queryKey: key});
      onChanged?.();
    },
    onError: (error) => onError(error instanceof Error ? error.message : "That step did not save. Try again."),
  });

  const caseNeeded = outcome !== null && (detail.data?.caseOutcomes ?? []).includes(outcome);
  const caseIdValid = caseIdPattern.test(caseId.trim());
  const run = (input: Omit<TakedownStep, "requestId" | "note">) =>
    step.mutate({requestId, ...input, ...(note.trim() ? {note: note.trim().slice(0, 500)} : {})});

  return {
    detail: detail.data ?? null,
    loading: detail.isPending,
    failed: detail.isError,
    busy: step.isPending,
    infoTemplate, setInfoTemplate,
    outcome, setOutcome,
    caseId, setCaseId,
    caseNeeded,
    caseIdError: caseNeeded && caseId.trim() && !caseIdValid ? "Use the takedown case id, such as TD-0001." : null,
    declineReason, setDeclineReason,
    note, setNote,
    acknowledge: () => run({action: "acknowledge"}),
    requestInfo: infoTemplate ? () => run({action: "requestInfo", infoTemplate}) : null,
    action: outcome && (!caseNeeded || caseIdValid) ?
      () => run({action: "action", outcome, ...(caseNeeded || caseIdValid ? {caseId: caseId.trim()} : {})}) : null,
    decline: declineReason ? () => run({action: "decline", declineReason}) : null,
    recordAppeal: () => run({action: "recordAppeal"}),
    decideAppeal: (appealDecision: "upheld" | "overturned") => run({action: "decideAppeal", appealDecision}),
    close: () => run({action: "close"}),
    /** One click takes the named organiser's page down; null when this caller or request cannot. */
    suspendOrganizer: detail.data?.canSuspendOrganizer ? () => run({action: "suspendOrganizer"}) : null,
  };
}

export type TakedownRequestController = ReturnType<typeof useTakedownRequestController>;
