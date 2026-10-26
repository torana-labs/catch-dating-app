import {CatchBadge, CatchField} from "@catch/web-ui";
import {
  CheckCircle2,
  CircleDollarSign,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import {
  AdminButton,
  AdminTagList,
  AdminToolbar,
  AdminWorkbenchStack,
  AlertRow,
  Panel,
  QualityList,
  selectOptions,
  StateRow,
} from "../../../shared/ui/AdminPrimitives";
import type {
  MessagingBudgetController,
  MessagingBudgetPurpose,
  MessagingBudgetRoute,
} from "../controllers/useMessagingBudgetController";

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

const decisionOptions = [
  {label: "Hold for more evidence", value: "hold"},
  {label: "Approve ceilings", value: "approve"},
  {label: "Reject proposal", value: "reject"},
];

export function renderMessagingBudgetPanel(controller: MessagingBudgetController) {
  const review = controller.reviewResult?.review ?? null;
  const decision = controller.reviewResult?.decision ?? null;
  return (
    <Panel
      span={2}
      icon={<MessageSquareText size={18} strokeWidth={1.9} />}
      title="Event messaging budget"
      action="Finance-controlled"
    >
      <AdminWorkbenchStack compact>
        <AlertRow
          icon={<ShieldCheck size={16} strokeWidth={1.9} />}
          title="Review and staging only"
          tone="neutral"
        >
          This workflow can record a decision and stage paused ceilings. It
          cannot spend, send a message, contact a provider, or activate a worker.
        </AlertRow>
        <AdminToolbar>
          <CatchField
            recipe="input"
            title="Organizer ID"
            onChanged={(value) => controller.setScope("organizerId", value)}
            value={controller.scope.organizerId}
          />
          <CatchField
            recipe="input"
            title="Event ID"
            onChanged={(value) => controller.setScope("eventId", value)}
            value={controller.scope.eventId}
          />
          <CatchField
            recipe="select"
            title="Route"
            onChanged={(value) => controller.setScope(
              "routeId",
              (value ?? "") as MessagingBudgetRoute
            )}
            {...selectOptions(routeOptions)}
            value={controller.scope.routeId}
          />
          <CatchField
            recipe="input"
            title="Sender ID"
            onChanged={(value) => controller.setScope("senderId", value)}
            value={controller.scope.senderId}
          />
          <CatchField
            recipe="select"
            title="Message purpose"
            onChanged={(value) => controller.setScope(
              "purpose",
              (value ?? "") as MessagingBudgetPurpose
            )}
            {...selectOptions(purposeOptions)}
            value={controller.scope.purpose}
          />
          <AdminButton
            disabled={controller.isReviewing}
            loading={controller.isReviewing}
            loadingLabel="Reviewing"
            onClick={() => void controller.review()}
            variant="primary"
          >
            Review current setup
          </AdminButton>
        </AdminToolbar>

        {review ? (
          <>
            <QualityList>
              <StateRow label="Runtime" value={runtimeLabel(review.runtime)} />
              <StateRow
                label="Sender"
                value={review.sender ?
                  `${review.sender.displayName} · ${review.sender.availability}` :
                  "Unavailable"}
              />
              <StateRow
                label="Budget evidence"
                value={review.budgets.kind === "reviewed" ?
                  `${review.budgets.currency} · ${budgetLabel(review.budgets.event)} event · ${budgetLabel(review.budgets.senderDay)} sender-day` :
                  "Sender unavailable"}
              />
              <StateRow
                label="Current decision"
                value={decision ?
                  `${decision.decisionStatus} · revision ${decision.revision}` :
                  "No decision recorded"}
              />
            </QualityList>
            <AdminTagList>
              <CatchBadge label="No spending authority" />
              <CatchBadge label="No dispatch authority" />
              <CatchBadge label="Revision-fenced" />
            </AdminTagList>
            <AdminToolbar>
              <CatchField
                recipe="select"
                title="Finance decision"
                onChanged={(value) => controller.setDecisionKind(
                  (value ?? "") as MessagingBudgetController["decisionKind"]
                )}
                {...selectOptions(decisionOptions)}
                value={controller.decisionKind}
              />
              {controller.decisionKind === "approve" ? (
                <>
                  <CatchField
                    recipe="input"
                    title={`Event ceiling (${review.budgets.kind === "reviewed" ? review.budgets.currency : "currency"})`}
                    onChanged={controller.setEventLimit}
                    inputHint="250.00"
                    value={controller.eventLimit}
                    keyboardType="decimal"
                  />
                  <CatchField
                    recipe="input"
                    title={`Sender-day ceiling (${review.budgets.kind === "reviewed" ? review.budgets.currency : "currency"})`}
                    onChanged={controller.setSenderDayLimit}
                    inputHint="500.00"
                    value={controller.senderDayLimit}
                    keyboardType="decimal"
                  />
                  <CatchField
                    recipe="input"
                    title="Approval expires"
                    onChanged={controller.setValidUntil}
                    value={controller.validUntil}
                    keyboardType="datetime"
                  />
                </>
              ) : null}
            </AdminToolbar>
            <CatchField
              recipe="input"
              title="Finance review note"
              onChanged={controller.setDecisionNote}
              maxLines={3}
              value={controller.decisionNote}
            />
            {controller.decisionDisabledReason ? (
              <AlertRow
                icon={<CircleDollarSign size={16} strokeWidth={1.9} />}
                title="Decision not ready"
                tone="warning"
              >
                {controller.decisionDisabledReason}
              </AlertRow>
            ) : null}
            <AdminButton
              disabled={Boolean(controller.decisionDisabledReason) || controller.isDeciding}
              loading={controller.isDeciding}
              loadingLabel="Recording"
              onClick={() => void controller.decide()}
              variant="primary"
            >
              Record finance decision
            </AdminButton>
          </>
        ) : null}

        {decision?.decisionStatus === "approved" ? (
          <Panel
            icon={<CheckCircle2 size={17} strokeWidth={1.9} />}
            title="Stage approved ceilings"
            action={`Revision ${decision.revision}`}
          >
            <AdminWorkbenchStack compact>
              <CatchField
                recipe="input"
                title="Staging note"
                onChanged={controller.setStagingNote}
                maxLines={2}
                value={controller.stagingNote}
              />
              {controller.stageDisabledReason ? (
                <AlertRow
                  icon={<ShieldCheck size={16} strokeWidth={1.9} />}
                  title="Staging not ready"
                  tone="warning"
                >
                  {controller.stageDisabledReason}
                </AlertRow>
              ) : null}
              <AdminButton
                disabled={Boolean(controller.stageDisabledReason) || controller.isStaging}
                loading={controller.isStaging}
                loadingLabel="Staging"
                onClick={() => void controller.stage()}
                variant="primary"
              >
                Stage paused ceilings
              </AdminButton>
            </AdminWorkbenchStack>
          </Panel>
        ) : null}

        {controller.stagedResult ? (
          <AlertRow
            icon={<CheckCircle2 size={16} strokeWidth={1.9} />}
            title="Ceilings staged in paused status"
            tone="success"
          >
            Event and sender-day revisions were recorded. The provider was not
            contacted, the worker remains inactive, and dispatch remains blocked.
          </AlertRow>
        ) : null}
      </AdminWorkbenchStack>
    </Panel>
  );
}

function runtimeLabel(runtime: NonNullable<
  MessagingBudgetController["reviewResult"]
>["review"]["runtime"]): string {
  const selection = runtime.appliesToPurpose ?
    runtime.selected ? "selected" : "not selected" : "not required";
  return `${runtime.status} · ${selection} · revision ${runtime.revision ?? "none"}`;
}

function budgetLabel(budget: {
  kind: "unavailable";
  reason: "missing" | "invalid";
} | {
  kind: "recorded";
  issue: string | null;
  revision: number;
}): string {
  return budget.kind === "unavailable" ? budget.reason :
    `${budget.issue ?? "ready"} (r${budget.revision})`;
}
