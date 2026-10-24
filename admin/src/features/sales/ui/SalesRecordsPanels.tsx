import {CatchText, CatchField} from "@catch/web-ui";
import {useState} from "react";
import {CheckCircle2, ClipboardList} from "lucide-react";
import {
  AdminButton,
  AdminForm,
  EmptyState,
  Panel,
  selectOptions,
  StateRow,
} from "../../../shared/ui/AdminPrimitives";
import {toLocalDateTimeInput, type SalesWorkspaceController} from
  "../controllers/useSalesWorkspaceController";
import type {SalesAccountDetail, SalesContact, SalesEvidence, SalesEvidenceProposal} from "../api/salesTypes";

function PageControls({previous, next, onPrevious, onNext}: {
  previous: boolean; next: boolean; onPrevious: () => void; onNext: () => void;
}) {
  return <p><AdminButton disabled={!previous} onClick={onPrevious}>Previous</AdminButton>{" "}
    <AdminButton disabled={!next} onClick={onNext}>Next</AdminButton></p>;
}

function SalesPeoplePanel({detail, controller, assignedStaffOnly}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
  assignedStaffOnly: boolean;
}) {
  const organizerId = detail.account.organizerId;
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [influence, setInfluence] = useState<SalesContact["relationship"]["decisionInfluence"]>("unknown");
  const [primary, setPrimary] = useState("false");
  const [endpointKind, setEndpointKind] = useState<"email" | "phone">("email");
  const [endpointValue, setEndpointValue] = useState("");
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedRevision, setSelectedRevision] = useState<number | null>(null);
  const [status, setStatus] = useState<SalesContact["relationship"]["contactabilityStatus"]>("unknown");
  const [reason, setReason] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const contacts = controller.contacts.data?.rows ?? [];
  const selected = contacts.find((item) => item.contactId === selectedContact);
  const contactChanged = Boolean(selected && selectedRevision !==
    selected.relationship.revision);
  const selectContact = (contact: SalesContact | undefined) => {
    setSelectedContact(contact?.contactId ?? "");
    setSelectedRevision(contact?.relationship.revision ?? null);
    setStatus(contact?.relationship.contactabilityStatus ?? "unknown");
    setReason("");
    setEvidenceId(contact?.relationship.draftReviewEvidenceId ?? "");
  };
  const matchingEvidence = (controller.evidence.data?.rows ?? []).filter(
    (item) => item.contactId === selectedContact);
  const create = async () => {
    if (!name.trim() || !role.trim()) return;
    const saved = await controller.saveContact({organizerId, expectedRevision: 0,
      contact: {displayName: name.trim()}, relationship: {
        role: role.trim(), decisionInfluence: influence, primary: primary === "true",
        ...(endpointValue.trim() ? {endpoints: [{kind: endpointKind,
          value: endpointValue.trim(), verificationStatus: "unverified" as const}]} : {}),
      }});
    if (saved) {setName(""); setRole(""); setInfluence("unknown"); setPrimary("false");
      setEndpointValue("");}
  };
  const review = async () => {
    if (assignedStaffOnly) return;
    if (!selected || contactChanged || selectedRevision === null || !reason.trim() ||
      (status === "draft_reviewed" && !evidenceId)) return;
    const saved = await controller.saveContactability({organizerId,
      contactId: selected.contactId, expectedRevision: selectedRevision,
      status, reason: reason.trim(), evidenceId: status === "draft_reviewed" ? evidenceId :
        undefined});
    if (saved) selectContact(undefined);
  };
  return <Panel title="People" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Private contact relationships. A review for drafting never authorizes sending.</CatchText>
    {controller.contacts.isPending ? <EmptyState>Loading contacts…</EmptyState> :
      controller.contacts.error ? <EmptyState>Contacts could not be loaded. <AdminButton
        onClick={() => void controller.contacts.refetch()}>Try again</AdminButton></EmptyState> :
        contacts.length ? contacts.map((contact) => <StateRow key={contact.contactId}
          label={contact.displayName} value={<>{contact.relationship.role} ·
            {contact.relationship.decisionInfluence.replaceAll("_", " ")} ·
            {contact.relationship.contactabilityStatus.replaceAll("_", " ")}
            {contact.relationship.primary ? " · Primary" : ""}
            {contact.relationship.endpoints?.map((endpoint) =>
              ` · ${endpoint.kind}: ${endpoint.value} (${endpoint.verificationStatus})`)
              .join("") ?? ""}</>} />) :
          <EmptyState>No contacts recorded for this host.</EmptyState>}
    <PageControls previous={controller.hasPreviousContactPage}
      next={Boolean(controller.contacts.data?.nextCursor)}
      onPrevious={controller.previousContactPage} onNext={controller.nextContactPage} />
    <AdminForm onSubmit={(event) => {event.preventDefault(); void create();}}>
      <CatchText as="h3" variant="sectionTitle">Add contact relationship</CatchText>
      <CatchField recipe="input" title="Name" value={name} onChanged={setName} required />
      <CatchField
        recipe="input"
        title="Role with host"
        value={role}
        onChanged={setRole}
        required
      />
      <CatchField
        recipe="select"
        title="Decision influence"
        value={influence}
        onChanged={(value) => setInfluence((value ?? "") as typeof influence)}
        {...selectOptions([
          {value: "unknown", label: "Unknown"},
          {value: "decision_maker", label: "Decision maker"},
          {value: "influencer", label: "Influencer"},
          {value: "operator", label: "Operator"},
        ])}
      />
      <CatchField
        recipe="select"
        title="Primary contact"
        value={primary}
        onChanged={(value) => setPrimary(value ?? "")}
        {...selectOptions([{value: "false", label: "No"}, {value: "true", label: "Yes"}])}
      />
      <CatchField
        recipe="select"
        title="Contact method (optional)"
        value={endpointKind}
        onChanged={(value) => setEndpointKind((value ?? "") as typeof endpointKind)}
        {...selectOptions([
          {value: "email", label: "Email"}, {value: "phone", label: "Phone"},
        ])}
      />
      <CatchField recipe="input" title={endpointKind === "email" ? "Email address (unverified)" :
        "Phone number (unverified)"} value={endpointValue}
        onChanged={setEndpointValue} keyboardType={endpointKind === "email" ? "emailAddress" : "text"} />
      <CatchText as="p" variant="supporting">These contact details still need review before they can be used.</CatchText>
      <AdminButton type="submit" disabled={!name.trim() || !role.trim() ||
        controller.isSaving}>Add contact</AdminButton>
    </AdminForm>
    {assignedStaffOnly ? <CatchText as="p" variant="supporting">Contact restrictions and draft eligibility require an
      authorized reviewer. Adding contact details never grants permission to send.</CatchText> : null}
    {contacts.length && !assignedStaffOnly ? <AdminForm onSubmit={(event) => {event.preventDefault(); void review();}}>
      <CatchText as="h3" variant="sectionTitle">Contact restriction or draft review</CatchText>
      <CatchField
        recipe="select"
        title="Contact on this page"
        value={selectedContact}
        onChanged={(value) => selectContact(contacts.find((item) =>
          item.contactId === (value ?? "")))}
        {...selectOptions([{value: "", label: "Choose contact"}, ...contacts.map((item) => ({
          value: item.contactId, label: item.displayName,
        }))])}
      />
      {selected ? <StateRow label="Current status" value={
        selected.relationship.contactabilityStatus.replaceAll("_", " ")} /> : null}
      {contactChanged ? <p role="alert">This contact decision changed since you opened
        it. Compare the current status before recording another decision. <AdminButton
          type="button" onClick={() => selectContact(selected)}>Use latest contact
          decision</AdminButton></p> : null}
      <CatchField
        recipe="select"
        title="New status"
        value={status}
        onChanged={(value) => setStatus((value ?? "") as typeof status)}
        {...selectOptions([
          {value: "unknown", label: "Unknown"},
          {value: "draft_reviewed", label: "Reviewed for draft consideration"},
          {value: "held", label: "Hold"},
          {value: "suppressed", label: "Suppress"},
        ])}
      />
      {status === "draft_reviewed" ? <CatchField
        recipe="select"
        title="Reviewed contact evidence on this page"
        value={evidenceId}
        onChanged={(value) => setEvidenceId(value ?? "")}
        {...selectOptions([
          {value: "", label: "Choose evidence"}, ...matchingEvidence.map((item) => ({
            value: item.evidenceId,
            label: `${item.claimKey}: ${item.sourceRef}`,
          })),
        ])}
      /> : null}
      <CatchField
        recipe="input"
        title="Reason for decision"
        maxLines={2}
        value={reason}
        onChanged={setReason}
        required
      />
      <CatchText as="p" variant="supporting">Draft review is only a private eligibility input. It does not verify an
        endpoint, consent to send, or provider delivery.</CatchText>
      <AdminButton type="submit" disabled={!selected || contactChanged || !reason.trim() ||
        (status === "draft_reviewed" && !evidenceId) || controller.isSaving}>
        Record contact decision
      </AdminButton>
    </AdminForm> : null}
  </Panel>;
}

function EvidenceSuggestion({proposal, controller, assignedStaffOnly}: {
  proposal: SalesEvidenceProposal; controller: SalesWorkspaceController;
  assignedStaffOnly: boolean;
}) {
  const [reason, setReason] = useState("");
  const review = (decision: "accept" | "reject") => controller.reviewEvidenceProposal({
    organizerId: proposal.organizerId, proposalId: proposal.proposalId,
    expectedRevision: proposal.revision, decision, reason: reason.trim(),
  });
  return <Panel title={`${proposal.evidence.claimKey} · ${proposal.status}`} icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">{proposal.evidence.normalizedValue || proposal.evidence.excerpt || "No summary supplied."}</CatchText>
    <StateRow label="Source" value={proposal.evidence.sourceRef} />
    <StateRow label="Observed" value={proposal.evidence.observedAt} />
    <StateRow label="Suggested confidence" value={proposal.evidence.confidence} />
    {proposal.evidence.excerpt ? <StateRow label="Source excerpt"
      value={proposal.evidence.excerpt} /> : null}
    <StateRow label="Valid until" value={proposal.evidence.validThrough ?? "No expiry supplied"} />
    <StateRow label="Submitted by" value={proposal.clientId ? "Assistant" : "Employee"} />
    {proposal.status === "pending" && assignedStaffOnly ?
      <CatchText as="p" variant="supporting">Awaiting authorized evidence review.</CatchText> : proposal.status === "pending" ? <>
      <CatchField
        recipe="input"
        title="Review reason"
        value={reason}
        onChanged={setReason}
        maxLength={2000}
        maxLines={2}
      />
      <AdminButton disabled={!reason.trim() || controller.isSaving}
        onClick={() => void review("accept")}>Accept as reviewed evidence</AdminButton>
      <AdminButton disabled={!reason.trim() || controller.isSaving}
        onClick={() => void review("reject")}>Reject suggestion</AdminButton>
    </> : <StateRow label="Review decision" value={proposal.reviewReason ?? "Reviewed"} />}
  </Panel>;
}

function SalesEvidencePanel({detail, controller, assignedStaffOnly}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
  assignedStaffOnly: boolean;
}) {
  const [contactId, setContactId] = useState("");
  const [claimKey, setClaimKey] = useState<SalesEvidence["claimKey"]>("identity");
  const [signalId, setSignalId] = useState("");
  const [sourceType, setSourceType] = useState<SalesEvidence["sourceType"]>("human_note");
  const [sourceRef, setSourceRef] = useState("");
  const [observedAt, setObservedAt] = useState(() => toLocalDateTimeInput(new Date()));
  const [confidence, setConfidence] = useState<SalesEvidence["confidence"]>("medium");
  const [value, setValue] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const rows = controller.evidence.data?.rows ?? [];
  const save = async () => {
    const date = new Date(observedAt);
    if (!sourceRef.trim() || Number.isNaN(date.getTime()) ||
      (claimKey === "operation" && !signalId.trim())) return;
    const saved = await controller.saveEvidence({organizerId: detail.account.organizerId,
      contactId: contactId || null, claimKey,
      signalId: claimKey === "operation" ? signalId.trim() : undefined,
      sourceType, sourceRef: sourceRef.trim(), observedAt: date.toISOString(),
      confidence, normalizedValue: value.trim() || null, excerpt: excerpt.trim() || null});
    if (saved) {setSourceRef(""); setValue(""); setExcerpt(""); setSignalId("");}
  };
  return <Panel title="Research evidence" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Record the source and observation separately from a conclusion. Evidence is
      private and does not publish claims.</CatchText>
    {controller.evidence.isPending ? <EmptyState>Loading evidence…</EmptyState> :
      controller.evidence.error ? <EmptyState>Evidence could not be loaded. <AdminButton
        onClick={() => void controller.evidence.refetch()}>Try again</AdminButton></EmptyState> :
        rows.length ? rows.map((item) => <StateRow key={item.evidenceId}
          label={`${item.claimKey} · ${item.confidence}`} value={<>
            {item.sourceType.replaceAll("_", " ")} · {item.sourceRef} ·
            {new Date(item.observedAt).toLocaleDateString()}
            {item.normalizedValue ? ` · ${item.normalizedValue}` : ""}
          </>} />) : <EmptyState>No evidence recorded for this host.</EmptyState>}
    <PageControls previous={controller.hasPreviousEvidencePage}
      next={Boolean(controller.evidence.data?.nextCursor)}
      onPrevious={controller.previousEvidencePage} onNext={controller.nextEvidencePage} />
    <CatchText as="h3" variant="sectionTitle">Suggestions to review</CatchText>
    <CatchText as="p" variant="supporting">Check the source before accepting. Assistant suggestions do not affect qualification until reviewed.</CatchText>
    {controller.evidenceProposals?.isPending ? <EmptyState>Loading suggestions…</EmptyState> :
      controller.evidenceProposals?.error ? <EmptyState>Suggestions could not be loaded.
        <AdminButton onClick={() => void controller.evidenceProposals.refetch()}>Try again</AdminButton>
      </EmptyState> : (controller.evidenceProposals?.data?.rows ?? []).map((proposal) =>
        <EvidenceSuggestion key={`${proposal.proposalId}:${proposal.revision}`}
          proposal={proposal} controller={controller}
          assignedStaffOnly={assignedStaffOnly} />)}
    {controller.evidenceProposals?.data?.rows.length === 0 ?
      <EmptyState>No evidence suggestions for this host.</EmptyState> : null}
    <PageControls previous={controller.hasPreviousProposalPage}
      next={Boolean(controller.evidenceProposals?.data?.nextCursor)}
      onPrevious={controller.previousProposalPage} onNext={controller.nextProposalPage} />
    <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      <CatchText as="h3" variant="sectionTitle">Add reviewed observation</CatchText>
      <CatchField
        recipe="select"
        title="Related contact on this page (optional)"
        value={contactId}
        onChanged={(value) => setContactId(value ?? "")}
        {...selectOptions([{value: "", label: "Host account"},
          ...(controller.contacts.data?.rows ?? []).map((item) => ({
            value: item.contactId, label: item.displayName,
          }))])}
      />
      <CatchField
        recipe="select"
        title="What this helps establish"
        value={claimKey}
        onChanged={(next) => setClaimKey((next ?? "") as typeof claimKey)}
        {...selectOptions([
          "identity", "recurrence", "operation", "stack", "other",
        ])}
      />
      {claimKey === "operation" ? <CatchField
        recipe="input"
        title="Operating signal (short label)"
        value={signalId}
        onChanged={setSignalId}
        required
      /> : null}
      <CatchField
        recipe="select"
        title="Source type"
        value={sourceType}
        onChanged={(next) => setSourceType((next ?? "") as typeof sourceType)}
        {...selectOptions([
          {value: "first_party", label: "First party"},
          {value: "public_web", label: "Public web"},
          {value: "human_note", label: "Human note"},
          {value: "import_artifact", label: "Import artifact"},
        ])}
      />
      <CatchField
        recipe="input"
        title="Source reference"
        value={sourceRef}
        onChanged={setSourceRef}
        required
        maxLength={320}
      />
      <CatchField
        recipe="input"
        title="Observed at"
        value={observedAt}
        onChanged={setObservedAt}
        required
        keyboardType="datetime"
      />
      <CatchField
        recipe="select"
        title="Confidence"
        value={confidence}
        onChanged={(next) => setConfidence((next ?? "") as typeof confidence)}
        {...selectOptions([
          "low", "medium", "high",
        ])}
      />
      <CatchField
        recipe="input"
        title="What you learned (optional)"
        value={value}
        onChanged={setValue}
        maxLength={500}
      />
      <CatchField
        recipe="input"
        title="Short source excerpt (optional)"
        maxLines={2}
        value={excerpt}
        onChanged={setExcerpt}
        maxLength={500}
      />
      <AdminButton type="submit" disabled={!sourceRef.trim() || !observedAt ||
        (claimKey === "operation" && !signalId.trim()) || controller.isSaving}>
        Record evidence
      </AdminButton>
    </AdminForm>
  </Panel>;
}

function SalesSuppressionPanel({detail, controller}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
}) {
  const [reviewed, setReviewed] = useState(() => ({
    organizerId: detail.account.organizerId,
    revision: detail.account.revision,
    status: detail.account.suppressionStatus ?? "clear",
  }));
  const [status, setStatus] = useState<"clear" | "held" | "suppressed">(
    reviewed.status);
  const [reason, setReason] = useState("");
  const accountChanged = reviewed.organizerId !== detail.account.organizerId ||
    reviewed.revision !== detail.account.revision;
  const useLatest = () => {
    const latest = {organizerId: detail.account.organizerId,
      revision: detail.account.revision,
      status: detail.account.suppressionStatus ?? "clear"};
    setReviewed(latest);
    setStatus(latest.status);
    setReason("");
  };
  const save = async () => {
    if (!reason.trim() || accountChanged) return;
    const saved = await controller.saveAccountSuppression({
      organizerId: reviewed.organizerId,
      expectedRevision: reviewed.revision, status, reason: reason.trim(),
    });
    if (saved) {setReviewed({...reviewed, revision: reviewed.revision + 1,
      status}); setReason("");}
  };
  return <Panel title="Account restriction" icon={<ClipboardList size={18} />}>
    <StateRow label="Current status" value={detail.account.suppressionStatus ?? "clear"} />
    {accountChanged ? <p role="alert">This host record changed since you opened
      the restriction form. Compare the current status before recording another
      decision. <AdminButton type="button" onClick={useLatest}>Use latest account
      decision</AdminButton></p> : null}
    <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      <CatchField
        recipe="select"
        title="New status"
        value={status}
        onChanged={(value) => setStatus((value ?? "") as typeof status)}
        {...selectOptions([
          {value: "clear", label: "Clear hold"},
          {value: "held", label: "Hold"},
          {value: "suppressed", label: "Suppress"},
        ])}
      />
      <CatchField
        recipe="input"
        title="Reason"
        maxLines={2}
        value={reason}
        onChanged={setReason}
        required
      />
      <CatchText as="p" variant="supporting">Clearing a hold does not grant permission to draft or send outreach.</CatchText>
      <AdminButton type="submit" disabled={!reason.trim() || accountChanged ||
        controller.isSaving}>
        Record account decision
      </AdminButton>
    </AdminForm>
  </Panel>;
}

function taskDateLabel(value: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value :
    date.toLocaleDateString(undefined, {day: "numeric", month: "short", year: "numeric"});
}

function taskOwnerLabel(uid: string, currentUserUid: string) {
  return uid === currentUserUid ? "You" : "Another teammate";
}

function taskStatusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/gu, (letter) =>
    letter.toUpperCase());
}

function SalesTasksPanel({detail, controller, currentUserUid, assignedStaffOnly}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
  currentUserUid: string;
  assignedStaffOnly: boolean;
}) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [kind, setKind] = useState<"research" | "follow_up" | "demo">("research");
  const [contactId, setContactId] = useState("");
  const outbound = kind === "follow_up" || kind === "demo";
  const reviewedContacts = (controller.contacts.data?.rows ?? []).filter((contact) =>
    contact.relationship.contactabilityStatus === "draft_reviewed");
  const selectedContact = reviewedContacts.find((contact) =>
    contact.contactId === contactId);
  const add = async () => {
    const date = new Date(dueAt);
    if (!title.trim() || !dueAt || Number.isNaN(date.getTime()) ||
      !currentUserUid || (outbound && !selectedContact)) return;
    const saved = await controller.saveTask({organizerId: detail.account.organizerId,
      expectedRevision: 0,
      task: {kind, title: title.trim(), ownerUid: currentUserUid,
        dueAt: date.toISOString(), status: "open",
        contactId: outbound ? selectedContact!.contactId : null}});
    if (saved) {setTitle(""); setDueAt(""); setKind("research"); setContactId("");}
  };
  return <Panel title="Next steps" icon={<ClipboardList size={18} />}>
    {detail.tasks.map((task) => <StateRow key={task.taskId}
      label={task.title} value={<>
      {taskDateLabel(task.dueAt)} · {taskOwnerLabel(task.ownerUid, currentUserUid)} ·
        {taskStatusLabel(task.status)}{" "}
      {task.status === "open" ? <AdminButton disabled={controller.isSaving}
        icon={<CheckCircle2 size={15} />}
        onClick={() => void controller.saveTask({
          organizerId: detail.account.organizerId, taskId: task.taskId,
          expectedRevision: task.revision,
          task: {kind: task.kind, title: task.title, dueAt: task.dueAt,
            ownerUid: task.ownerUid, status: "completed",
            contactId: task.contactId ?? null},
        })}>Mark done</AdminButton> : null}
    </>} />)}
    {!detail.tasks.length ? <EmptyState>No tasks for this host.</EmptyState> : null}
    <AdminForm onSubmit={(event) => {event.preventDefault(); void add();}}>
      <CatchField recipe="input" title="New task" value={title} onChanged={setTitle} />
      <CatchField
        recipe="select"
        title="Task purpose"
        value={kind}
        onChanged={(value) => {setKind((value ?? "") as typeof kind); setContactId("");}}
        {...selectOptions([{value: "research", label: "Internal research"},
          {value: "follow_up", label: "Follow up with a contact"},
          {value: "demo", label: "Arrange a demo with a contact"}])}
      />
      {outbound ? <>
        <CatchField
          recipe="select"
          title="Reviewed contact on this page"
          value={contactId}
          onChanged={(value) => setContactId(value ?? "")}
          {...selectOptions([{value: "", label: "Choose contact"},
            ...reviewedContacts.map((contact) => ({value: contact.contactId,
              label: contact.displayName}))])}
        />
        <CatchText as="p" variant="supporting">A contact review permits draft consideration only. The server checks
          current restrictions before recording this task; it does not send anything.</CatchText>
        {!reviewedContacts.length ? <CatchText as="p" variant="supporting" role="alert">No reviewed contacts on this page.
          {assignedStaffOnly ? " Ask an authorized reviewer, or choose Internal research." :
            " Review a contact in People, or choose Internal research."}</CatchText> : null}
      </> : null}
      <CatchText as="p" variant="supporting">Assigned to you</CatchText>
      <CatchField
        recipe="input"
        title="Due"
        value={dueAt}
        onChanged={setDueAt}
        keyboardType="datetime"
      />
      <AdminButton type="submit" disabled={!title.trim() || !currentUserUid ||
        !dueAt || (outbound && !selectedContact) || controller.isSaving}>Add task</AdminButton>
    </AdminForm>
  </Panel>;
}

function SalesDraftReadinessPanel() {
  return <Panel title="Outreach draft readiness" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Private draft generation is waiting for the live eligibility bridge, approved
      evidence clauses, capability and reference checks, and a reviewed CTA set.
      Contact review alone does not enable a draft or a send. Record research and
      manual activity here while those controls are being integrated.</CatchText>
  </Panel>;
}

export function SalesRecordsWorkspace({section, detail, controller, currentUserUid,
  assignedStaffOnly = false}: {
  section: "people" | "evidence" | "suppression" | "draft" | "tasks";
  currentUserUid?: string;
  assignedStaffOnly?: boolean;
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
}) {
  if (section === "tasks") return <SalesTasksPanel key={detail.account.organizerId}
    detail={detail} controller={controller} currentUserUid={currentUserUid ?? ""}
    assignedStaffOnly={assignedStaffOnly} />;
  if (section === "people") return <SalesPeoplePanel key={detail.account.organizerId}
    detail={detail} controller={controller} assignedStaffOnly={assignedStaffOnly} />;
  if (section === "evidence") return <SalesEvidencePanel detail={detail}
    controller={controller} assignedStaffOnly={assignedStaffOnly} />;
  if (section === "suppression" && assignedStaffOnly) {
    return <EmptyState>Account restrictions require an authorized reviewer.</EmptyState>;
  }
  if (section === "suppression") return <SalesSuppressionPanel
    key={detail.account.organizerId} detail={detail} controller={controller} />;
  return <SalesDraftReadinessPanel />;
}
