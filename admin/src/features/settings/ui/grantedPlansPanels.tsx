import {
  CatchButton,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchSection,
  CatchText,
  CatchWorkspaceHeader,
} from "@catch/web-ui";
import type {
  MessagingBudgetController,
  MessagingBudgetPurpose,
  MessagingBudgetRoute,
} from "../controllers/useMessagingBudgetController";
import type {
  OrganizerEntitlementController,
  OrganizerEntitlementSku,
  OrganizerEntitlementSource,
  OrganizerEntitlementUnit,
} from "../controllers/useOrganizerEntitlementController";

type Grant = NonNullable<OrganizerEntitlementController["entitlement"]>["grants"][number];
type SkuCatalog = NonNullable<OrganizerEntitlementController["entitlement"]>["skuCatalog"];

const skuValues: OrganizerEntitlementSku[] = [
  "wedding_essentials", "wedding_pro", "wedding_signature", "wedding_transport_addon", "planner_annual",
];
const unitOptions: Array<{label: string; value: OrganizerEntitlementUnit}> = [
  {label: "Per program", value: "program"},
  {label: "Per organizer year", value: "organizerYear"},
];
const sourceOptions: Array<{label: string; value: OrganizerEntitlementSource}> = [
  {label: "Manual invoice", value: "manualInvoice"},
  {label: "Checkout", value: "checkout"},
  {label: "Promotion", value: "promo"},
];
const routeOptions: Array<{label: string; value: MessagingBudgetRoute}> = [
  {label: "Catch SMS", value: "catchEventSms"},
  {label: "Catch RCS", value: "catchEventRcs"},
  {label: "Organizer WhatsApp", value: "organizerEventWhatsapp"},
];
const purposeOptions: Array<{label: string; value: MessagingBudgetPurpose}> = [
  {label: "Joining update", value: "joiningUpdate"},
  {label: "Joining instructions", value: "joiningInstructions"},
  {label: "Plan changed", value: "planChanged"},
  {label: "Event cancelled", value: "eventCancelled"},
  {label: "Event finished", value: "eventFinished"},
  {label: "Guest requirement", value: "guestRequirement"},
  {label: "Assignment changed", value: "assignmentChanged"},
  {label: "Participation check", value: "participationCheck"},
  {label: "Follow-up", value: "followUp"},
];
const decisionOptions: Array<{label: string; value: MessagingBudgetController["decisionKind"]}> = [
  {label: "Hold for more evidence", value: "hold"},
  {label: "Approve ceilings", value: "approve"},
  {label: "Reject proposal", value: "reject"},
];

const count = new Intl.NumberFormat("en-IN");
const day = new Intl.DateTimeFormat("en-IN", {dateStyle: "medium"});

function Select<T extends string>({title, value, options, onChanged}: {
  title: string;
  value: T;
  options: ReadonlyArray<{label: string; value: T}>;
  onChanged: (value: T) => void;
}) {
  return (
    <CatchField
      itemLabelBuilder={(option) => options.find((entry) => entry.value === option)?.label ?? option}
      onChanged={(next) => onChanged((next ?? options[0]!.value) as T)}
      recipe="select"
      title={title}
      value={value}
      values={options.map((option) => option.value)}
    />
  );
}

function Fact({title, value}: {title: string; value: string}) {
  return <CatchIndexRow subtitle={value} title={title} titleVariant="titleS" />;
}

function Warning({children}: {children: string}) {
  return <CatchText as="p" color="attentionText" variant="bodyS">{children}</CatchText>;
}

function grantStatus(grant: Grant): string {
  if (grant.revoked) return "Revoked";
  if (grant.active) return "Active";
  if (grant.quantityRemaining <= 0) return "Used up";
  if (grant.validFromMillis > Date.now()) return "Scheduled";
  return "Inactive";
}

function grantWindow(grant: Grant): string {
  return `${day.format(grant.validFromMillis)} to ${grant.validUntilMillis === null ? "open" : day.format(grant.validUntilMillis)}`;
}

function priceLabel(sku: SkuCatalog[string]): string {
  return sku.priceMinor === null ? "Quote only" : `${sku.currency} ${count.format(Math.round(sku.priceMinor / 100))}`;
}

function limitLabel(sku: SkuCatalog[string]): string {
  const parts: Array<[string, number | null]> = [
    ["guests", sku.limits.guests], ["functions", sku.limits.functions],
    ["staff", sku.limits.staffAssignments], ["moments a function", sku.limits.momentsPerFunction],
  ];
  return parts.map(([label, value]) => `${value === null ? "unlimited" : count.format(value)} ${label}`).join(" · ");
}

function back(onDone: () => void) {
  return {label: "Back to Payments", onPressed: onDone};
}

/** Plans granted by hand: load an organizer's ledger, grant a plan against an invoice, revoke one. */
export function renderPlansEditor(controller: OrganizerEntitlementController, onDone: () => void) {
  return <PlansEditor controller={controller} onDone={onDone} />;
}

function PlansEditor({controller, onDone}: {controller: OrganizerEntitlementController; onDone: () => void}) {
  const entitlement = controller.entitlement;
  const catalog = entitlement?.skuCatalog ?? null;
  const sku = catalog?.[controller.grantForm.sku] ?? null;
  const revoking = entitlement?.grants.find((grant) => grant.grantId === controller.revokeTargetGrantId) ?? null;
  return (
    <>
      <CatchWorkspaceHeader back={back(onDone)} kicker="Settings · Payments" title="Plans granted by hand" />
      <CatchGap size="section">
        <CatchText as="p" color="ink2" variant="bodyM">
          A grant records an invoice that was settled outside checkout. It cannot bill, refund, collect a payment or contact a provider.
        </CatchText>
        <CatchGap crossAxisAlignment="end" direction="horizontal" size="related">
          <CatchField onChanged={controller.setOrganizerId} recipe="input" title="Organizer ID" value={controller.organizerId} />
          <CatchButton label={controller.isLoading ? "Loading" : "Load"} onPressed={controller.isLoading ? null : () => void controller.load()} size="sm" variant="secondary" />
        </CatchGap>
        {entitlement ? (
          <CatchSection count={entitlement.grants.length} note={`ledger revision ${entitlement.revision}`} title="Their plans">
            <Fact title="Used so far" value={`${count.format(entitlement.meters.flightDaysUsed)} flight days · ${count.format(entitlement.meters.waConversationsUsed)} WhatsApp conversations`} />
            {entitlement.grants.length === 0 ? <CatchText as="p" color="ink2" variant="bodyS">No plan has been granted to this organizer.</CatchText> : null}
            {entitlement.grants.map((grant) => (
              <CatchIndexRow
                key={grant.grantId}
                subtitle={`${grantStatus(grant)} · ${count.format(grant.quantityRemaining)} of ${count.format(grant.quantityTotal)} left · ${grantWindow(grant)}`}
                title={grant.skuLabel}
                titleVariant="titleS"
                trailing={grant.revoked ? undefined : (
                  <CatchButton label="Revoke" onPressed={() => controller.setRevokeTargetGrantId(grant.grantId)} size="sm" variant="secondary" />
                )}
              />
            ))}
          </CatchSection>
        ) : null}
        {revoking || controller.pendingRevoke ? (
          <CatchSection title={revoking ? `Revoke ${revoking.skuLabel}` : "Finish a revocation"}>
            {controller.pendingRevoke ? (
              <Warning>{`Catch did not confirm the revocation of ${controller.pendingRevoke.grantId}. Retrying sends the same request with operation ${controller.pendingRevoke.operationId}; load the ledger to check it.`}</Warning>
            ) : null}
            <CatchField maxLines={2} onChanged={controller.setRevokeReason} recipe="input" title="Why" value={controller.revokeReason} />
            {controller.revokeDisabledReason ? <Warning>{controller.revokeDisabledReason}</Warning> : null}
            <CatchGap direction="horizontal" size="related" wrap>
              <CatchButton
                label={controller.isRevoking ? "Revoking" : controller.pendingRevoke ? "Retry the revocation" : "Revoke"}
                onPressed={controller.revokeDisabledReason || controller.isRevoking ? null : () => void controller.revoke()}
                size="sm"
              />
              <CatchButton label="Keep it" onPressed={() => controller.setRevokeTargetGrantId(null)} size="sm" variant="secondary" />
            </CatchGap>
          </CatchSection>
        ) : null}
        <CatchSection title="Grant a plan">
          {controller.pendingGrant ? (
            <Warning>{`Catch did not confirm the ${controller.pendingGrant.sku} grant for ${controller.pendingGrant.organizerId}. Retrying sends the same request with operation ${controller.pendingGrant.operationId}; the form can't change until it is confirmed.`}</Warning>
          ) : null}
          <Select
            onChanged={(value) => controller.setGrantField("sku", value)}
            options={skuValues.map((value) => ({value, label: catalog?.[value]?.label ?? value}))}
            title="Plan"
            value={controller.grantForm.sku}
          />
          {sku ? <Fact title={`${sku.label} · ${priceLabel(sku)}`} value={`${limitLabel(sku)} · includes ${count.format(sku.includedFlightDays)} flight days and ${count.format(sku.includedWaConversations)} WhatsApp conversations`} /> : null}
          <Select onChanged={(value) => controller.setGrantField("unit", value)} options={unitOptions} title="Unit" value={controller.grantForm.unit} />
          <CatchField keyboardType="number" onChanged={(value) => controller.setGrantField("quantity", value)} recipe="input" title="Quantity" value={controller.grantForm.quantity} />
          <CatchField keyboardType="datetime" onChanged={(value) => controller.setGrantField("validFrom", value)} recipe="input" title="Valid from (optional)" value={controller.grantForm.validFrom} />
          <CatchField keyboardType="datetime" onChanged={(value) => controller.setGrantField("validUntil", value)} recipe="input" title="Valid until (optional)" value={controller.grantForm.validUntil} />
          <Select onChanged={(value) => controller.setGrantField("source", value)} options={sourceOptions} title="Paid by" value={controller.grantForm.source} />
          <CatchField inputHint="2026-27/004" onChanged={(value) => controller.setGrantField("receiptRef", value)} recipe="input" title="Invoice number" value={controller.grantForm.receiptRef} />
          <CatchField maxLines={2} onChanged={(value) => controller.setGrantField("note", value)} recipe="input" title="Note" value={controller.grantForm.note} />
          {controller.grantDisabledReason ? <Warning>{controller.grantDisabledReason}</Warning> : null}
          <CatchButton
            label={controller.isGranting ? "Recording" : controller.pendingGrant ? "Retry the grant" : "Grant the plan"}
            onPressed={controller.grantDisabledReason || controller.isGranting ? null : () => void controller.grant()}
            size="sm"
          />
        </CatchSection>
      </CatchGap>
    </>
  );
}

/** One event's messaging budget: review the setup, record a decision, stage approved ceilings. */
export function renderMessagingBudgetEditor(controller: MessagingBudgetController, onDone: () => void) {
  return <MessagingBudgetEditor controller={controller} onDone={onDone} />;
}

function MessagingBudgetEditor({controller, onDone}: {controller: MessagingBudgetController; onDone: () => void}) {
  const review = controller.reviewResult?.review ?? null;
  const decision = controller.reviewResult?.decision ?? null;
  const currency = review?.budgets.kind === "reviewed" ? review.budgets.currency : "currency";
  return (
    <>
      <CatchWorkspaceHeader back={back(onDone)} kicker="Settings · Payments" title="Messaging budgets" />
      <CatchGap size="section">
        <CatchText as="p" color="ink2" variant="bodyM">
          Review one event's messaging setup, record a decision and stage paused ceilings. Nothing here spends, sends a message, contacts a provider or starts a worker.
        </CatchText>
        <CatchSection title="Which event">
          <CatchField onChanged={(value) => controller.setScope("organizerId", value)} recipe="input" title="Organizer ID" value={controller.scope.organizerId} />
          <CatchField onChanged={(value) => controller.setScope("eventId", value)} recipe="input" title="Event ID" value={controller.scope.eventId} />
          <Select onChanged={(value) => controller.setScope("routeId", value)} options={routeOptions} title="Route" value={controller.scope.routeId} />
          <CatchField onChanged={(value) => controller.setScope("senderId", value)} recipe="input" title="Sender ID" value={controller.scope.senderId} />
          <Select onChanged={(value) => controller.setScope("purpose", value)} options={purposeOptions} title="Message purpose" value={controller.scope.purpose} />
          <CatchButton label={controller.isReviewing ? "Reviewing" : "Review the setup"} onPressed={controller.isReviewing ? null : () => void controller.review()} size="sm" />
        </CatchSection>
        {review ? (
          <CatchSection title="What is set up">
            <Fact
              title="Runtime"
              value={`${review.runtime.status} · ${review.runtime.appliesToPurpose ? review.runtime.selected ? "selected" : "not selected" : "not required"} · revision ${review.runtime.revision ?? "none"}`}
            />
            <Fact title="Sender" value={review.sender ? `${review.sender.displayName} · ${review.sender.availability}` : "Unavailable"} />
            <Fact
              title="Budgets"
              value={review.budgets.kind === "reviewed" ? `${review.budgets.currency} · event ${budgetLabel(review.budgets.event)} · sender day ${budgetLabel(review.budgets.senderDay)}` : "Sender unavailable"}
            />
            <Fact title="Decision so far" value={decision ? `${decision.decisionStatus} · revision ${decision.revision}` : "None recorded"} />
          </CatchSection>
        ) : null}
        {review ? (
          <CatchSection title="Decide">
            <Select onChanged={controller.setDecisionKind} options={decisionOptions} title="Decision" value={controller.decisionKind} />
            {controller.decisionKind === "approve" ? (
              <>
                <CatchField inputHint="250.00" keyboardType="decimal" onChanged={controller.setEventLimit} recipe="input" title={`Event ceiling (${currency})`} value={controller.eventLimit} />
                <CatchField inputHint="500.00" keyboardType="decimal" onChanged={controller.setSenderDayLimit} recipe="input" title={`Sender-day ceiling (${currency})`} value={controller.senderDayLimit} />
                <CatchField keyboardType="datetime" onChanged={controller.setValidUntil} recipe="input" title="Approval expires" value={controller.validUntil} />
              </>
            ) : null}
            <CatchField maxLines={3} onChanged={controller.setDecisionNote} recipe="input" title="Note" value={controller.decisionNote} />
            {controller.decisionDisabledReason ? <Warning>{controller.decisionDisabledReason}</Warning> : null}
            <CatchButton
              label={controller.isDeciding ? "Recording" : "Record the decision"}
              onPressed={controller.decisionDisabledReason || controller.isDeciding ? null : () => void controller.decide()}
              size="sm"
            />
          </CatchSection>
        ) : null}
        {decision?.decisionStatus === "approved" ? (
          <CatchSection note={`revision ${decision.revision}`} title="Stage the approved ceilings">
            <CatchField maxLines={2} onChanged={controller.setStagingNote} recipe="input" title="Note" value={controller.stagingNote} />
            {controller.stageDisabledReason ? <Warning>{controller.stageDisabledReason}</Warning> : null}
            <CatchButton
              label={controller.isStaging ? "Staging" : "Stage paused ceilings"}
              onPressed={controller.stageDisabledReason || controller.isStaging ? null : () => void controller.stage()}
              size="sm"
            />
          </CatchSection>
        ) : null}
        {controller.stagedResult ? (
          <CatchText as="p" color="positiveText" variant="bodyS">
            The ceilings are staged and paused. The provider was not contacted, the worker stays inactive and nothing is sent.
          </CatchText>
        ) : null}
      </CatchGap>
    </>
  );
}

function budgetLabel(budget: {kind: "unavailable"; reason: "missing" | "invalid"} | {kind: "recorded"; issue: string | null; revision: number}): string {
  return budget.kind === "unavailable" ? budget.reason : `${budget.issue ?? "ready"} (revision ${budget.revision})`;
}
