import {
  CatchButton,
  CatchEmptyState,
  CatchFlowLayout,
  CatchGroundCard,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchPageTabBar,
  CatchRoot,
  CatchSection,
  CatchStack,
  CatchText,
} from "@catch/web-ui";
import {interpolateContent as fill} from "@content/interpolate";
import {hostBillingCopy as copy} from "../../content/hostBilling";
import {publicSiteCopy} from "../../content/site";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {SignInButton} from "../account/SignInSheet";
import {
  billPeriod,
  dayLabel,
  isOverdue,
  percent,
  planActions,
  rupees,
  type Bill,
  type PlanView,
  type TrialStatus,
} from "./hostBillingModel";
import {useHostBillingController, type HostBillingController} from "./useHostBillingController";


export function HostBillingPage() {
  return <HostBillingView {...useHostBillingController()} />;
}

/**
 * /host/billing/ on the LiveBilling board: the organizer owner's billing on
 * the web, the only place Catch's prices, paying bills and choosing the
 * tools-only plan appear (the native Host app shows status only). It is the
 * kit's flow: signed out, its head asks for the owner's sign-in; signed in,
 * a wide frame names the organiser and sets the trial, the plan and the
 * bills side by side. The page is private and out of search.
 */
export function HostBillingView(props: HostBillingController) {
  const {phase} = props;
  const signedOut = phase === "signedOut";
  const organizerName = props.organizers.find((item) => item.organizerId === props.organizerId)?.organizerName;
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader breadcrumbs={{links: [publicSiteCopy.forHosts], current: copy.title}} variant="host" />
      <WebsitePageMain id="host-billing">
        <CatchFlowLayout
          kicker={signedOut ? copy.title : organizerName ? fill(copy.kicker, {name: organizerName}) : undefined}
          lead={signedOut ? copy.signedOut.message : copy.subtitle}
          navigation={props.organizers.length > 1 && props.organizerId ? <CatchPageTabBar
            label={copy.organizer} onChanged={props.selectOrganizer} selected={props.organizerId} size="sm"
            options={props.organizers.map((item) => ({value: item.organizerId, label: item.organizerName}))} /> : undefined}
          title={signedOut ? copy.signedOut.title : copy.title}
          wide={phase === "ready"}
        >
          {phase === "loading" ? <CatchStack align="center" gap={8} role="status">
            <CatchLoadingIndicator />
            <CatchText tone="secondary" variant="body-small">{copy.loading}</CatchText>
          </CatchStack> : null}
          {signedOut ? <CatchGroundCard ground="white" outlined>
            <CatchStack align="start"><SignInButton label={copy.signedOut.action} size="md" variant="primary" /></CatchStack>
          </CatchGroundCard> : null}
          {phase === "noOrganizers" ? <CatchEmptyState message={copy.noOrganizers.message}
            title={copy.noOrganizers.title} /> : null}
          {phase === "notOwner" ? <CatchEmptyState message={copy.notOwner} /> : null}
          {phase === "failed" ? <CatchEmptyState
            actions={<CatchButton label={copy.retry} onPressed={props.refresh} size="md" variant="secondary" />}
            message={copy.failed} /> : null}
          {phase === "ready" ? <BillingSections {...props} /> : null}
        </CatchFlowLayout>
      </WebsitePageMain>
      <PublicSiteFooter variant="host" />
    </CatchRoot>
  );
}

/** The trial, the plan and the bills: each a block of the wide frame's two columns. */
function BillingSections(props: HostBillingController) {
  return (
    <>
      {props.trial ? <TrialSection trial={props.trial} /> : null}
      {props.planView ? <PlanSection {...props} view={props.planView} /> : null}
      <BillsSection {...props} />
    </>
  );
}

export function trialText(trial: TrialStatus): string {
  const end = trial.endsAtMillis === null ? "" : dayLabel(trial.endsAtMillis);
  switch (trial.state) {
  case "notStarted": return copy.trial.notStarted;
  case "scheduled": return fill(copy.trial.scheduled,
    {date: trial.startsAtMillis === null ? "" : dayLabel(trial.startsAtMillis)});
  case "active": return trial.daysLeft === 1 ? fill(copy.trial.activeOne, {date: end}) :
    fill(copy.trial.active, {days: `${trial.daysLeft ?? 0} days`, date: end});
  case "ended": return fill(copy.trial.ended, {date: end});
  case "none": return copy.trial.none;
  default: return copy.trial.unconfigured;
  }
}

function TrialSection({trial}: {trial: TrialStatus}) {
  return (
    <CatchSection container="tile" dividers="between" title={copy.trial.title}>
      <CatchIndexRow density="regular" title={trialText(trial)} wrap />
    </CatchSection>
  );
}

function PlanSection(props: HostBillingController & {view: PlanView}) {
  const {view, nowMillis, acting} = props;
  const prices = view.prices;
  const actions = planActions(view, nowMillis);
  const plan = view.plan;
  const toolsOnlyActive = plan.plan === "toolsOnly" && plan.status === "active" &&
    (plan.endsAtMillis === null || plan.endsAtMillis > nowMillis);
  const cycleDays = String(prices?.cycleDays ?? 30);
  const ticketingBody = !prices ? "" : prices.commissionCapMinor === null ?
    fill(copy.plan.ticketingBodyUncapped, {rate: percent(prices.commissionRateBasisPoints), cycleDays}) :
    fill(copy.plan.ticketingBody, {rate: percent(prices.commissionRateBasisPoints),
      cap: rupees(prices.commissionCapMinor), cycleDays});
  const toolsBody = !prices ? "" : fill(copy.plan.toolsOnlyBody, {fee: rupees(prices.toolsOnlyFeeMinor), cycleDays});
  const toolsStatus = plan.plan !== "toolsOnly" ? undefined :
    plan.status === "pendingPayment" ? copy.plan.pending :
      plan.endsAtMillis !== null && toolsOnlyActive ? fill(copy.plan.until, {date: dayLabel(plan.endsAtMillis)}) :
        plan.startsAtMillis !== null && plan.startsAtMillis > nowMillis ?
          fill(copy.plan.from, {date: dayLabel(plan.startsAtMillis)}) :
          toolsOnlyActive ? copy.plan.current : undefined;
  const fee = prices ? rupees(view.amountDueMinor ?? prices.toolsOnlyFeeMinor) : "";
  return (
    <CatchSection container="tile" dividers="between" title={copy.plan.title}>
      <CatchIndexRow density="regular" title={copy.plan.ticketing} subtitle={ticketingBody}
        status={!toolsOnlyActive && plan.status !== "pendingPayment" ? copy.plan.current : undefined}
        statusTone="secondary" wrap />
      <CatchIndexRow density="regular" title={copy.plan.toolsOnly} subtitle={toolsBody}
        status={toolsStatus} statusTone={plan.status === "pendingPayment" ? "warning" : "secondary"} wrap />
      {prices ? <CatchText as="p" tone="secondary" variant="body-small">
        {prices.gstRegistered ? copy.plan.gstOn : copy.plan.gstOff}
      </CatchText> : null}
      {actions.canBuy ? <CatchStack gap={8}>
        <CatchText as="p" tone="secondary" variant="body-small">{fill(copy.plan.buyBody, {amount: fee})}</CatchText>
        <CatchButton label={copy.plan.buy} onPressed={acting ? undefined : props.buyToolsOnly} size="md" variant="primary" />
      </CatchStack> : null}
      {actions.canPay && view.paymentUrl ? <CatchButton label={fill(copy.plan.pay, {amount: fee})}
        onPressed={() => props.openPayment(view.paymentUrl!)} size="md" variant="primary" /> : null}
      {actions.canCancel ? <CatchButton label={plan.status === "pendingPayment" ? copy.plan.cancelPending : copy.plan.cancel}
        onPressed={acting ? undefined : props.cancelToolsOnly} size="md" variant="secondary" /> : null}
      {acting ? <CatchText as="p" role="status" tone="secondary" variant="body-small">{copy.plan.working}</CatchText> : null}
      {props.actionError ? <CatchText as="p" role="alert" tone="danger" variant="body-small">
        {props.actionError === "changed" ? copy.plan.changed : copy.plan.actionFailed}
      </CatchText> : null}
    </CatchSection>
  );
}

export function billStatus(bill: Bill, nowMillis: number): {text: string; tone: "secondary" | "warning" | "danger" | "success"} {
  if (bill.status === "sent") {
    if (bill.dueAtMillis === null) return {text: copy.bills.dueNoDate, tone: "warning"};
    return isOverdue(bill, nowMillis) ?
      {text: fill(copy.bills.overdue, {date: dayLabel(bill.dueAtMillis)}), tone: "danger"} :
      {text: fill(copy.bills.due, {date: dayLabel(bill.dueAtMillis)}), tone: "warning"};
  }
  if (bill.status === "paid") {
    return {text: bill.paidAtMillis === null ? copy.bills.paidNoDate :
      fill(copy.bills.paid, {date: dayLabel(bill.paidAtMillis)}), tone: "success"};
  }
  return {text: bill.status === "free" ? copy.bills.free : copy.bills.writtenOff, tone: "secondary"};
}

function BillsSection(props: HostBillingController) {
  const {bills, nowMillis} = props;
  return (
    <CatchSection container="tile" count={bills.length} dividers="between" title={copy.bills.title}
      empty={<CatchEmptyState message={copy.bills.empty} variant="inline" />}>
      {bills.map((bill) => {
        const status = billStatus(bill, nowMillis);
        const details = [
          fill(copy.bills.sales, {sales: rupees(bill.salesMinor)}),
          bill.toolsOnly ? copy.bills.toolsOnly : bill.capped ? copy.bills.capped : null,
          bill.refundCreditMinor ? fill(copy.bills.refundCredit, {credit: rupees(bill.refundCreditMinor)}) : null,
          bill.refundCreditCarriedMinor ?
            fill(copy.bills.refundCreditCarried, {credit: rupees(bill.refundCreditCarriedMinor)}) : null,
          bill.invoiceNumber ? fill(copy.bills.invoice, {number: bill.invoiceNumber}) : null,
          bill.gstMinor > 0 ? fill(copy.bills.gst, {gst: rupees(bill.gstMinor)}) : null,
        ].filter(Boolean).join(" · ");
        return (
          <CatchIndexRow
            action={bill.paymentUrl ? {label: fill(copy.bills.pay, {amount: rupees(bill.totalMinor)}),
              onPressed: () => props.openPayment(bill.paymentUrl!)} : undefined}
            density="regular"
            key={bill.billId}
            status={status.text}
            statusTone={status.tone}
            subtitle={details}
            title={bill.status === "free" ? billPeriod(bill) : `${billPeriod(bill)} · ${rupees(bill.totalMinor)}`}
            wrap
          />
        );
      })}
    </CatchSection>
  );
}
