import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useRef, useState} from "react";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {
  acceptCommercialQuote,
  approveCommercialQuote,
  attestHostSettlement,
  closeWonWithFinance,
  getCommercialDetail,
  listCommercialReport,
  reviseCommercialQuote,
  upsertCommercialPilot,
} from "../api/salesCommercialRepository";
import type {
  CommercialCloseInput,
  CommercialDecisionInput,
  CommercialPilotInput,
  CommercialQuoteInput,
  CommercialSettlementInput,
} from "../api/salesCommercialTypes";
import type {SalesOpportunity} from "../api/salesTypes";
import {salesErrorMessage} from "./salesLabels";

type Without<T> = Omit<T, "requestId" | "organizerId" | "opportunityId">;
export type PilotInput = Without<CommercialPilotInput>;
export type QuoteInput = Without<CommercialQuoteInput>;
export type QuoteDecisionInput = Without<CommercialDecisionInput>;
export type SettlementInput = Without<CommercialSettlementInput>;
export type CloseInput = Without<CommercialCloseInput>;

/**
 * One deal's pilot, quote, collection and close, on the host page. A retry of the same details keeps its
 * request id, so the server replays it, and each write names the revision the person read.
 */
export function useSalesHostCommercialController({organizerId, opportunities, enabled, onError, onNotice}: {
  organizerId: string | null;
  opportunities: readonly SalesOpportunity[];
  /** A sales associate doesn't see commercial records. */
  enabled: boolean;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [chosenDealId, setChosenDealId] = useState<string | null>(null);
  const requestIds = useRef(new Map<string, string>());
  const report = useInfiniteQuery({
    queryKey: ["sales", "commercial-report", organizerId],
    queryFn: ({pageParam}) => listCommercialReport(organizerId as string, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: enabled && organizerId !== null,
  });
  const rows = report.data?.pages.flatMap((page) => page.rows) ?? [];
  const known = [...opportunities.map((deal) => deal.opportunityId), ...rows.map((row) => row.opportunityId)];
  const dealId = chosenDealId !== null && known.includes(chosenDealId) ? chosenDealId : known[0] ?? null;
  const record = useQuery({
    queryKey: ["sales", "commercial", organizerId, dealId],
    queryFn: () => getCommercialDetail(organizerId as string, dealId as string),
    enabled: enabled && organizerId !== null && dealId !== null,
  });
  const write = useMutation({mutationFn: (action: () => Promise<unknown>) => action()});

  const run = useCallback(async <Input extends object>(kind: string, input: Input,
    invoke: (full: Input & {requestId: string; organizerId: string; opportunityId: string}) => Promise<unknown>, notice: string) => {
    const token = beginOperation();
    if (!token) return false;
    const key = JSON.stringify([kind, organizerId, dealId, input]);
    const requestId = requestIds.current.get(key) ?? crypto.randomUUID();
    requestIds.current.set(key, requestId);
    onError(null);
    try {
      await write.mutateAsync(() => invoke({...input, requestId, organizerId: organizerId as string, opportunityId: dealId as string}));
      requestIds.current.delete(key);
      onNotice(notice);
      await queryClient.invalidateQueries({queryKey: ["sales"]});
      return true;
    } catch (error) {
      onError(salesErrorMessage(error));
      if (/aborted|revision mismatch|record changed since review/iu.test(error instanceof Error ? error.message : String(error))) {
        void record.refetch();
      }
      return false;
    } finally {
      endOperation(token);
    }
  }, [beginOperation, dealId, endOperation, onError, onNotice, organizerId, queryClient, record, write]);

  return {
    dealId,
    selectDeal: setChosenDealId,
    record: record.data ?? null,
    recordFailed: record.isError,
    retryRecord: () => void record.refetch(),
    reportRows: rows,
    reportFailed: report.isError,
    retryReport: () => void report.refetch(),
    hasMoreReport: report.hasNextPage,
    moreReport: () => void report.fetchNextPage(),
    savePilot: (input: PilotInput) => run("pilot", input, upsertCommercialPilot, "Pilot plan saved."),
    reviseQuote: (input: QuoteInput) => run("quote", input, reviseCommercialQuote, "Quote version recorded."),
    approveQuote: (input: QuoteDecisionInput) => run("approve", input, approveCommercialQuote, "Quote approved for review."),
    acceptQuote: (input: QuoteDecisionInput) => run("accept", input, acceptCommercialQuote, "Terms acceptance recorded; payment is unknown."),
    attestCollection: (input: SettlementInput) => run("attest", input, attestHostSettlement,
      "Manual host collection attested. Provider confirmation remains unknown."),
    closeWon: (input: CloseInput) => run("close", input, closeWonWithFinance, "Deal closed as won with manual finance proof; provider unconfirmed."),
    isSaving: write.isPending,
  };
}

export type SalesHostCommercialController = ReturnType<typeof useSalesHostCommercialController>;
