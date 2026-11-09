import {
  CatchButton,
  CatchEmptyState,
  CatchIndexRow,
  CatchLoadingIndicator,
  CatchPageBody,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchRoot,
  CatchSection,
  CatchStack,
  CatchText,
} from "@catch/web-ui";
import {interpolateContent as fill} from "@content/interpolate";
import {hostBillingCopy as copy} from "../../content/hostBilling";
import {publicSiteCopy, siteFooterLegalLinks} from "../../content/site";
import {PublicPageFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
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

const titleId = "host-billing-title";

export function HostBillingPage() {
  return <HostBillingView {...useHostBillingController()} />;
}

/**
 * /host/billing/: the organizer owner's billing on the web, the only place
 * Catch's prices, paying bills and choosing the tools-only plan appear (the
 * native Host app shows status only). Signed out it offers the phone-code
 * sign-in; the page is private and out of search.
 */
export function HostBillingView(props: HostBillingController) {
  const {phase} = props;
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader />
      <WebsitePageMain aria-labelledby={titleId} id="host-billing">
        <CatchPageBody gutter={false} pb="s0" pt="s4">
          <CatchPaneLayout
            main={
              <CatchStack gap={24}>
                <CatchStack gap={4}>
                  <CatchText as="h1" id={titleId} variant="page-title">{copy.title}</CatchText>
                  <CatchText tone="secondary" variant="body">{copy.subtitle}</CatchText>
                </CatchStack>
                {phase === "loading" ? <CatchStack align="center" gap={8} role="status">
                  <CatchLoadingIndicator />
                  <CatchText tone="secondary" variant="body-small">{copy.loading}</CatchText>
                </CatchStack> : null}
                {phase === "signedOut" ? <CatchEmptyState
                  actions={<SignInButton label={copy.signedOut.action} size="md" variant="primary" />}
                  message={copy.signedOut.message} title={copy.signedOut.title} /> : null}
                {phase === "noOrganizers" ? <CatchEmptyState message={copy.noOrganizers.message}
                  title={copy.noOrganizers.title} /> : null}
                {phase === "notOwner" ? <CatchEmptyState message={copy.notOwner} /> : null}
                {phase === "failed" ? <CatchEmptyState
                  actions={<CatchButton label={copy.retry} onPressed={props.refresh} size="md" variant="secondary" />}
                  message={copy.failed} /> : null}
                {props.organizers.length > 1 && props.organizerId ? <CatchPageTabBar
                  label={copy.organizer} onChanged={props.selectOrganizer} selected={props.organizerId} size="sm"
                  options={props.organizers.map((item) => ({value: item.organizerId, label: item.organizerName}))} /> : null}
                {phase === "ready" ? <BillingSections {...props} /> : null}
              </CatchStack>
            }
            pattern="reading"
          />
        </CatchPageBody>
      </WebsitePageMain>
      <CatchPageBody constrainToContentWidth pb="s8" pt="s6">
        <PublicPageFooter links={[...publicSiteCopy.nav, ...siteFooterLegalLinks]} note={publicSiteCopy.footerOperator} />
      </CatchPageBody>
    </CatchRoot>
  );
}

function BillingSections(props: HostBillingController) {
  return (
    <CatchStack gap={32}>
      {props.trial ? <TrialSection trial={props.trial} /> : null}
      {props.planView ? <PlanSection {...props} view={props.planView} /> : null}
      <BillsSection {...props} />
    </CatchStack>
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
    <CatchSection count={bills.length} dividers="between" title={copy.bills.title}
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
