import {useEffect, useState} from "react";
import {moneyNowMillis} from "../controllers/moneyLabels";
import {useBillsController} from "../controllers/useBillsController";
import {useMoneyIssuesController} from "../controllers/useMoneyIssuesController";
import {MoneyScreen, type MoneyView} from "./MoneyScreen";

export type {MoneyView} from "./MoneyScreen";

const outcomeNotices = {
  admitted: "Booking confirmed. The guest gets their ticket.",
  stillWaiting: "Razorpay hasn't settled this payment yet, so it stays open.",
  refunding: "There was no room left, so their refund has started.",
  closed: "Closed.",
} as const;

/** Money as the shell routes it: the view and record come from the address. */
export function MoneyRouteScreen({
  view,
  selectedId,
  onOpen,
  onOpenSettings,
  onNotice,
}: {
  view: MoneyView;
  selectedId: string | null;
  /** Moves to a view, and to one record in it when an id is given. */
  onOpen: (view: MoneyView, id: string | null) => void;
  onOpenSettings: () => void;
  onNotice: (message: string | null) => void;
}) {
  const [nowMillis] = useState(moneyNowMillis);
  const issues = useMoneyIssuesController({
    view: view === "resolved" ? "resolved" : "open",
    selectedIssueId: view === "bills" ? null : selectedId,
    onSelectIssueId: (issueId) => onOpen(view, issueId),
  });
  const bills = useBillsController({
    selectedBillId: view === "bills" ? selectedId : null,
    onSelectBillId: (billId) => onOpen("bills", billId),
  });
  const outcome = issues.lastOutcome;
  useEffect(() => {
    if (outcome) onNotice(outcomeNotices[outcome.result]);
  }, [onNotice, outcome]);
  return (
    <MoneyScreen
      bills={bills}
      detailOpen={selectedId !== null}
      issues={issues}
      nowMillis={nowMillis}
      onCloseDetail={() => onOpen(view, null)}
      onOpenBill={(billId) => onOpen("bills", billId)}
      onOpenSettings={onOpenSettings}
      onSelectBill={(billId) => onOpen("bills", billId)}
      onSelectIssue={(issueId) => onOpen(view, issueId)}
      onViewChange={(next) => onOpen(next, null)}
      view={view}
    />
  );
}
