import {
  CatchButton,
  CatchEmptyState,
  CatchField,
  CatchIndexRow,
  CatchMetaRow,
  CatchSection,
  type CatchMetaEntry,
} from "@catch/web-ui";
import type {TakedownDeclineReason, TakedownInfoTemplate, TakedownOutcome, TakedownRequest} from "../api/takedownRepository";
import {
  activeDeadline,
  deadlineLabel,
  takedownDeclineLabels,
  takedownInfoTemplates,
  takedownOutcomeLabels,
  takedownStatusLabels,
  takedownTypeLabels,
  verificationFacts,
} from "../controllers/takedownLabels";
import {useTakedownRequestController, type TakedownRequestController} from "../controllers/useTakedownRequestController";

const decided = ["actioned", "declined"] as const;
const open = ["received", "acknowledged", "verifying"] as const;

function requestFacts(request: TakedownRequest, now: number): CatchMetaEntry[] {
  const deadline = activeDeadline(request);
  const due = deadlineLabel(deadline.due, now);
  const target = request.target.kind === "url" ? request.target.path ?? "" :
    `${request.target.kind === "organizer" ? "Organiser" : "Event"} · ${request.target.id ?? ""}`;
  return [
    {label: "Request", value: takedownTypeLabels[request.requestType]},
    {label: "Where it is", value: takedownStatusLabels[request.status]},
    {label: deadline.label, value: due?.text ?? "—", ...(due?.tone ? {tone: due.tone} : {})},
    {label: "Reference", value: request.reference},
    {label: "Page", value: target},
    {label: "From", value: [request.requester.name, request.requester.organisation].filter(Boolean).join(" · ")},
    {label: "Reply to", value: request.requester.email, href: `mailto:${request.requester.email}`},
    ...(request.requester.phone ? [{label: "Phone", value: request.requester.phone}] : []),
    ...verificationFacts(request),
    {label: "Declared", value: Object.keys(request.declarations).join(", ")},
    ...(request.context ? [{label: "Their note", value: request.context, wide: true}] : []),
    ...(request.caseId ? [{label: "Takedown case", value: request.caseId}] : []),
    ...(request.outcome ? [{label: "Outcome", value: takedownOutcomeLabels[request.outcome]}] : []),
    ...(request.declineReason ? [{label: "Declined because", value: takedownDeclineLabels[request.declineReason]}] : []),
  ];
}

function Deadlines({request, now}: {request: TakedownRequest; now: number}) {
  const rows = [
    {title: "Acknowledge", due: request.ackDueAt, done: request.acknowledgedAt},
    ...(request.actionDueAt ? [{title: "Interim step", due: request.actionDueAt, done: request.decidedAt}] : []),
    {title: "Resolve", due: request.resolveDueAt, done: request.decidedAt},
  ];
  return (
    <CatchSection title="Deadlines" dividers="between">
      {rows.map((row) => {
        const due = row.done ? null : deadlineLabel(row.due, now);
        return <CatchIndexRow key={row.title} subtitle={row.done ? "Done" : due?.text} title={row.title} />;
      })}
    </CatchSection>
  );
}

/** The fixed steps open at this status. Only admins and the owner decide. */
function Steps({controller, request}: {controller: TakedownRequestController; request: TakedownRequest}) {
  const detail = controller.detail!;
  const isOpen = (open as readonly string[]).includes(request.status);
  const isDecided = (decided as readonly string[]).includes(request.status);
  const note = <CatchField maxLength={500} onChanged={controller.setNote} recipe="input" title="Note for the record (optional)" value={controller.note} />;
  return (
    <CatchSection title="Next step" dividers="none">
      {request.status === "received" ? (
        <CatchButton status={controller.busy ? "loading" : "idle"} label="Acknowledge" onPressed={controller.acknowledge} />
      ) : null}
      {isOpen ? (
        <>
          <CatchField<TakedownInfoTemplate> hintText="Choose a message" itemLabelBuilder={(template) => takedownInfoTemplates[template].label}
            onChanged={controller.setInfoTemplate} recipe="select" title="Ask for more"
            helperText={controller.infoTemplate ? takedownInfoTemplates[controller.infoTemplate].message : "Staff send it by email; nothing is sent for you."}
            value={controller.infoTemplate} values={Object.keys(takedownInfoTemplates) as TakedownInfoTemplate[]} />
          <CatchButton label="Record that we asked" onPressed={controller.requestInfo} variant="secondary" />
        </>
      ) : null}
      {isOpen && controller.suspendOrganizer ? (
        <CatchButton label="Suspend the organiser page" onPressed={controller.suspendOrganizer} variant="secondary" />
      ) : null}
      {isOpen && detail.canDecide ? (
        <>
          <CatchField<TakedownOutcome> hintText="Choose the outcome" itemLabelBuilder={(outcome) => takedownOutcomeLabels[outcome]}
            onChanged={controller.setOutcome} recipe="select" title="Action it" value={controller.outcome} values={detail.allowedOutcomes} />
          {controller.caseNeeded ? (
            <CatchField errorText={controller.caseIdError} helperText="The case id the organiser takedown tool ran under."
              inputHint="TD-0001" onChanged={controller.setCaseId} recipe="input" title="Takedown case id" value={controller.caseId} />
          ) : null}
          <CatchButton status={controller.busy ? "loading" : "idle"} label="Action it" onPressed={controller.action} />
          <CatchField<TakedownDeclineReason> hintText="Choose the reason" itemLabelBuilder={(reason) => takedownDeclineLabels[reason]}
            onChanged={controller.setDeclineReason} recipe="select" title="Decline it" value={controller.declineReason}
            values={Object.keys(takedownDeclineLabels) as TakedownDeclineReason[]} />
          <CatchButton label="Decline" onPressed={controller.decline} variant="secondary" />
        </>
      ) : null}
      {isDecided ? (
        <>
          {request.appeal ? null : <CatchButton label="Record their appeal" onPressed={controller.recordAppeal} variant="secondary" />}
          <CatchButton label="Close" onPressed={controller.close} />
        </>
      ) : null}
      {request.status === "appealed" ? (
        detail.canDecideAppeal ? (
          <>
            <CatchButton status={controller.busy ? "loading" : "idle"} label="Decision stands" onPressed={() => controller.decideAppeal("upheld")} />
            <CatchButton label="Overturn and decide again" onPressed={() => controller.decideAppeal("overturned")} variant="secondary" />
          </>
        ) : <CatchEmptyState message="Someone other than the decider decides the appeal." title="Waiting for a second reviewer" />
      ) : null}
      {request.status !== "closed" ? note : null}
    </CatchSection>
  );
}

/**
 * A listing request beside the Inbox queue: what was asked, who asked, the
 * type's verification fields, the deadlines, and the fixed steps open now.
 * Replies go by email; each step records what was done.
 */
export function TakedownRequestWorkspace({requestId, onError, onNotice, onChanged, now = Date.now()}: {
  requestId: string;
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
  onChanged?: () => void;
  now?: number;
}) {
  const controller = useTakedownRequestController({requestId, onError, onNotice, onChanged});
  if (controller.failed) return <CatchEmptyState message="Try again in a moment." title="This request could not be loaded" />;
  const request = controller.detail?.request;
  if (!request) return null;
  return (
    <>
      <CatchMetaRow columns={2} entries={requestFacts(request, now)} />
      <Deadlines now={now} request={request} />
      <Steps controller={controller} request={request} />
    </>
  );
}
