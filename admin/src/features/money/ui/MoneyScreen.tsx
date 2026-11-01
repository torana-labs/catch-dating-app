import {
  CatchButton,
  CatchDialog,
  CatchDock,
  CatchEmptyState,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchPaneLayout,
  CatchSection,
  CatchTable,
  CatchText,
  CatchWorkspaceHeader,
  type CatchMetaEntry,
  type CatchTableColumn,
  type CatchWorkspaceHeaderFilterChip,
} from "@catch/web-ui";
import {useState} from "react";
import type {Bill, BillAction, BillsMonth, MoneyIssue} from "../api/moneyRepository";
import type {BillFilter, BillsController} from "../controllers/useBillsController";
import type {MoneyIssuesController} from "../controllers/useMoneyIssuesController";
import {
  billDue,
  billJourney,
  billPeriod,
  billState,
  billSummary,
  dayDate,
  issueKindLabels,
  issueSourceLabels,
  monthLabel,
  percent,
  rupees,
  statusLabel,
  waitingFor,
  waitingTone,
  type MoneyLabel,
} from "../controllers/moneyLabels";

/** Money's three views: issues waiting on someone, issues closed, and the month's bills to organizers. */
export type MoneyView = "issues" | "resolved" | "bills";

interface IssueRow {
  key: string;
  issue: {title: string; subtitle: string};
  kind: {label: string; tone: "neutral"};
  organizer: string;
  waiting: MoneyLabel;
}

interface BillRow {
  key: string;
  organizer: {title: string; subtitle: string};
  sales: string;
  bill: string;
  state: MoneyLabel;
}

const issueColumns: CatchTableColumn<IssueRow>[] = [
  {key: "issue", label: "Issue", kind: "title"},
  {key: "kind", label: "Kind", kind: "badge", width: "100px"},
  {key: "organizer", label: "Organizer", width: "170px"},
  {key: "waiting", label: "Waiting", width: "110px", sort: "desc", align: "end"},
];

const billColumns: CatchTableColumn<BillRow>[] = [
  {key: "organizer", label: "Organizer", kind: "title"},
  {key: "sales", label: "Ticket sales", kind: "number", width: "120px"},
  {key: "bill", label: "Bill", kind: "number", width: "100px"},
  {key: "state", label: "Where it is", width: "170px", sort: "asc"},
];

const billFilters: Array<{value: BillFilter; label: string; count: (counts: BillsMonth["counts"]) => number}> = [
  {value: "all", label: "All", count: (counts) => counts.all},
  {value: "toSend", label: "To send", count: (counts) => counts.toSend},
  {value: "sent", label: "Sent", count: (counts) => counts.sent},
  {value: "overdue", label: "Overdue", count: (counts) => counts.overdue},
  {value: "paid", label: "Paid", count: (counts) => counts.paid},
  {value: "free", label: "Free month", count: (counts) => counts.free},
];

const issueFilters: Array<{value: "all" | MoneyIssue["kind"]; label: string}> = [
  {value: "all", label: "All"},
  {value: "payment", label: "Payments"},
  {value: "refund", label: "Refunds"},
  {value: "review", label: "Reviews"},
  {value: "bill", label: "Bills"},
];

/**
 * Money: payment issues as a queue (oldest first, one open in the inspector with its decision),
 * and the month's bills to organizers as a second queue. The AdminMoney and AdminMoneyBills boards.
 */
export function MoneyScreen({
  view,
  issues,
  bills,
  nowMillis,
  detailOpen,
  onViewChange,
  onOpenSettings,
  onSelectIssue,
  onSelectBill,
  onOpenBill,
  onCloseDetail,
}: {
  view: MoneyView;
  issues: MoneyIssuesController;
  bills: BillsController;
  nowMillis: number;
  detailOpen: boolean;
  onViewChange: (view: MoneyView) => void;
  onOpenSettings: () => void;
  onSelectIssue: (issueId: string) => void;
  onSelectBill: (billId: string) => void;
  onOpenBill: (billId: string) => void;
  onCloseDetail: () => void;
}) {
  const openCount = view === "issues" ? issues.data?.counts.all : undefined;
  const views = {
    label: "Money views",
    value: view,
    onChanged: (value: string) => onViewChange(value as MoneyView),
    items: [
      {value: "issues", label: "Open issues", count: openCount},
      {value: "resolved", label: "Resolved"},
      {value: "bills", label: "Bills", count: bills.data?.counts.all},
    ],
  };
  const settings = <CatchButton label="Payment settings" onPressed={onOpenSettings} size="sm" variant="secondary" />;
  if (view === "bills") {
    const counts = bills.data?.counts;
    const chips: CatchWorkspaceHeaderFilterChip[] = billFilters.filter((filter) =>
      filter.value === "all" || bills.filter === filter.value || (counts ? filter.count(counts) > 0 : true)).map((filter) => ({
      label: filter.label,
      count: counts ? filter.count(counts) : undefined,
      selected: bills.filter === filter.value,
      onPressed: () => bills.setFilter(filter.value),
    }));
    const totals = bills.data?.totals;
    const month = bills.data?.bills[0]?.month ?? bills.data?.month ?? null;
    const header = (
      <CatchWorkspaceHeader
        actions={settings}
        count={counts?.all}
        filters={{chips, search: {placeholder: "Search bills", value: bills.search, onChanged: bills.setSearch}}}
        note={totals && month ? `${monthLabel(month)} · ${rupees(totals.billedMinor)} billed, ${rupees(totals.paidMinor)} paid` : undefined}
        title="Money"
        views={views}
      />
    );
    return (
      <CatchPaneLayout
        detail={bills.selected ? (
          <MoneyBillInspector
            key={bills.selected.billId}
            bill={bills.selected}
            gstRegistered={bills.data?.gstRegistered ?? false}
            isActing={bills.isActing}
            actionError={bills.actionError}
            next={nextOf(bills.rows, bills.selected)}
            nowMillis={nowMillis}
            onAct={bills.act}
            onClose={onCloseDetail}
            onSelect={onSelectBill}
            position={positionOf(bills.rows, bills.selected)}
          />
        ) : null}
        detailOpen={detailOpen && bills.selected !== null}
        main={<>{header}{billsMain(bills, nowMillis, onSelectBill)}</>}
        pattern="queue"
      />
    );
  }
  const chips: CatchWorkspaceHeaderFilterChip[] = issueFilters.filter((filter) =>
    filter.value === "all" || issues.kind === filter.value || (issues.data?.counts[filter.value] ?? 0) > 0).map((filter) => ({
    label: filter.label,
    count: issues.data ? issues.data.counts[filter.value] : undefined,
    selected: issues.kind === filter.value,
    onPressed: () => issues.setKind(filter.value),
  }));
  const oldest = issues.rows.length > 0 ? Math.min(...issues.rows.map((issue) => issue.waitingSinceMillis)) : null;
  const header = (
    <CatchWorkspaceHeader
      actions={settings}
      count={issues.data?.counts.all}
      filters={{chips, search: {placeholder: "Search by guest, organizer or event", value: issues.search, onChanged: issues.setSearch}}}
      note={view === "issues" && oldest !== null ? `oldest ${waitingFor(oldest, nowMillis)}` : undefined}
      title="Money"
      views={views}
    />
  );
  return (
    <CatchPaneLayout
      detail={issues.selected ? (
        <MoneyIssueInspector
          key={issues.selected.issueId}
          actionError={issues.actionError}
          isActing={issues.isActing}
          issue={issues.selected}
          next={issues.next}
          nowMillis={nowMillis}
          onClose={onCloseDetail}
          onCloseIssue={issues.close}
          onConfirmBooking={issues.confirmBooking}
          onOpenBill={onOpenBill}
          onSelect={onSelectIssue}
          position={positionOf(issues.rows, issues.selected)}
          resolved={view === "resolved"}
        />
      ) : null}
      detailOpen={detailOpen && issues.selected !== null}
      main={<>{header}{issuesMain(issues, view, nowMillis, onSelectIssue)}</>}
      pattern="queue"
    />
  );
}

function issuesMain(issues: MoneyIssuesController, view: MoneyView, nowMillis: number,
  onSelect: (issueId: string) => void) {
  if (issues.loadState === "loading") return <CatchText as="p" color="ink2" variant="bodyM">Loading payment issues</CatchText>;
  if (issues.loadState === "error") return <CatchText as="p" color="danger" variant="bodyM">{issues.loadError ?? "Payment issues could not load."}</CatchText>;
  if (issues.rows.length === 0) {
    return view === "issues" && issues.data?.counts.all === 0 ?
      <CatchEmptyState kind="done" message="Every payment, refund and bill is where it should be." title="No payment issues" /> :
      <CatchEmptyState message={view === "resolved" ? "Issues you close or confirm appear here." : "No issue matches."} title="Nothing here" />;
  }
  const rows: IssueRow[] = issues.rows.map((issue) => ({
    key: issue.issueId,
    issue: {title: issue.title, subtitle: issue.subtitle},
    kind: {label: issueKindLabels[issue.kind], tone: "neutral"},
    organizer: issue.organizerName ?? "—",
    waiting: view === "resolved" && issue.resolution ?
      {text: waitingFor(issue.resolution.resolvedAtMillis, nowMillis) + " ago", tone: "secondary"} :
      {text: waitingFor(issue.waitingSinceMillis, nowMillis), tone: waitingTone(issue.waitingSinceMillis, nowMillis)},
  }));
  return (
    <CatchTable<IssueRow>
      columns={view === "resolved" ? issueColumns.map((column) => column.key === "waiting" ? {...column, label: "Closed"} : column) : issueColumns}
      density="compact"
      label={view === "resolved" ? "Resolved payment issues" : "Open payment issues"}
      onRowPressed={(row) => onSelect(row.key)}
      rowKey="key"
      rows={rows}
      selectedKey={issues.selected?.issueId ?? null}
    />
  );
}

function billsMain(bills: BillsController, nowMillis: number, onSelect: (billId: string) => void) {
  if (bills.loadState === "loading") return <CatchText as="p" color="ink2" variant="bodyM">Loading bills</CatchText>;
  if (bills.loadState === "error") return <CatchText as="p" color="danger" variant="bodyM">{bills.loadError ?? "Bills could not load."}</CatchText>;
  if (bills.data && bills.data.counts.all === 0) {
    return (
      <CatchEmptyState
        actions={<CatchButton label={bills.isActing ? "Making bills" : "Make last month's bills"} onPressed={bills.isActing ? null : () => void bills.generate()} size="sm" />}
        message="Bills are made on the 1st from the month's bookings paid into organizers' own Razorpay."
        title="No bills for this month yet"
      />
    );
  }
  if (bills.rows.length === 0) return <CatchEmptyState message="No bill matches." title="Nothing here" />;
  const rows: BillRow[] = bills.rows.map((bill) => ({
    key: bill.billId,
    organizer: {title: bill.organizerName, subtitle: billSummary(bill)},
    sales: rupees(bill.sales.grossMinor - bill.sales.refundedMinor),
    bill: bill.status === "free" ? "—" : rupees(bill.totalMinor),
    state: billState(bill, nowMillis),
  }));
  return (
    <CatchTable<BillRow>
      columns={billColumns}
      density="compact"
      label="Bills to organizers"
      onRowPressed={(row) => onSelect(row.key)}
      rowKey="key"
      rows={rows}
      selectedKey={bills.selected?.billId ?? null}
    />
  );
}

/** "1 of 31", with the rows either side for the inspector's arrows. */
interface QueuePosition {
  label: string;
  previousId: string | null;
  nextId: string | null;
}

function idOf(row: Bill | MoneyIssue): string {
  return "billId" in row ? row.billId : row.issueId;
}

function positionOf(rows: Array<Bill | MoneyIssue>, selected: Bill | MoneyIssue): QueuePosition {
  const index = rows.findIndex((row) => idOf(row) === idOf(selected));
  return {
    label: `${index + 1} of ${rows.length}`,
    previousId: index > 0 ? idOf(rows[index - 1]) : null,
    nextId: index >= 0 && index < rows.length - 1 ? idOf(rows[index + 1]) : null,
  };
}

function nextOf<T extends Bill | MoneyIssue>(rows: T[], selected: T): T | null {
  const index = rows.findIndex((row) => idOf(row) === idOf(selected));
  return index >= 0 ? rows[index + 1] ?? null : null;
}

/** What to do about each kind, said in the decision bar's note. */
const guidance: Record<MoneyIssue["kind"], string> = {
  payment: "Confirming checks Razorpay again: it books the guest if there is room, or starts their refund.",
  refund: "Send the refund from the organizer's Razorpay, then close this with what you did.",
  review: "Check the payment in Razorpay, then close this with what you found.",
  bill: "Remind the organizer or mark the bill paid from Bills.",
};

/** One payment issue: what is known, what happened, and the decision bar. */
function MoneyIssueInspector({
  issue,
  next,
  position,
  nowMillis,
  resolved,
  isActing,
  actionError,
  onConfirmBooking,
  onCloseIssue,
  onOpenBill,
  onSelect,
  onClose,
}: {
  issue: MoneyIssue;
  next: MoneyIssue | null;
  position: QueuePosition;
  nowMillis: number;
  resolved: boolean;
  isActing: boolean;
  actionError: string | null;
  onConfirmBooking: (note: string | null) => Promise<boolean>;
  onCloseIssue: (note: string | null) => Promise<boolean>;
  onOpenBill: (billId: string) => void;
  onSelect: (issueId: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const facts: CatchMetaEntry[] = [
    {label: "Who and what", value: issue.subtitle},
    {label: resolved ? "Waited" : "Waiting", value: waitingFor(issue.waitingSinceMillis, nowMillis), tone: waitingTone(issue.waitingSinceMillis, nowMillis)},
    {label: "Organizer", value: issue.organizerName ?? "—"},
    {label: "Amount", value: rupees(issue.amountMinor)},
    {label: "From", value: issueSourceLabels[issue.source]},
    {label: "Status", value: statusLabel(issue.status), tone: issue.kind === "payment" ? "warning" : undefined},
  ];
  if (issue.providerPaymentId) facts.push({label: "Razorpay", value: issue.providerPaymentId, wide: true});
  if (issue.lastErrorCode) facts.push({label: "Last error", value: issue.lastErrorCode, tone: "danger", wide: true});
  const run = async (action: (note: string | null) => Promise<boolean>) => {
    if (await action(note)) setNote("");
  };
  const steps = [
    {title: `${issueKindLabels[issue.kind]} issue opened`, subtitle: issueSourceLabels[issue.source], meta: dayDate(issue.waitingSinceMillis), state: "done" as const},
    ...(issue.resolution ? [{
      title: issue.resolution.action === "confirmedBooking" ? "Booking confirmed" : "Closed",
      subtitle: issue.resolution.note ?? undefined,
      meta: dayDate(issue.resolution.resolvedAtMillis),
      state: "done" as const,
    }] : [{title: "Waiting for you", subtitle: guidance[issue.kind], meta: "Now", state: "current" as const, tone: waitingTone(issue.waitingSinceMillis, nowMillis) === "warning" ? "warning" as const : "neutral" as const}]),
  ];
  const dock = resolved ? null : issue.kind === "bill" ? (
    <CatchDock
      next={next ? `Then: ${next.title}` : undefined}
      primary={{label: "Open the bill", onPressed: () => onOpenBill(issue.targetId)}}
      recipe="pane"
    />
  ) : (
    <CatchDock
      danger={issue.canConfirmBooking ? {label: "Close", onPressed: isActing ? null : () => void run(onCloseIssue)} : undefined}
      next={next ? `Then: ${next.title}` : undefined}
      note={{label: "Note", placeholder: "What you did", value: note, onChanged: setNote, required: !issue.canConfirmBooking}}
      primary={issue.canConfirmBooking ?
        {label: "Confirm the booking", isLoading: isActing, onPressed: isActing ? null : () => void run(onConfirmBooking)} :
        {label: "Close", isLoading: isActing, onPressed: isActing || note.trim() === "" ? null : () => void run(onCloseIssue)}}
      recipe="pane"
    />
  );
  return (
    <>
      <CatchWorkspaceHeader
        back={{label: "Back to Money", close: true, onPressed: onClose}}
        kicker={`Money · ${position.label}`}
        position={{
          label: position.label,
          previous: position.previousId ? {label: "Previous issue", onPressed: () => onSelect(position.previousId as string)} : undefined,
          next: position.nextId ? {label: "Next issue", onPressed: () => onSelect(position.nextId as string)} : undefined,
        }}
        title={issue.title}
      />
      <CatchGap size="section">
        <CatchMetaRow columns={2} entries={facts} />
        {issue.kind === "bill" ? (
          <CatchButton label="Open the bill" onPressed={() => onOpenBill(issue.targetId)} size="sm" variant="secondary" />
        ) : null}
        <CatchSection timeline={steps} title="How it got here" />
        {actionError ? <CatchText as="p" color="danger" variant="bodyS">{actionError}</CatchText> : null}
      </CatchGap>
      {dock}
    </>
  );
}

function Amount({minor, empty}: {minor: number; empty?: boolean}) {
  return <CatchText as="span" variant="supportingStrong">{empty ? "—" : rupees(minor)}</CatchText>;
}

/** One bill: what it charges and why, the organizer's own costs, how it got here, and its decision bar. */
function MoneyBillInspector({
  bill,
  next,
  position,
  nowMillis,
  gstRegistered,
  isActing,
  actionError,
  onAct,
  onSelect,
  onClose,
}: {
  bill: Bill;
  next: Bill | null;
  position: QueuePosition;
  nowMillis: number;
  gstRegistered: boolean;
  isActing: boolean;
  actionError: string | null;
  onAct: (action: BillAction, note: string | null) => Promise<boolean>;
  onSelect: (billId: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [confirmingWriteOff, setConfirmingWriteOff] = useState(false);
  const due = billDue(bill, nowMillis);
  const {sales, commission, gst} = bill;
  const netSales = sales.grossMinor - sales.refundedMinor;
  const facts: CatchMetaEntry[] = [
    {label: "Period", value: billPeriod(bill)},
    {label: "Due", value: due.text, tone: due.tone},
    {label: "Terms", value: `${percent(commission.rateBasisPoints)} · ${bill.terms.ownTerms ? "their own terms" : "platform terms"}`},
    bill.paymentLink ?
      {label: "Payment link", value: bill.paymentLink.url, href: bill.paymentLink.url} :
      {label: "Payment link", value: bill.status === "toSend" ? "Made when sent" : "None", tone: "secondary"},
  ];
  const run = async (action: BillAction) => {
    if (await onAct(action, note)) setNote("");
  };
  const commissionNotes = [
    bill.terms.ownTerms ? "Their own terms" : "Platform terms",
    commission.capMinor === null ? "no cap" :
      `cap of ${rupees(commission.capMinor)} ${commission.capped ? "reached" : "not reached"}`,
    commission.trialWaivedMinor > 0 ? `${rupees(commission.trialWaivedMinor)} waived in the free month` : null,
  ].filter(Boolean).join(" · ");
  const open = bill.status === "toSend" || bill.status === "sent";
  const dock = open ? (
    <CatchDock
      danger={{label: "Write off", onPressed: isActing ? null : () => setConfirmingWriteOff(true)}}
      next={next ? `Then: ${next.organizerName}` : undefined}
      note={{label: "Note", placeholder: "Why, if you change anything", value: note, onChanged: setNote}}
      primary={bill.status === "toSend" ?
        {label: "Send the bill", isLoading: isActing, onPressed: isActing ? null : () => void run("send")} :
        {label: "Send a reminder", isLoading: isActing, onPressed: isActing ? null : () => void run("remind")}}
      recipe="pane"
      secondary={bill.status === "sent" ? {label: "Mark as paid", onPressed: isActing ? null : () => void run("markPaid")} : undefined}
    />
  ) : null;
  return (
    <>
      <CatchWorkspaceHeader
        back={{label: "Back to bills", close: true, onPressed: onClose}}
        kicker={`Bills · ${position.label}`}
        position={{
          label: position.label,
          previous: position.previousId ? {label: "Previous bill", onPressed: () => onSelect(position.previousId as string)} : undefined,
          next: position.nextId ? {label: "Next bill", onPressed: () => onSelect(position.nextId as string)} : undefined,
        }}
        title={bill.organizerName}
      />
      <CatchGap size="section">
        <CatchMetaRow columns={2} entries={facts} />
        <CatchSection note={bill.invoiceNumber ?? "No invoice number until sent"} title="The bill">
          <CatchIndexRow
            titleVariant="titleS"
            subtitle={`${sales.paymentCount} payments across ${sales.eventCount} ${sales.eventCount === 1 ? "event" : "events"}` +
              (sales.refundedMinor > 0 ? `, after ${rupees(sales.refundedMinor)} refunded` : "")}
            title="Ticket sales"
            trailing={<Amount minor={netSales} />}
          />
          <CatchIndexRow
            titleVariant="titleS"
            subtitle={commissionNotes}
            title={`Commission at ${percent(commission.rateBasisPoints)}`}
            trailing={<Amount minor={commission.amountMinor} />}
          />
          <CatchIndexRow
            titleVariant="titleS"
            subtitle={gst.registered ? `GST at ${percent(gst.rateBasisPoints)}` :
              gstRegistered ? "None: this bill was made before Catch registered" : "None: Catch is not GST-registered yet"}
            title="GST"
            trailing={<Amount empty={gst.amountMinor === 0} minor={gst.amountMinor} />}
          />
          <CatchIndexRow
            titleVariant="titleS"
            subtitle={bill.status === "paid" ? `Paid ${bill.paidVia === "paymentLink" ? "by payment link" : "and marked by hand"}` :
              bill.status === "free" ? "Every sale fell in the free month" : "Paid by UPI or card from the link"}
            title={bill.dueAtMillis !== null ? `Total due ${due.text.split(" · ")[0]}` : "Total"}
            trailing={<Amount empty={bill.status === "free"} minor={bill.totalMinor} />}
          />
        </CatchSection>
        <CatchSection note="for their records" title="Their costs">
          <CatchIndexRow
            titleVariant="titleS"
            subtitle={`Including ${rupees(sales.providerTaxMinor)} tax. Taken by Razorpay from their account; Catch never sees this money`}
            title="Razorpay fees"
            trailing={<Amount minor={sales.providerFeeMinor} />}
          />
          <CatchIndexRow
            titleVariant="titleS"
            subtitle={`In ${monthLabel(bill.month)}; already off ticket sales`}
            title="Refunds"
            trailing={<Amount empty={sales.refundedMinor === 0} minor={sales.refundedMinor} />}
          />
        </CatchSection>
        <CatchSection timeline={billJourney(bill, nowMillis)} title="How it got here" />
        {actionError ? <CatchText as="p" color="danger" variant="bodyS">{actionError}</CatchText> : null}
      </CatchGap>
      {dock}
      <CatchDialog
        cancel={{label: "Keep the bill", onPressed: () => setConfirmingWriteOff(false)}}
        confirm={{
          label: "Write off",
          tone: "danger",
          onPressed: isActing ? null : () => {
            setConfirmingWriteOff(false);
            void run("writeOff");
          },
        }}
        message={`${bill.organizerName} won't be asked for ${rupees(bill.totalMinor)}. The bill keeps its invoice number.`}
        onClose={() => setConfirmingWriteOff(false)}
        open={confirmingWriteOff}
        title={`Write off ${monthLabel(bill.month)}'s bill?`}
      />
    </>
  );
}
