import {
  CatchBarIndicator,
  CatchButton,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchSection,
  CatchLegacyText,
} from "@catch/web-ui";
import {
  billingPlanLabel,
  billPeriodName,
  billReviewLabel,
  billState,
  moneyNowMillis,
  monthLabel,
  rupees,
  trialLabel,
} from "../controllers/moneyLabels";
import {
  organizerSalesMinor,
  useOrganizerBillsController,
  type OrganizerBillsController,
} from "../controllers/useOrganizerBillsController";

const stateColor = {secondary: "ink2", success: "positiveText", warning: "attentionText", danger: "danger"} as const;

function amountRow(title: string, amount: string, subtitle?: string) {
  return (
    <CatchIndexRow
      key={title}
      subtitle={subtitle}
      title={title}
      titleVariant="bodyM"
      trailing={<CatchLegacyText as="span" variant="supportingStrong">{amount}</CatchLegacyText>}
    />
  );
}

/**
 * What one organizer's money looks like to Catch: all-time sales and earnings, ticket sales each
 * month, its bills newest first, and its latest month as the organizer lived it. Bills open in Money.
 */
export function OrganizerBillsWorkspace({
  controller,
  nowMillis,
  onOpenBill,
}: {
  controller: OrganizerBillsController;
  nowMillis: number;
  onOpenBill: (billId: string) => void;
}) {
  if (controller.loadState === "loading") {
    return <CatchLegacyText as="p" color="ink2" variant="bodyM">Loading bills</CatchLegacyText>;
  }
  if (controller.loadState === "error") {
    return <CatchLegacyText as="p" color="danger" variant="bodyM">{controller.loadError ?? "Bills could not load."}</CatchLegacyText>;
  }
  const trial = trialLabel(controller.trial);
  const plan = billingPlanLabel(controller.billingPlan, nowMillis);
  const review = billReviewLabel(controller.billReview);
  const reviewEntries = review ? [{label: "Sending bills", value: review.text, tone: review.tone}] : [];
  const trialRow = (
    <CatchMetaRow entries={[...(trial ? [{label: "Free trial", value: trial}] : []), {label: "Plan", value: plan},
      ...reviewEntries]} />
  );
  const held = Boolean(controller.billReview?.hold);
  const holdControl = controller.billReview?.canHold ? (
    <CatchGap size="related">
      <CatchButton
        label={held ? "Release the hold on sending" : "Hold bills from sending automatically"}
        onPressed={controller.isActing ? null : () => void controller.setHold(held ? "releaseOrganizerHold" : "holdOrganizer", null)}
        size="sm"
        variant="secondary"
      />
      {controller.actionError ? <CatchLegacyText as="p" color="danger" variant="bodyS">{controller.actionError}</CatchLegacyText> : null}
    </CatchGap>
  ) : null;
  if (controller.bills.length === 0) {
    return (
      <CatchGap size="majorSection">
        {trialRow}
        {holdControl}
        <CatchSection dividers="none" empty="No bills yet." title="Bills" />
      </CatchGap>
    );
  }
  const {bills, latest, summary} = controller;
  const oldestFirst = [...bills].reverse().slice(-12);
  return (
    <CatchGap size="majorSection">
      <CatchMetaRow entries={[
        {label: "Ticket sales, all time", value: `${rupees(summary.salesMinor)} · ${summary.paymentCount.toLocaleString("en-IN")} tickets`},
        {label: "Catch earned, all time", value: rupees(summary.earnedMinor)},
        ...(trial ? [{label: "Free trial", value: trial}] : []),
        {label: "Plan", value: plan},
        ...reviewEntries,
      ]} />
      {holdControl}
      {oldestFirst.length > 1 ? (
        <CatchSection dividers="none" title="Ticket sales each month">
          <CatchBarIndicator
            bars={oldestFirst.map((bill) => ({
              label: monthLabel(bill.month).slice(0, 3),
              value: Math.round(organizerSalesMinor(bill) / 100),
            }))}
            label="Ticket sales each month, in rupees"
            recipe="chart"
          />
        </CatchSection>
      ) : null}
      <CatchSection count={bills.length} title="Bills">
        {bills.map((bill) => {
          const state = billState(bill, nowMillis, held);
          return (
            <CatchIndexRow
              key={bill.billId}
              onTap={() => onOpenBill(bill.billId)}
              subtitle={`${rupees(organizerSalesMinor(bill))} in ticket sales${bill.commission.capped ? " · capped" : ""}`}
              title={`${billPeriodName(bill)}: ${bill.status === "free" ? "free" : rupees(bill.totalMinor)}`}
              titleVariant="bodyM"
              trailing={(
                <CatchLegacyText as="span" color={state.tone ? stateColor[state.tone] : "ink"} variant="supportingStrong">
                  {state.text}
                </CatchLegacyText>
              )}
            />
          );
        })}
      </CatchSection>
      {latest ? (
        <CatchSection title={`${monthLabel(latest.month)}, for them`}>
          {amountRow("Ticket sales", rupees(latest.salesMinor),
            latest.refundedMinor > 0 ? `After ${rupees(latest.refundedMinor)} refunded` : undefined)}
          {amountRow("Razorpay fees", rupees(-latest.providerFeeMinor), "Taken by Razorpay")}
          {amountRow("Catch bill", rupees(-latest.billMinor), latest.writtenOff ? "Written off" : undefined)}
          {amountRow("They kept", rupees(latest.keptMinor))}
        </CatchSection>
      ) : null}
    </CatchGap>
  );
}

/** The Money tab's bills, read live; the shell shows them only to those who can open Money. */
export function OrganizerBillsRouteWorkspace({
  onOpenBill,
  organizerId,
}: {
  onOpenBill: (billId: string) => void;
  organizerId: string;
}) {
  const controller = useOrganizerBillsController(organizerId);
  return <OrganizerBillsWorkspace controller={controller} nowMillis={moneyNowMillis()} onOpenBill={onOpenBill} />;
}
