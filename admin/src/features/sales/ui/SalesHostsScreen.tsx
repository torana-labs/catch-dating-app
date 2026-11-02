import {
  CatchBadge,
  CatchButton,
  CatchCheckboxInput,
  CatchEmptyState,
  CatchField,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchSection,
  CatchSheet,
  CatchTable,
  CatchText,
  CatchWorkspaceHeader,
  type CatchTableColumn,
} from "@catch/web-ui";
import {useState, type ReactNode} from "react";
import type {
  SalesAccountDetail,
  SalesContact,
  SalesEvidence,
  SalesEvidenceProposal,
  SalesHoldStatus,
  SalesOpportunity,
  SalesResearchStatus,
  SalesTaskKind,
} from "../api/salesTypes";
import {
  contactReviewLabels,
  decisionInfluences,
  dueLabel,
  evidenceClaimLabels,
  evidenceConfidenceLabels,
  evidenceSourceLabels,
  holdLabels,
  hostActivityTypes,
  isoFrom,
  localInput,
  movableStages,
  researchLabels,
  stageLabel,
  taskKindLabels,
} from "../controllers/salesLabels";
import type {HostTab, SalesHostsController} from "../controllers/useSalesHostsController";
import {SalesHostCommercialWorkspace, type SalesHostCommercialModel} from "./SalesHostCommercialWorkspace";

export type SalesHostsModel = Pick<SalesHostsController,
  "query" | "setQuery" | "rows" | "hasNextPage" | "hasPreviousPage" | "nextPage" | "previousPage" | "tab" | "setTab" |
  "contacts" | "logActivity" | "addNextStep" | "completeNextStep" | "saveDeal" | "saveHost" | "addPerson" | "canEditResearch" | "isSaving" |
  "evidence" | "evidenceFailed" | "retryEvidence" | "hasMoreEvidence" | "moreEvidence" | "addEvidence" | "suggestions" | "suggestionsFailed" |
  "retrySuggestions" | "hasMoreSuggestions" | "moreSuggestions" | "reviewSuggestion" | "setHold" |
  "contactsFailed" | "retryContacts" | "hasMoreContacts" | "moreContacts" | "reviewContact"> & {
  /** Who "Assign to me" means. */
  uid: string | null;
  host: SalesAccountDetail | null;
  /** A deal's pilot, quote and payment; null for a sales associate, who doesn't see these. */
  commercial: SalesHostCommercialModel | null;
  isAdminOwner: boolean;
  /** The partner-offer row, with its own controller; null for a sales associate. */
  renderPartnerOffer: ((organizerId: string, organizerName: string) => ReactNode) | null;
};

interface Row {
  key: string;
  host: {title: string; subtitle?: string};
  research: {text: string; tone?: "success" | "warning"};
  stage: string;
  next: string;
}

const columns: CatchTableColumn<Row>[] = [
  {key: "host", label: "Host", kind: "title"},
  {key: "research", label: "Research", width: "170px"},
  {key: "stage", label: "Stage", width: "150px"},
  {key: "next", label: "Next step", width: "260px"},
];

const tabs: Array<{value: HostTab; label: string}> = [
  {value: "overview", label: "Overview"}, {value: "conversations", label: "Conversations"},
  {value: "deals", label: "Deals"}, {value: "notes", label: "Notes"},
];

const nextStepKinds: SalesTaskKind[] = ["follow_up", "reply", "demo", "pilot", "research"];

function tomorrowMorning(): string {
  const at = new Date(Date.now() + 86_400_000);
  at.setHours(10, 0, 0, 0);
  return localInput(at);
}

function LogActivitySheet({model, onClose}: {model: SalesHostsModel; onClose: () => void}) {
  const [type, setType] = useState<typeof hostActivityTypes[number]["value"]>("note");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "other">("whatsapp");
  const [note, setNote] = useState("");
  const manual = type === "outreach_sent_manual";
  const submit = async () => {
    if (await model.logActivity({type, note: note.trim(), ...(manual ? {channel, attestation: "sent_elsewhere_by_actor" as const} : {})})) onClose();
  };
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title="Log activity" subtitle="Hosts"
      footer={<CatchButton label={model.isSaving ? "Saving" : "Log it"} onPressed={note.trim() && !model.isSaving ? () => void submit() : null} />}>
      <CatchGap size="related">
        <CatchField recipe="select" title="What happened" value={type} values={hostActivityTypes.map((entry) => entry.value)}
          itemLabelBuilder={(value) => hostActivityTypes.find((entry) => entry.value === value)?.label ?? value}
          onChanged={(value) => setType((value ?? "note") as typeof type)} />
        {manual ? <CatchField recipe="select" title="Where" value={channel} values={["whatsapp", "email", "other"]}
          itemLabelBuilder={(value) => ({whatsapp: "WhatsApp", email: "Email", other: "Somewhere else"})[value] ?? value}
          helperText="You're saying you sent this outside Catch. Catch can't confirm it arrived."
          onChanged={(value) => setChannel((value ?? "whatsapp") as typeof channel)} /> : null}
        <CatchField recipe="input" title="What should the team know?" maxLines={3} value={note} onChanged={setNote} />
      </CatchGap>
    </CatchSheet>
  );
}

function NextStepSheet({model, onClose}: {model: SalesHostsModel; onClose: () => void}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<SalesTaskKind>("follow_up");
  const [due, setDue] = useState(tomorrowMorning);
  const [contactId, setContactId] = useState("");
  const dueAt = isoFrom(due);
  // Following up or arranging a demo needs someone reviewed for drafts; the server checks that again when saving.
  const outbound = kind === "follow_up" || kind === "demo";
  const reviewed = model.contacts.filter((contact) => contact.relationship.contactabilityStatus === "draft_reviewed");
  const chosen = reviewed.some((contact) => contact.contactId === contactId);
  const submit = async () => {
    if (dueAt && await model.addNextStep({kind, title: title.trim(), dueAt, ...(outbound ? {contactId} : {})})) onClose();
  };
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title="Add a next step" subtitle="Hosts"
      footer={<CatchButton label={model.isSaving ? "Saving" : "Add"} onPressed={title.trim() && dueAt && (!outbound || chosen) && !model.isSaving ? () => void submit() : null} />}>
      <CatchGap size="related">
        <CatchField recipe="input" title="What's next" value={title} onChanged={setTitle} inputHint="Send pilot terms" />
        <CatchField recipe="select" title="Kind" value={kind} values={nextStepKinds}
          itemLabelBuilder={(value) => taskKindLabels[value as SalesTaskKind] ?? value}
          onChanged={(value) => setKind((value ?? "follow_up") as SalesTaskKind)} />
        {outbound ? (reviewed.length ? (
          <CatchField recipe="select" title="With" value={contactId} values={["", ...reviewed.map((contact) => contact.contactId)]}
            itemLabelBuilder={(value) => reviewed.find((contact) => contact.contactId === value)?.displayName ?? "Choose someone"}
            helperText="Only people reviewed for drafts. This records the step; it doesn't send anything."
            onChanged={(value) => setContactId(value ?? "")} />
        ) : <CatchText as="p" variant="bodyM" role="alert">
          {model.canEditResearch ? "Nobody here is reviewed for drafts yet. Review someone under People, or choose another kind." :
            "Nobody here is reviewed for drafts yet. Ask a reviewer, or choose another kind."}</CatchText>) : null}
        <CatchField recipe="input" title="Due" value={due} onChanged={setDue} keyboardType="datetime" />
      </CatchGap>
    </CatchSheet>
  );
}

/** Moving a deal says what happens next and when. A closed deal needs a reason, closing or reopening. */
function DealSheet({model, deal, onClose}: {model: SalesHostsModel; deal: SalesOpportunity | null; onClose: () => void}) {
  const [stage, setStage] = useState(deal?.stage ?? "new_enquiry");
  const [nextStep, setNextStep] = useState(deal?.nextStep ?? "");
  const [due, setDue] = useState(deal?.nextStepAt ? localInput(new Date(deal.nextStepAt)) : tomorrowMorning());
  const [reason, setReason] = useState("");
  const nextStepAt = isoFrom(due);
  const needsReason = stage === "closed_lost" || deal?.stage === "closed_lost";
  const won = deal?.stage === "closed_won";
  const ready = !won && nextStep.trim() && nextStepAt && (!needsReason || reason.trim());
  const stages = deal && !movableStages.includes(deal.stage) ? [deal.stage, ...movableStages] : movableStages;
  const submit = async () => {
    if (await model.saveDeal(deal, {stage, nextStep: nextStep.trim(), nextStepAt, ...(needsReason ? {transitionReason: reason.trim()} : {})})) onClose();
  };
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title={deal ? "Move this deal" : "Start a deal"} subtitle="Hosts"
      footer={<CatchButton label={model.isSaving ? "Saving" : "Save"} onPressed={ready && !model.isSaving ? () => void submit() : null} />}>
      <CatchGap size="related">
        <CatchField recipe="select" title="Stage" value={stage} values={stages} itemLabelBuilder={stageLabel}
          helperText={won ? "A won deal is closed by its payment." : "Closing as won needs a recorded payment, under Payment and close."}
          onChanged={(value) => setStage(value ?? stage)} />
        <CatchField recipe="input" title="Next step" value={nextStep} onChanged={setNextStep} />
        <CatchField recipe="input" title="Due" value={due} onChanged={setDue} keyboardType="datetime" />
        {needsReason ? <CatchField recipe="input" title="Why it closed, or why it's reopening" maxLines={3} value={reason} onChanged={setReason} /> : null}
      </CatchGap>
    </CatchSheet>
  );
}

const researchStatuses = Object.keys(researchLabels) as SalesResearchStatus[];

/** Saves against the revision it opened with, so someone else's change comes back as an error, not an overwrite. */
function EditHostSheet({model, host, onClose}: {model: SalesHostsModel; host: SalesAccountDetail; onClose: () => void}) {
  const {account} = host;
  const [revision] = useState(account.revision);
  const [researchStatus, setResearchStatus] = useState(account.researchStatus);
  const [owner, setOwner] = useState(account.assignedOwnerUid ?? null);
  const [summary, setSummary] = useState(account.summary ?? "");
  const [nextAction, setNextAction] = useState(account.nextAction ?? "");
  const submit = async () => {
    if (await model.saveHost(revision, {researchStatus, assignedOwnerUid: owner, summary, nextAction})) onClose();
  };
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title="Edit host" subtitle={host.organizerSummary.name}
      footer={<CatchButton label={model.isSaving ? "Saving" : "Save"} onPressed={model.isSaving ? null : () => void submit()} />}>
      <CatchGap size="related">
        {model.canEditResearch ? <CatchField recipe="select" title="Research" value={researchStatus} values={researchStatuses}
          itemLabelBuilder={(value) => researchLabels[value as SalesResearchStatus]?.text ?? value}
          onChanged={(value) => setResearchStatus((value ?? researchStatus) as SalesResearchStatus)} /> : null}
        {model.canEditResearch && model.uid && owner !== model.uid ?
          <CatchButton label="Assign to me" variant="secondary" size="sm" onPressed={() => setOwner(model.uid)} /> : null}
        <CatchField recipe="input" title="Summary" maxLines={4} value={summary} onChanged={setSummary} />
        <CatchField recipe="input" title="Next action" value={nextAction} onChanged={setNextAction} />
      </CatchGap>
    </CatchSheet>
  );
}

/** Contact details start unverified, and adding someone never grants permission to message them. */
function AddPersonSheet({model, onClose}: {model: SalesHostsModel; onClose: () => void}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [influence, setInfluence] = useState<SalesContact["relationship"]["decisionInfluence"]>("unknown");
  const [primary, setPrimary] = useState(false);
  const [kind, setKind] = useState<"email" | "phone">("email");
  const [contact, setContact] = useState("");
  const submit = async () => {
    if (await model.addPerson({contact: {displayName: name.trim()}, relationship: {role: role.trim(), decisionInfluence: influence, primary,
      ...(contact.trim() ? {endpoints: [{kind, value: contact.trim(), verificationStatus: "unverified" as const}]} : {})}})) onClose();
  };
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title="Add a person" subtitle="Hosts"
      footer={<CatchButton label={model.isSaving ? "Saving" : "Add"} onPressed={name.trim() && role.trim() && !model.isSaving ? () => void submit() : null} />}>
      <CatchGap size="related">
        <CatchField recipe="input" title="Name" value={name} onChanged={setName} />
        <CatchField recipe="input" title="Role with the host" value={role} onChanged={setRole} inputHint="Founder" />
        <CatchField recipe="select" title="Their say" value={influence} values={decisionInfluences.map((entry) => entry.value)}
          itemLabelBuilder={(value) => decisionInfluences.find((entry) => entry.value === value)?.label ?? value}
          onChanged={(value) => setInfluence((value ?? "unknown") as typeof influence)} />
        <CatchCheckboxInput label="Our main contact here" value={primary} onChanged={setPrimary} />
        <CatchField recipe="select" title="How to reach them" value={kind} values={["email", "phone"]}
          itemLabelBuilder={(value) => value === "email" ? "Email" : "Phone"}
          onChanged={(value) => setKind((value ?? "email") as typeof kind)} />
        <CatchField recipe="input" title={kind === "email" ? "Email address" : "Phone number"} value={contact} onChanged={setContact}
          helperText="Optional. It stays unverified, and adding it doesn't mean we can message them." />
      </CatchGap>
    </CatchSheet>
  );
}

type ContactStatus = SalesContact["relationship"]["contactabilityStatus"];

/** A decision about one person. It stays bound to what the reviewer opened, so a change made meanwhile is seen first. */
function ContactReviewSheet({model, contact, onClose}: {model: SalesHostsModel; contact: SalesContact; onClose: () => void}) {
  const {relationship} = contact;
  const [openedRevision, setOpenedRevision] = useState(relationship.revision);
  const [status, setStatus] = useState<ContactStatus>(relationship.contactabilityStatus);
  const [evidenceId, setEvidenceId] = useState(relationship.draftReviewEvidenceId ?? "");
  const [reason, setReason] = useState("");
  const changed = openedRevision !== relationship.revision;
  const useLatest = () => {
    setOpenedRevision(relationship.revision);
    setStatus(relationship.contactabilityStatus);
    setEvidenceId(relationship.draftReviewEvidenceId ?? "");
    setReason("");
  };
  const about = model.evidence.filter((item) => item.contactId === contact.contactId);
  const draft = status === "draft_reviewed";
  const ready = reason.trim() && (!draft || about.some((item) => item.evidenceId === evidenceId));
  const submit = async () => {
    if (await model.reviewContact(contact, openedRevision, status, reason.trim(), draft ? evidenceId : null)) onClose();
  };
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title={`Review ${contact.displayName}`} subtitle="Contact review"
      footer={changed ? <CatchButton label="Use the latest" variant="secondary" onPressed={useLatest} /> :
        <CatchButton label={model.isSaving ? "Saving" : "Save"} onPressed={ready && !model.isSaving ? () => void submit() : null} />}>
      <CatchGap size="related">
        {changed ? <CatchText as="p" variant="bodyM" role="alert">
          This person changed since you opened this. They're now {contactReviewLabels[relationship.contactabilityStatus].text.toLowerCase()}. Check that before you decide.</CatchText> : null}
        <CatchField recipe="select" title="Status" value={status} values={keysOf(contactReviewLabels)}
          itemLabelBuilder={(value) => contactReviewLabels[value as ContactStatus].text}
          onChanged={(value) => setStatus((value ?? status) as ContactStatus)} />
        {draft ? (about.length ? (
          <CatchField recipe="select" title="Evidence about them" value={evidenceId} values={["", ...about.map((item) => item.evidenceId)]}
            itemLabelBuilder={(value) => {
              const item = about.find((entry) => entry.evidenceId === value);
              return item ? `${evidenceClaimLabels[item.claimKey]}: ${item.sourceRef}` : "Choose evidence";
            }}
            onChanged={(value) => setEvidenceId(value ?? "")} />
        ) : <CatchText as="p" variant="bodyM" role="alert">{model.hasMoreEvidence ? "No evidence about them is loaded yet." :
          "Add evidence about them on this page before reviewing them for drafts."}</CatchText>) : null}
        {draft && model.hasMoreEvidence ? <CatchButton label="Show more evidence" variant="secondary" size="sm" onPressed={model.moreEvidence} /> : null}
        <CatchField recipe="input" title="Why" maxLines={2} value={reason} onChanged={setReason}
          helperText="A review for drafts doesn't verify their details, give consent or send anything." />
      </CatchGap>
    </CatchSheet>
  );
}

type ClaimKey = SalesEvidence["claimKey"];
type SourceType = SalesEvidence["sourceType"];
type Confidence = SalesEvidence["confidence"];

const keysOf = <T extends string>(labels: Record<T, unknown>) => Object.keys(labels) as T[];
const date = (value: string) => new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short", year: "numeric"}).format(new Date(value));

/** Records what was seen and where, apart from any conclusion. Evidence is private and publishes nothing. */
function AddEvidenceSheet({model, onClose}: {model: SalesHostsModel; onClose: () => void}) {
  const [contactId, setContactId] = useState("");
  const [claimKey, setClaimKey] = useState<ClaimKey>("identity");
  const [signalId, setSignalId] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("human_note");
  const [sourceRef, setSourceRef] = useState("");
  const [observedAt, setObservedAt] = useState(() => localInput(new Date()));
  const [confidence, setConfidence] = useState<Confidence>("medium");
  const [learned, setLearned] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const observed = isoFrom(observedAt);
  const ready = sourceRef.trim().length > 0 && observed !== null && (claimKey !== "operation" || signalId.trim().length > 0);
  const submit = async () => {
    if (!ready) return;
    const saved = await model.addEvidence({contactId: contactId || null, claimKey,
      ...(claimKey === "operation" ? {signalId: signalId.trim()} : {}),
      sourceType, sourceRef: sourceRef.trim(), observedAt: observed, confidence,
      normalizedValue: learned.trim() || null, excerpt: excerpt.trim() || null});
    if (saved) onClose();
  };
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title="Add evidence" subtitle="Private to Sales"
      footer={<CatchButton label={model.isSaving ? "Saving" : "Add evidence"} onPressed={ready && !model.isSaving ? () => void submit() : null} />}>
      <CatchGap size="related">
        <CatchField recipe="select" title="What this helps establish" value={claimKey} values={keysOf(evidenceClaimLabels)}
          itemLabelBuilder={(value) => evidenceClaimLabels[value as ClaimKey]}
          onChanged={(value) => setClaimKey((value ?? claimKey) as ClaimKey)} />
        {claimKey === "operation" ?
          <CatchField recipe="input" title="What they run" value={signalId} onChanged={setSignalId} helperText="A short label, like Waitlists." /> : null}
        <CatchField recipe="select" title="Where it came from" value={sourceType} values={keysOf(evidenceSourceLabels)}
          itemLabelBuilder={(value) => evidenceSourceLabels[value as SourceType]}
          onChanged={(value) => setSourceType((value ?? sourceType) as SourceType)} />
        <CatchField recipe="input" title="Source" maxLength={320} value={sourceRef} onChanged={setSourceRef}
          helperText="A link, or where someone can find it." />
        <CatchField recipe="input" keyboardType="datetime" title="Seen on" value={observedAt} onChanged={setObservedAt} />
        <CatchField recipe="select" title="Confidence" value={confidence} values={keysOf(evidenceConfidenceLabels)}
          itemLabelBuilder={(value) => evidenceConfidenceLabels[value as Confidence]}
          onChanged={(value) => setConfidence((value ?? confidence) as Confidence)} />
        <CatchField recipe="input" title="What you learned" maxLength={500} value={learned} onChanged={setLearned} />
        <CatchField recipe="input" title="Short excerpt from the source" maxLines={2} maxLength={500} value={excerpt} onChanged={setExcerpt} />
        <CatchField recipe="select" title="About" value={contactId} values={["", ...model.contacts.map((contact) => contact.contactId)]}
          itemLabelBuilder={(value) => model.contacts.find((contact) => contact.contactId === value)?.displayName ?? "The host"}
          onChanged={(value) => setContactId(value ?? "")} />
      </CatchGap>
    </CatchSheet>
  );
}

/** A suggestion counts toward qualification only after someone checks its source and accepts it. */
function SuggestionSheet({model, proposal, onClose}: {model: SalesHostsModel; proposal: SalesEvidenceProposal; onClose: () => void}) {
  const [reason, setReason] = useState("");
  const {evidence} = proposal;
  const pending = proposal.status === "pending";
  const review = async (decision: "accept" | "reject") => {
    if (await model.reviewSuggestion(proposal, decision, reason.trim())) onClose();
  };
  const canDecide = reason.trim().length > 0 && !model.isSaving;
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title={evidenceClaimLabels[evidence.claimKey]} subtitle="Suggested evidence"
      footer={pending && model.canEditResearch ? <CatchGap size="inline" direction="horizontal">
        <CatchButton label="Accept" onPressed={canDecide ? () => void review("accept") : null} />
        <CatchButton label="Reject" variant="secondary" onPressed={canDecide ? () => void review("reject") : null} />
      </CatchGap> : undefined}>
      <CatchGap size="related">
        <CatchMetaRow columns={1} entries={[
          ...(evidence.normalizedValue ? [{label: "What it says", value: evidence.normalizedValue}] : []),
          {label: "Source", value: evidence.sourceRef},
          {label: "Seen on", value: date(evidence.observedAt)},
          {label: "Suggested confidence", value: evidenceConfidenceLabels[evidence.confidence]},
          ...(evidence.excerpt ? [{label: "Excerpt", value: evidence.excerpt}] : []),
          {label: "Good until", value: evidence.validThrough ? date(evidence.validThrough) : "No end date"},
          {label: "Suggested by", value: proposal.clientId ? "Assistant" : "Staff"},
          ...(pending ? [] : [{label: proposal.status === "accepted" ? "Accepted because" : "Rejected because", value: proposal.reviewReason ?? "Not recorded"}]),
        ]} />
        {/^https?:\/\//u.test(evidence.sourceRef) ?
          <CatchButton label="Open the source" variant="secondary" size="sm" href={evidence.sourceRef} newTab onPressed={() => undefined} /> : null}
        {pending && model.canEditResearch ?
          <CatchField recipe="input" title="Why" maxLines={2} maxLength={2000} value={reason} onChanged={setReason}
            helperText="Check the source first." /> : null}
        {pending && !model.canEditResearch ?
          <CatchText as="p" variant="supporting">Waiting for a reviewer.</CatchText> : null}
      </CatchGap>
    </CatchSheet>
  );
}

/** The host's research on Overview: what's on record, and what's suggested and waiting for a person. */
function HostResearch({model}: {model: SalesHostsModel}) {
  const [adding, setAdding] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const reviewing = model.suggestions.find((proposal) => proposal.proposalId === reviewingId) ?? null;
  const contactName = (contactId: string | null) => model.contacts.find((contact) => contact.contactId === contactId)?.displayName;
  return (
    <>
      <CatchSection title="Evidence" count={model.evidence.length} dividers="none" action={{label: "Add", onPressed: () => setAdding(true)}}
        empty={model.evidenceFailed ?
          <CatchEmptyState title="Evidence could not be loaded" actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={model.retryEvidence} />} /> :
          <CatchEmptyState title="No evidence yet" />}>
        {model.evidence.map((item) => <CatchIndexRow key={item.evidenceId} title={item.normalizedValue ?? item.excerpt ?? item.sourceRef} titleVariant="bodyM"
          subtitle={[evidenceClaimLabels[item.claimKey], contactName(item.contactId), item.sourceRef, date(item.observedAt),
            `${evidenceConfidenceLabels[item.confidence]} confidence`].filter(Boolean).join(" · ")} />)}
      </CatchSection>
      {model.hasMoreEvidence ? <CatchButton label="Show more evidence" variant="secondary" size="sm" onPressed={model.moreEvidence} /> : null}
      {model.suggestions.length || model.suggestionsFailed ? (
        <CatchSection title="Suggestions to review" count={model.suggestions.filter((proposal) => proposal.status === "pending").length} dividers="none"
          empty={<CatchEmptyState title="Suggestions could not be loaded" actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={model.retrySuggestions} />} />}>
          {model.suggestions.map((proposal) => <CatchIndexRow key={proposal.proposalId} titleVariant="bodyM"
            title={proposal.evidence.normalizedValue ?? proposal.evidence.excerpt ?? proposal.evidence.sourceRef}
            subtitle={[evidenceClaimLabels[proposal.evidence.claimKey], proposal.clientId ? "From the assistant" : "From staff",
              proposal.status === "pending" ? "Waiting" : proposal.status === "accepted" ? "Accepted" : "Rejected"].join(" · ")}
            onTap={() => setReviewingId(proposal.proposalId)} />)}
        </CatchSection>
      ) : null}
      {model.hasMoreSuggestions ? <CatchButton label="Show more suggestions" variant="secondary" size="sm" onPressed={model.moreSuggestions} /> : null}
      {adding ? <AddEvidenceSheet model={model} onClose={() => setAdding(false)} /> : null}
      {reviewing ? <SuggestionSheet key={`${reviewing.proposalId}:${reviewing.revision}`} model={model} proposal={reviewing}
        onClose={() => setReviewingId(null)} /> : null}
    </>
  );
}

/** A decision about this host as a whole. It stays bound to what the person opened, so a change made meanwhile is seen first. */
function HoldSheet({model, host, onClose}: {
  model: SalesHostsModel;
  host: SalesAccountDetail;
  onClose: () => void;
}) {
  const current = host.account.suppressionStatus ?? "clear";
  const [opened, setOpened] = useState({revision: host.account.revision, status: current});
  const [status, setStatus] = useState<SalesHoldStatus>(current);
  const [reason, setReason] = useState("");
  const changed = opened.revision !== host.account.revision;
  const useLatest = () => {
    setOpened({revision: host.account.revision, status: current});
    setStatus(current);
    setReason("");
  };
  const submit = async () => {
    if (await model.setHold(opened.revision, status, reason.trim())) onClose();
  };
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title="Account hold" subtitle={host.organizerSummary.name}
      footer={changed ? <CatchButton label="Use the latest" variant="secondary" onPressed={useLatest} /> :
        <CatchButton label={model.isSaving ? "Saving" : "Save"} onPressed={reason.trim() && !model.isSaving ? () => void submit() : null} />}>
      <CatchGap size="related">
        {changed ? <CatchText as="p" variant="bodyM" role="alert">
          This host changed since you opened this. It's now {holdLabels[current].toLowerCase()}. Check that before you decide.</CatchText> : null}
        <CatchField recipe="select" title="Status" value={status} values={keysOf(holdLabels)}
          itemLabelBuilder={(value) => holdLabels[value as SalesHoldStatus]}
          onChanged={(value) => setStatus((value ?? status) as SalesHoldStatus)} />
        <CatchField recipe="input" title="Why" maxLines={2} value={reason} onChanged={setReason}
          helperText="Clearing a hold doesn't give permission to draft or send outreach." />
      </CatchGap>
    </CatchSheet>
  );
}

type HostSheet = {kind: "log"} | {kind: "step"} | {kind: "edit"} | {kind: "person"} | {kind: "hold"} | {kind: "deal"; deal: SalesOpportunity | null} |
  {kind: "contact"; contactId: string};

/** One host: its facts and history beside what's next and who's involved. Everything rarer is in All tools. */
function HostPage({model, host, onBack, onOpenOrganizer, onOpenTools, onOpenFit, onOpenPrivacy, onOpenDemo}: {
  model: SalesHostsModel;
  host: SalesAccountDetail;
  onBack: () => void;
  onOpenOrganizer: () => void;
  onOpenTools: () => void;
  onOpenFit: () => void;
  onOpenPrivacy: () => void;
  onOpenDemo: () => void;
}) {
  const [sheet, setSheet] = useState<HostSheet | null>(null);
  const close = () => setSheet(null);
  const reviewingContact = sheet?.kind === "contact" ? model.contacts.find((contact) => contact.contactId === sheet.contactId) ?? null : null;
  const research = researchLabels[host.account.researchStatus];
  const deal = host.opportunities[0];
  const openTasks = host.tasks.filter((task) => task.status === "open");
  const conversations = host.activities.filter((activity) => activity.type !== "note");
  const notes = host.activities.filter((activity) => activity.type === "note");
  const date = (value: string) => new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short"}).format(new Date(value));
  const counts: Partial<Record<HostTab, number>> = {conversations: conversations.length, deals: host.opportunities.length};
  let body;
  if (model.tab === "overview") {
    body = (
      <CatchGap size="section">
        <CatchMetaRow columns={2} entries={[
          {label: "Stage", value: deal ? stageLabel(deal.stage) : "No deal yet"},
          {label: "Research", value: research.text, ...(research.tone ? {tone: research.tone} : {})},
          {label: "City", value: host.organizerSummary.city ?? "Not set"},
          {label: "On Catch", value: host.organizerSummary.claimStatus === "claimed" ? "Claimed" :
            host.organizerSummary.appVisibility === "discoverable" ? "Listed" : "Listed, hidden"},
          ...(host.account.summary ? [{label: "Summary", value: host.account.summary, wide: true}] : []),
        ]} />
        <HostResearch model={model} />
      </CatchGap>
    );
  } else if (model.tab === "deals") {
    body = <CatchGap size="section"><CatchSection title="Deals" count={host.opportunities.length} dividers="none"
      action={host.opportunities.length ? undefined : {label: "Start a deal", onPressed: () => setSheet({kind: "deal", deal: null})}}
      empty={<CatchEmptyState title="No deal yet" />}>
      {host.opportunities.map((item) => <CatchIndexRow key={item.opportunityId} title={stageLabel(item.stage)} titleVariant="bodyM"
        subtitle={[item.nextStep, item.nextStepAt ? date(item.nextStepAt) : null].filter(Boolean).join(" · ") || undefined}
        trailing={<CatchButton label="Move" variant="secondary" size="sm" onPressed={() => setSheet({kind: "deal", deal: item})} />} />)}
    </CatchSection>
      {model.commercial ? <SalesHostCommercialWorkspace model={model.commercial} deals={host.opportunities} evidence={model.evidence}
        hasMoreEvidence={model.hasMoreEvidence} moreEvidence={model.moreEvidence} isAdminOwner={model.isAdminOwner} /> : null}
    </CatchGap>;
  } else {
    const list = model.tab === "conversations" ? conversations : notes;
    body = <CatchSection title={model.tab === "conversations" ? "Conversations" : "Notes"} count={list.length} dividers="none"
      empty={<CatchEmptyState title={model.tab === "conversations" ? "No conversations logged" : "No notes yet"} />}>
      {list.map((activity) => <CatchIndexRow key={activity.activityId} title={activity.note || activity.type} titleVariant="bodyM"
        subtitle={`${activity.type.replace(/_/gu, " ")} · ${date(activity.occurredAt)}`} />)}
    </CatchSection>;
  }
  return (
    <CatchPaneLayout pattern="reading"
      main={<>
        <CatchWorkspaceHeader title={host.organizerSummary.name} kicker="Sales · Hosts" back={{label: "Back to hosts", onPressed: onBack}}
          actions={<CatchButton label="Log activity" size="sm" onPressed={() => setSheet({kind: "log"})} />} />
        <CatchPageTabBar label="Host" selected={model.tab} size="sm" onChanged={(value) => model.setTab(value as HostTab)}
          options={tabs.map((tab) => ({...tab, ...(counts[tab.value] !== undefined ? {count: counts[tab.value]} : {})}))} />
        {body}
        {sheet?.kind === "log" ? <LogActivitySheet model={model} onClose={close} /> : null}
        {sheet?.kind === "step" ? <NextStepSheet model={model} onClose={close} /> : null}
        {sheet?.kind === "deal" ? <DealSheet model={model} deal={sheet.deal} onClose={close} /> : null}
        {sheet?.kind === "edit" ? <EditHostSheet model={model} host={host} onClose={close} /> : null}
        {sheet?.kind === "person" ? <AddPersonSheet model={model} onClose={close} /> : null}
        {sheet?.kind === "hold" ? <HoldSheet model={model} host={host} onClose={close} /> : null}
        {reviewingContact ? <ContactReviewSheet key={reviewingContact.contactId} model={model} contact={reviewingContact} onClose={close} /> : null}
      </>}
      aside={<CatchGap size="section">
        <CatchSection title="Next steps" count={openTasks.length} dividers="none" action={{label: "Add", onPressed: () => setSheet({kind: "step"})}}
          empty={<CatchEmptyState title="No next step" kind="done" />}>
          {openTasks.map((task) => <CatchIndexRow key={task.taskId} title={task.title} titleVariant="bodyM"
            subtitle={`${taskKindLabels[task.kind]} · ${dueLabel(task.dueAt).text}`}
            trailing={<CatchButton label="Done" variant="secondary" size="sm"
              onPressed={model.isSaving ? null : () => void model.completeNextStep(task)} />} />)}
        </CatchSection>
        <CatchSection title="People" count={model.contacts.length} dividers="none" action={{label: "Add", onPressed: () => setSheet({kind: "person"})}}
          empty={model.contactsFailed ?
            <CatchEmptyState title="People could not be loaded" actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={model.retryContacts} />} /> :
            <CatchEmptyState title="Nobody yet" />}>
          {model.contacts.map((contact) => {
            const {relationship} = contact;
            const review = contactReviewLabels[relationship.contactabilityStatus];
            const influence = decisionInfluences.find((entry) => entry.value === relationship.decisionInfluence && entry.value !== "unknown")?.label;
            return <CatchIndexRow key={contact.contactId} title={contact.displayName} titleVariant="bodyM"
              subtitle={[relationship.role, influence, relationship.primary ? "Main contact" : null,
                ...(relationship.endpoints ?? []).map((endpoint) => `${endpoint.value}${endpoint.verificationStatus === "unverified" ? " (unverified)" : ""}`),
              ].filter(Boolean).join(" · ") || undefined}
              footer={<CatchBadge recipe="status" tone={review.tone ?? "neutral"} label={review.text} />}
              {...(model.canEditResearch ? {trailing: <CatchButton label="Review" variant="secondary" size="sm"
                onPressed={() => setSheet({kind: "contact", contactId: contact.contactId})} />} : {})} />;
          })}
        </CatchSection>
        {model.hasMoreContacts ? <CatchButton label="Show more people" variant="secondary" size="sm" onPressed={model.moreContacts} /> : null}
        <CatchSection title="More" dividers="none">
          <CatchIndexRow title="Edit host" titleVariant="bodyM" subtitle="Summary, next action, research and owner" onTap={() => setSheet({kind: "edit"})} />
          <CatchIndexRow title="Organizer page" titleVariant="bodyM" onTap={onOpenOrganizer} />
          {model.renderPartnerOffer?.(host.account.organizerId, host.organizerSummary.name)}
          <CatchIndexRow title="Account hold" titleVariant="bodyM" subtitle={holdLabels[host.account.suppressionStatus ?? "clear"]}
            trailing={model.canEditResearch ? <CatchButton label="Change" variant="secondary" size="sm" onPressed={() => setSheet({kind: "hold"})} /> : undefined} />
          {model.canEditResearch ? <CatchIndexRow title="Fit and outreach" titleVariant="bodyM" subtitle="Fit, reviewed wording and drafts to copy" onTap={onOpenFit} /> : null}
          <CatchIndexRow title="All tools" titleVariant="bodyM" subtitle="Custom fields and imported history" onTap={onOpenTools} />
          {model.isAdminOwner ? <CatchIndexRow title="Private demo" titleVariant="bodyM" subtitle="A synthetic example to show this host" onTap={onOpenDemo} /> : null}
          {model.isAdminOwner ? <CatchIndexRow title="Privacy" titleVariant="bodyM" subtitle="Restrict this host's private Sales records" onTap={onOpenPrivacy} /> : null}
        </CatchSection>
      </CatchGap>} />
  );
}

/** Hosts: the accounts in Sales, searchable, and one host's page with four tabs. */
export function SalesHostsScreen({model, selectedOrganizerId, onSelect, onOpenOrganizer, onOpenHostTools, onOpenFit, onOpenPrivacy, onOpenDemo, onAddHost}: {
  model: SalesHostsModel;
  selectedOrganizerId: string | null;
  onSelect: (organizerId: string | null) => void;
  /** The older host page: custom fields and imported history. */
  onOpenHostTools: (organizerId: string) => void;
  onOpenFit: (organizerId: string) => void;
  onOpenPrivacy: (organizerId: string) => void;
  onOpenDemo: (organizerId: string) => void;
  /** The older form to add a host or nominate an organizer. */
  onAddHost: () => void;
  onOpenOrganizer: (organizerId: string) => void;
}) {
  if (selectedOrganizerId && model.host) {
    return <HostPage key={selectedOrganizerId} model={model} host={model.host} onBack={() => onSelect(null)}
      onOpenOrganizer={() => onOpenOrganizer(selectedOrganizerId)} onOpenTools={() => onOpenHostTools(selectedOrganizerId)} onOpenFit={() => onOpenFit(selectedOrganizerId)} onOpenPrivacy={() => onOpenPrivacy(selectedOrganizerId)} onOpenDemo={() => onOpenDemo(selectedOrganizerId)} />;
  }
  const rows: Row[] = model.rows.map((row) => {
    const research = researchLabels[row.researchStatus];
    return {key: row.organizerId,
      host: {title: row.name, ...(row.city ? {subtitle: row.city} : {})},
      research: {text: research.text, ...(research.tone ? {tone: research.tone} : {})},
      stage: row.stage ? stageLabel(row.stage) : "—", next: row.nextAction ?? "—"};
  });
  return (
    <CatchPaneLayout pattern="wide-table" main={<>
      <CatchWorkspaceHeader title="Hosts" count={model.rows.length}
        filters={{search: {placeholder: "Search hosts", value: model.query, onChanged: model.setQuery}}}
        actions={<>
          <CatchButton label="Add or nominate" variant="secondary" size="sm" onPressed={onAddHost} />
          {model.hasPreviousPage ? <CatchButton label="Previous" variant="secondary" size="sm" onPressed={model.previousPage} /> : null}
          {model.hasNextPage ? <CatchButton label="More" variant="secondary" size="sm" onPressed={model.nextPage} /> : null}
        </>} />
      <CatchTable columns={columns} rows={rows} label="Hosts" rowKey="key" onRowPressed={(row) => onSelect(row.key)} density="compact" />
    </>} />
  );
}
