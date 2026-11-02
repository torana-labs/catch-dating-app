import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useState} from "react";
import {
  addSalesEvidence,
  getSalesAccount,
  listSalesAccounts,
  listSalesContacts,
  listSalesEvidence,
  listSalesEvidenceProposals,
  recordSalesActivity,
  reviewSalesEvidenceProposal,
  setSalesAccountSuppression,
  setSalesContactability,
  updateSalesAccount,
  upsertSalesContact,
  upsertSalesOpportunity,
  upsertSalesTask,
} from "../api/salesRepository";
import type {
  SalesContact,
  SalesContactInput,
  SalesEvidenceInput,
  SalesEvidenceProposal,
  SalesHoldStatus,
  SalesOpportunity,
  SalesRecordActivityInput,
  SalesResearchStatus,
  SalesTask,
} from "../api/salesTypes";

export type HostTab = "overview" | "conversations" | "deals" | "notes";

export type HostActivityInput = Pick<SalesRecordActivityInput, "type" | "note" | "channel" | "attestation">;
export type NextStepInput = Pick<SalesTask, "kind" | "title" | "dueAt" | "contactId">;
export interface HostEditInput {
  researchStatus: SalesResearchStatus;
  assignedOwnerUid: string | null;
  summary: string;
  nextAction: string;
}
export type PersonInput = Pick<SalesContactInput, "contact" | "relationship">;
export type EvidenceInput = Omit<SalesEvidenceInput, "organizerId" | "requestId">;
export type DealMoveInput = Pick<SalesOpportunity, "stage" | "nextStep" | "nextStepAt"> & {transitionReason?: string};

/**
 * Hosts: the accounts a sales associate works (or the team's), searchable,
 * and one host's page with four tabs: overview, conversations, deals, notes.
 * Its everyday work happens there: logging what happened, next steps, moving a deal, research evidence
 * and suggestions, contact reviews, and an account hold.
 */
export function useSalesHostsController({ownerUid, selectedOrganizerId, uid, onError, onNotice}: {
  ownerUid: string | null;
  selectedOrganizerId: string | null;
  /** Who a new next step or deal belongs to. */
  uid: string | null;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const [tab, setTab] = useState<HostTab>("overview");
  const cursor = cursors.at(-1);
  const hosts = useQuery({
    queryKey: ["sales", "hosts", ownerUid, query.trim(), cursor ?? null],
    queryFn: () => listSalesAccounts({limit: 25, ...(cursor ? {cursor} : {}), ...(ownerUid ? {ownerUid} : {}),
      ...(query.trim() ? {query: query.trim()} : {})}),
  });
  const host = useQuery({
    queryKey: ["sales", "account", selectedOrganizerId],
    queryFn: () => getSalesAccount(selectedOrganizerId as string),
    enabled: selectedOrganizerId !== null,
  });
  const contacts = useInfiniteQuery({
    queryKey: ["sales", "host-contacts", selectedOrganizerId],
    queryFn: ({pageParam}) => listSalesContacts(selectedOrganizerId as string, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: selectedOrganizerId !== null,
  });
  const evidence = useInfiniteQuery({
    queryKey: ["sales", "host-evidence", selectedOrganizerId],
    queryFn: ({pageParam}) => listSalesEvidence(selectedOrganizerId as string, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: selectedOrganizerId !== null,
  });
  const suggestions = useInfiniteQuery({
    queryKey: ["sales", "host-suggestions", selectedOrganizerId],
    queryFn: ({pageParam}) => listSalesEvidenceProposals(selectedOrganizerId as string, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: selectedOrganizerId !== null,
  });
  const logging = useMutation({mutationFn: recordSalesActivity});
  const savingTask = useMutation({mutationFn: upsertSalesTask});
  const savingDeal = useMutation({mutationFn: upsertSalesOpportunity});
  const savingHost = useMutation({mutationFn: updateSalesAccount});
  const savingPerson = useMutation({mutationFn: upsertSalesContact});
  const addingEvidence = useMutation({mutationFn: addSalesEvidence});
  const reviewing = useMutation({mutationFn: reviewSalesEvidenceProposal});
  const holding = useMutation({mutationFn: setSalesAccountSuppression});
  const reviewingContact = useMutation({mutationFn: setSalesContactability});

  const run = useCallback(async (action: () => Promise<unknown>, notice: string) => {
    onError(null);
    try {
      await action();
      onNotice(notice);
      await queryClient.invalidateQueries({queryKey: ["sales"]});
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [onError, onNotice, queryClient]);
  const organizerId = selectedOrganizerId as string;

  return {
    query,
    setQuery: (value: string) => { setQuery(value); setCursors([undefined]); },
    rows: hosts.data?.rows ?? [],
    isLoading: hosts.isLoading,
    error: hosts.error,
    hasNextPage: Boolean(hosts.data?.nextCursor),
    hasPreviousPage: cursors.length > 1,
    nextPage: () => { const next = hosts.data?.nextCursor; if (next) setCursors((stack) => [...stack, next]); },
    previousPage: () => setCursors((stack) => stack.length > 1 ? stack.slice(0, -1) : stack),
    tab, setTab,
    host: host.data ?? null,
    hostError: host.error,
    contacts: contacts.data?.pages.flatMap((page) => page.rows) ?? [],
    contactsFailed: contacts.isError,
    retryContacts: () => void contacts.refetch(),
    hasMoreContacts: contacts.hasNextPage,
    moreContacts: () => void contacts.fetchNextPage(),
    /** Decides the version the person read; a newer one comes back as an error to reload. */
    reviewContact: (contact: SalesContact, expectedRevision: number, status: SalesContact["relationship"]["contactabilityStatus"],
      reason: string, evidenceId: string | null) => run(() => reviewingContact.mutateAsync({organizerId, contactId: contact.contactId,
      expectedRevision, status, reason, requestId: crypto.randomUUID(), ...(status === "draft_reviewed" && evidenceId ? {evidenceId} : {})}),
    "Contact review recorded. No send permission was granted."),
    logActivity: (input: HostActivityInput) => run(() => logging.mutateAsync({...input, organizerId,
      requestId: crypto.randomUUID(), occurredAt: new Date().toISOString()}), "Logged."),
    addNextStep: (input: NextStepInput) => run(() => savingTask.mutateAsync({organizerId, requestId: crypto.randomUUID(),
      expectedRevision: 0, task: {...input, ownerUid: uid ?? "", status: "open"}}), "Next step added."),
    completeNextStep: (task: SalesTask) => run(() => savingTask.mutateAsync({organizerId, taskId: task.taskId,
      requestId: crypto.randomUUID(), expectedRevision: task.revision, task: {kind: task.kind, title: task.title,
        dueAt: task.dueAt, ownerUid: task.ownerUid, status: "completed"}}), "Done."),
    /** Moves a deal, or starts one when there is none; a stale revision comes back as an error to reload. */
    saveDeal: (deal: SalesOpportunity | null, {transitionReason, ...fields}: DealMoveInput) => run(() => savingDeal.mutateAsync({
      organizerId, requestId: crypto.randomUUID(), expectedRevision: deal?.revision ?? 0,
      ...(deal ? {opportunityId: deal.opportunityId} : {}), ...(transitionReason ? {transitionReason} : {}),
      fields: {motion: deal?.motion ?? "first_workflow_pilot", ownerUid: deal?.ownerUid ?? uid ?? "", ...fields},
    }), deal ? "Deal moved." : "Deal started."),
    /** Saves the host from what the person opened; a change someone else made comes back as an error to reload. */
    saveHost: (expectedRevision: number, input: HostEditInput) => run(() => savingHost.mutateAsync({organizerId,
      requestId: crypto.randomUUID(), expectedRevision, patch: {
        // A sales associate works their own hosts: they can't reassign one or change its research status.
        ...(ownerUid ? {} : {researchStatus: input.researchStatus, assignedOwnerUid: input.assignedOwnerUid}),
        summary: input.summary.trim() || null, nextAction: input.nextAction.trim() || null,
      }}), "Saved."),
    addPerson: (input: PersonInput) => run(() => savingPerson.mutateAsync({...input, organizerId, requestId: crypto.randomUUID(),
      expectedRevision: 0}), "Added."),
    evidence: evidence.data?.pages.flatMap((page) => page.rows) ?? [],
    evidenceFailed: evidence.isError,
    retryEvidence: () => void evidence.refetch(),
    hasMoreEvidence: evidence.hasNextPage,
    moreEvidence: () => void evidence.fetchNextPage(),
    addEvidence: (input: EvidenceInput) => run(() => addingEvidence.mutateAsync({...input, organizerId,
      requestId: crypto.randomUUID()}), "Evidence added."),
    suggestions: suggestions.data?.pages.flatMap((page) => page.rows) ?? [],
    suggestionsFailed: suggestions.isError,
    retrySuggestions: () => void suggestions.refetch(),
    hasMoreSuggestions: suggestions.hasNextPage,
    moreSuggestions: () => void suggestions.fetchNextPage(),
    /** Decides the version the person read; a newer one comes back as an error to reload. */
    reviewSuggestion: (proposal: SalesEvidenceProposal, decision: "accept" | "reject", reason: string) => run(() => reviewing.mutateAsync({
      organizerId, proposalId: proposal.proposalId, expectedRevision: proposal.revision, decision, reason,
      requestId: crypto.randomUUID()}), decision === "accept" ? "Suggestion accepted." : "Suggestion rejected."),
    setHold: (expectedRevision: number, status: SalesHoldStatus, reason: string) => run(() => holding.mutateAsync({organizerId,
      expectedRevision, status, reason, requestId: crypto.randomUUID()}), "Account hold saved."),
    canEditResearch: ownerUid === null,
    isSaving: logging.isPending || savingTask.isPending || savingDeal.isPending || savingHost.isPending || savingPerson.isPending ||
      addingEvidence.isPending || reviewing.isPending || holding.isPending || reviewingContact.isPending,
  };
}

export type SalesHostsController = ReturnType<typeof useSalesHostsController>;
