import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useState} from "react";
import {
  getSalesAccount,
  listSalesAccounts,
  listSalesContacts,
  recordSalesActivity,
  updateSalesAccount,
  upsertSalesContact,
  upsertSalesOpportunity,
  upsertSalesTask,
} from "../api/salesRepository";
import type {
  SalesContactInput,
  SalesOpportunity,
  SalesRecordActivityInput,
  SalesResearchStatus,
  SalesTask,
} from "../api/salesTypes";

export type HostTab = "overview" | "conversations" | "deals" | "notes";

export type HostActivityInput = Pick<SalesRecordActivityInput, "type" | "note" | "channel" | "attestation">;
export type NextStepInput = Pick<SalesTask, "kind" | "title" | "dueAt">;
export interface HostEditInput {
  researchStatus: SalesResearchStatus;
  assignedOwnerUid: string | null;
  summary: string;
  nextAction: string;
}
export type PersonInput = Pick<SalesContactInput, "contact" | "relationship">;
export type DealMoveInput = Pick<SalesOpportunity, "stage" | "nextStep" | "nextStepAt"> & {transitionReason?: string};

/**
 * Hosts: the accounts a sales associate works (or the team's), searchable,
 * and one host's page with four tabs: overview, conversations, deals, notes.
 * Its everyday work happens there: logging what happened, next steps and moving a deal.
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
  const contacts = useQuery({
    queryKey: ["sales", "contacts", selectedOrganizerId],
    queryFn: () => listSalesContacts(selectedOrganizerId as string),
    enabled: selectedOrganizerId !== null,
  });
  const logging = useMutation({mutationFn: recordSalesActivity});
  const savingTask = useMutation({mutationFn: upsertSalesTask});
  const savingDeal = useMutation({mutationFn: upsertSalesOpportunity});
  const savingHost = useMutation({mutationFn: updateSalesAccount});
  const savingPerson = useMutation({mutationFn: upsertSalesContact});

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
    contacts: contacts.data?.rows ?? [],
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
    canEditResearch: ownerUid === null,
    isSaving: logging.isPending || savingTask.isPending || savingDeal.isPending || savingHost.isPending || savingPerson.isPending,
  };
}

export type SalesHostsController = ReturnType<typeof useSalesHostsController>;
