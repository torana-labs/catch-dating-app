import {
  CatchBarIndicator,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchSection,
  CatchText,
} from "@catch/web-ui";
import {billState, moneyNowMillis, monthLabel, rupees} from "../controllers/moneyLabels";
import {
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
      trailing={<CatchText as="span" variant="supportingStrong">{amount}</CatchText>}
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
    return <CatchText as="p" color="ink2" variant="bodyM">Loading bills</CatchText>;
  }
  if (controller.loadState === "error") {
    return <CatchText as="p" color="danger" variant="bodyM">{controller.loadError ?? "Bills could not load."}</CatchText>;
  }
  if (controller.bills.length === 0) {
    return <CatchSection dividers="none" empty="No bills yet." title="Bills" />;
  }
  const {bills, latest, summary} = controller;
  const oldestFirst = [...bills].reverse().slice(-12);
  return (
    <CatchGap size="majorSection">
      <CatchMetaRow entries={[
        {label: "Ticket sales, all time", value: `${rupees(summary.salesMinor)} · ${summary.paymentCount.toLocaleString("en-IN")} tickets`},
        {label: "Catch earned, all time", value: rupees(summary.earnedMinor)},
      ]} />
      {oldestFirst.length > 1 ? (
        <CatchSection dividers="none" title="Ticket sales each month">
          <CatchBarIndicator
            bars={oldestFirst.map((bill) => ({
              label: monthLabel(bill.month).slice(0, 3),
              value: Math.round(bill.sales.baseMinor / 100),
            }))}
            label="Ticket sales each month, in rupees"
            recipe="chart"
          />
        </CatchSection>
      ) : null}
      <CatchSection count={bills.length} title="Bills">
        {bills.map((bill) => {
          const state = billState(bill, nowMillis);
          return (
            <CatchIndexRow
              key={bill.billId}
              onTap={() => onOpenBill(bill.billId)}
              subtitle={`${rupees(bill.sales.baseMinor)} in ticket sales${bill.commission.capped ? " · capped" : ""}`}
              title={`${monthLabel(bill.month)}: ${bill.status === "free" ? "free" : rupees(bill.totalMinor)}`}
              titleVariant="bodyM"
              trailing={(
                <CatchText as="span" color={state.tone ? stateColor[state.tone] : "ink"} variant="supportingStrong">
                  {state.text}
                </CatchText>
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
          {amountRow("Catch bill", rupees(-latest.billMinor))}
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
