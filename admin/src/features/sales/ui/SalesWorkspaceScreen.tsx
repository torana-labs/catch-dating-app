import {CatchBadge, CatchField, CatchText} from "@catch/web-ui";
import {useEffect, useMemo, useState} from "react";
import {ArrowLeft, ClipboardList} from "lucide-react";
import {
  AdminButton, AdminDetailScreenStack, AdminDirectoryScreenStack, AdminForm, AdminToolbar, EmptyState, PageHeader, Panel, SegmentedControl, selectOptions, StateRow,
} from "../../../shared/ui/AdminPrimitives";
import {renderSalesPrivacyWorkspace} from "./SalesPrivacyWorkspace";
import {useAdminFeedback} from "../../../shared/feedback/AdminFeedbackContext";
import {dataMode} from "../../../shared/api/dataMode";
import {
  accountFormValues, researchStatusOptions, toLocalDateTimeInput,
  type SalesWorkspaceController,
  useSalesWorkspaceController,
} from "../controllers/useSalesWorkspaceController";
import type {
  SalesAccountDetail, SalesCustomFieldDefinition, SalesOpportunity, SalesResearchStatus,
} from "../api/salesTypes";
import {SalesRecordsWorkspace} from "./SalesRecordsPanels";
import {renderSalesSettingsWorkspace} from "./SalesSettingsPanel";
import {renderSalesImportedHistory} from "./SalesImportedHistoryPanel";

type DetailTab = "overview" | "workflow" | "activity" |
  "opportunities" | "research";

const detailTabs: Array<{id: DetailTab; label: string}> = [
  {id: "overview", label: "Overview"},
  {id: "workflow", label: "Workflow"},
  {id: "activity", label: "Activity"},
  {id: "opportunities", label: "Opportunities"},
  {id: "research", label: "Research"},
];
const stageOptions = [
  {value: "", label: "All stages"},
  {value: "new_enquiry", label: "New enquiry"},
  {value: "ready_to_contact", label: "Ready to contact"},
  {value: "contacted", label: "Contacted"},
  {value: "in_conversation", label: "In conversation"},
  {value: "demo_arranged", label: "Demo arranged"},
  {value: "demo_completed", label: "Demo completed"},
  {value: "pilot_agreed", label: "Pilot agreed"},
  {value: "pilot_running", label: "Pilot running"},
  {value: "commercial_discussion", label: "Commercial discussion"},
  {value: "closed_won", label: "Closed won"},
  {value: "closed_lost", label: "Closed lost"},
];

function labelFor(value: string | null | undefined): string {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\b\w/gu, (letter) =>
    letter.toUpperCase());
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value :
    date.toLocaleDateString(undefined, {day: "numeric", month: "short", year: "numeric"});
}

function ownerLabel(uid: string | null | undefined, currentUserUid: string): string {
  if (!uid) return "Unassigned";
  return uid === currentUserUid ? "You" : "Another teammate";
}

export function SalesWorkspaceScreen({
  area,
  currentUserUid,
  isAdminOwner = false,
  assignedStaffOnly = false,
  selectedOrganizerId,
  onBackToHosts,
  onGoToToday,
  onOpenOrganizer,
}: {
  area: "hosts" | "settings";
  currentUserUid: string;
  isAdminOwner?: boolean;
  assignedStaffOnly?: boolean;
  selectedOrganizerId: string | null;
  onBackToHosts: () => void;
  onGoToToday: () => void;
  onOpenOrganizer: (organizerId: string) => void;
}) {
  const {setError, setNotice} = useAdminFeedback();
  const controller = useSalesWorkspaceController({
    area, selectedOrganizerId, assignedStaffOnly,
    onError: setError, onNotice: setNotice,
  });
  const pageTitle = selectedOrganizerId ?
    controller.detail.data?.organizerSummary.name ?? "Host" :
    assignedStaffOnly ? "Assigned Sales" : "Settings";

  return (
    <AdminDirectoryScreenStack>
      <PageHeader eyebrow="Sales" title={pageTitle} actions={selectedOrganizerId ? (
        <AdminButton icon={<ArrowLeft size={16} />} onClick={onBackToHosts}>
          Back to hosts
        </AdminButton>
      ) : undefined}>
        {selectedOrganizerId ? "Private host workspace" : assignedStaffOnly ?
          "Work only on Sales records currently assigned to you." :
          "Custom fields, reviewed imports and privacy."}
        {dataMode() === "sample" ? " Sample data is shown." : ""}
      </PageHeader>
      {selectedOrganizerId ? (
        <HostDetail key={`${currentUserUid}:${selectedOrganizerId}:${assignedStaffOnly}`}
          controller={controller} currentUserUid={currentUserUid}
          isAdminOwner={isAdminOwner} assignedStaffOnly={assignedStaffOnly}
          onOpenOrganizer={onOpenOrganizer} />
      ) : assignedStaffOnly ? (
        <Panel title="Assigned Sales access" icon={<ClipboardList size={18} />}>
          <CatchText as="p" variant="supporting">Your role can use Today, Hosts and Deals for records currently
            assigned to you.</CatchText>
          <AdminButton onClick={onGoToToday}>Go to Today</AdminButton>
        </Panel>
      ) : (
        <>{renderSalesSettingsWorkspace(controller, isAdminOwner)}
          {renderSalesPrivacyWorkspace({actorUid: currentUserUid, isAdminOwner})}
        </>
      )}
    </AdminDirectoryScreenStack>
  );
}

function QueryState({
  loading, error, empty, onRetry,
}: {loading: boolean; error: unknown; empty: boolean; onRetry: () => void}) {
  if (loading) return <EmptyState>Loading sales records…</EmptyState>;
  if (error) return <EmptyState>
    Sales records could not be loaded. <AdminButton onClick={onRetry}>Try again</AdminButton>
  </EmptyState>;
  if (empty) return <EmptyState>No records match this view.</EmptyState>;
  return null;
}

function HostDetail({controller, currentUserUid, isAdminOwner, assignedStaffOnly,
  onOpenOrganizer}: {
  controller: SalesWorkspaceController; currentUserUid: string;
  isAdminOwner: boolean;
  assignedStaffOnly: boolean;
  onOpenOrganizer: (id: string) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const detail = controller.detail.data;
  if (controller.detail.isPending) return <EmptyState>Loading host…</EmptyState>;
  if (controller.detail.error || !detail) return <EmptyState>
    Host details could not be loaded.
    <AdminButton onClick={() => void controller.detail.refetch()}>Try again</AdminButton>
  </EmptyState>;
  return <AdminDetailScreenStack>
    <AdminToolbar>
      <CatchBadge label={`Research: ${labelFor(detail.account.researchStatus)}`} />
      <CatchBadge label={`Listing: ${labelFor(detail.organizerSummary.appVisibility)}`} />
      <CatchBadge label={`Claim: ${labelFor(detail.organizerSummary.claimStatus)}`} />
      {assignedStaffOnly ? null : <AdminButton
        onClick={() => onOpenOrganizer(detail.account.organizerId)}>
        Open organizer record
      </AdminButton>}
    </AdminToolbar>
    <SegmentedControl ariaLabel="Host detail tab" mobileLayout="content"
      mobileSelectLabel="Host detail section" options={detailTabs}
      value={tab} onChange={setTab} />
    {tab === "overview" || tab === "research" ?
      <HostAccountEditor key={detail.account.organizerId} detail={detail}
        controller={controller} currentUserUid={currentUserUid}
        assignedStaffOnly={assignedStaffOnly} /> : null}
    {tab === "activity" ? <>
      <HostActivity detail={detail} controller={controller} />
      {assignedStaffOnly ? null : renderSalesImportedHistory(
        detail.account.organizerId, currentUserUid)}
    </> : null}
    {tab === "opportunities" ? <HostOpportunities detail={detail}
      controller={controller} currentUserUid={currentUserUid} /> : null}
    {tab === "workflow" ? <SalesRecordsWorkspace section="draft" detail={detail}
      controller={controller} /> : null}
    {!assignedStaffOnly && (tab === "overview" || tab === "research") ?
      <HostCustomFields
      detail={detail} controller={controller} /> : null}
    <SalesRecordsWorkspace section="tasks" detail={detail} controller={controller}
      currentUserUid={currentUserUid} assignedStaffOnly={assignedStaffOnly} />
  </AdminDetailScreenStack>;
}

function HostCustomFields({detail, controller}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
}) {
  const fields = controller.customFields.data?.rows ?? [];
  return <Panel title="Additional host information" icon={<ClipboardList size={18} />}>
    <QueryState loading={controller.customFields.isPending}
      error={controller.customFields.error} empty={!fields.length}
      onRetry={() => void controller.customFields.refetch()} />
    {fields.map((field) => <CustomFieldValueEditor key={field.fieldId}
      field={field} detail={detail} controller={controller} />)}
  </Panel>;
}

function CustomFieldValueEditor({field, detail, controller}: {
  field: SalesCustomFieldDefinition; detail: SalesAccountDetail;
  controller: SalesWorkspaceController;
}) {
  const current = detail.customValues?.find((value) => value.fieldId === field.fieldId);
  const [textValue, setTextValue] = useState(() => String(current?.value ?? ""));
  const [dirty, setDirty] = useState(false);
  const [baseRevision, setBaseRevision] = useState(current?.revision ?? 0);
  useEffect(() => {
    if (dirty) return;
    setTextValue(String(current?.value ?? ""));
    setBaseRevision(current?.revision ?? 0);
  }, [current?.revision, current?.value, dirty]);
  const changedElsewhere = (current?.revision ?? 0) !== baseRevision;
  const validNumber = field.type !== "number" ||
    (textValue.trim() !== "" && Number.isFinite(Number(textValue)));
  const save = async () => {
    if (!textValue.trim() || !validNumber || changedElsewhere) return;
    const value = field.type === "number" ? Number(textValue) :
      field.type === "boolean" ? textValue === "true" : textValue.trim();
    const saved = await controller.saveCustomValue({
      organizerId: detail.account.organizerId, fieldId: field.fieldId,
      expectedRevision: baseRevision, value,
    });
    if (saved) setDirty(false);
  };
  const update = (value: string) => {setTextValue(value); setDirty(true);};
  return <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
    {field.type === "enum" ? <CatchField recipe="select" title={field.label} value={textValue}
      onChanged={(value) => update(value ?? "")} {...selectOptions([{value: "", label: "Choose"},
        ...(field.enumOptions ?? []).map((option) => ({
          value: option, label: option,
        }))])} /> : field.type === "boolean" ?
      <CatchField recipe="select" title={field.label} value={textValue}
        onChanged={(value) => update(value ?? "")}
        {...selectOptions([{value: "", label: "Unknown"}, {value: "true", label: "Yes"},
          {value: "false", label: "No"}])} /> :
      <CatchField recipe="input" title={field.label} value={textValue} onChanged={update}
        keyboardType={field.type === "number" ? "decimal" :
          field.type === "date" ? "date" : "text"} />}
    {field.helpText ? <CatchText as="p" variant="supporting">{field.helpText}</CatchText> : null}
    {!validNumber ? <CatchText as="p" variant="supporting" role="alert">Enter a valid number.</CatchText> : null}
    {changedElsewhere ? <CatchText as="p" variant="supporting" role="alert">This value changed elsewhere.
      Latest saved value: {String(current?.value ?? "Unknown")}.</CatchText> : null}
    <AdminButton type="submit" disabled={!dirty || changedElsewhere || !textValue.trim() ||
      !validNumber || controller.isSaving}>Save field</AdminButton>
    {changedElsewhere ? <AdminButton onClick={() => {
      setTextValue(String(current?.value ?? ""));
      setBaseRevision(current?.revision ?? 0);
      setDirty(false);
    }}>Use latest value</AdminButton> : null}
  </AdminForm>;
}

function HostAccountEditor({detail, controller, currentUserUid, assignedStaffOnly}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
  currentUserUid: string;
  assignedStaffOnly: boolean;
}) {
  const [form, setForm] = useState(() => accountFormValues(detail.account));
  const [dirty, setDirty] = useState(false);
  const [baseRevision, setBaseRevision] = useState(detail.account.revision);
  useEffect(() => {
    if (dirty) return;
    setForm(accountFormValues(detail.account));
    setBaseRevision(detail.account.revision);
  }, [detail.account, dirty]);
  const changedElsewhere = detail.account.revision !== baseRevision;
  const save = async () => {
    if (!dirty || changedElsewhere) return;
    const saved = await controller.saveAccount({
      organizerId: detail.account.organizerId,
      expectedRevision: baseRevision,
      patch: assignedStaffOnly ? {
        summary: form.summary.trim() || null,
        nextAction: form.nextAction.trim() || null,
      } : {
        researchStatus: form.researchStatus,
        assignedOwnerUid: form.assignedOwnerUid.trim() || null,
        summary: form.summary.trim() || null,
        nextAction: form.nextAction.trim() || null,
      },
    });
    if (saved) setDirty(false);
  };
  return <Panel title="Host summary" icon={<ClipboardList size={18} />} action={
    <AdminButton disabled={!dirty || changedElsewhere || controller.isSaving}
      variant="primary"
      onClick={() => void save()}>{controller.isSaving ? "Saving…" :
        assignedStaffOnly ? "Save summary" : "Save research"}</AdminButton>
  }>
    <CatchText as="p" variant="supporting">{detail.organizerSummary.name} ·
      {[detail.organizerSummary.city, detail.organizerSummary.marketLabel]
        .filter(Boolean).join(", ") || "Location not recorded"}</CatchText>
    {changedElsewhere ? <CatchText as="p" variant="supporting" role="alert">This host changed since you started editing.
      Compare the latest version below; your edits are retained.</CatchText> : null}
    <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      {assignedStaffOnly ? null : <CatchField recipe="select" title="Research status"
        value={form.researchStatus} {...selectOptions(researchStatusOptions)}
        onChanged={(value) => {
          setForm((current) => ({...current,
            researchStatus: (value ?? "") as SalesResearchStatus})); setDirty(true);
        }} />}
      {assignedStaffOnly ? null : <StateRow label="Owner" value={ownerLabel(form.assignedOwnerUid,
        currentUserUid)} />}
      {!assignedStaffOnly && form.assignedOwnerUid !== currentUserUid ? <AdminButton
        onClick={() => {setForm((current) => ({...current,
          assignedOwnerUid: currentUserUid})); setDirty(true);}}>
        Assign to me
      </AdminButton> : null}
      <CatchField recipe="input" title="Working summary" maxLines={4} value={form.summary}
        onChanged={(summary) => {
          setForm((current) => ({...current, summary})); setDirty(true);
        }} />
      <CatchField recipe="input" title="Next action" value={form.nextAction}
        onChanged={(nextAction) => {
          setForm((current) => ({...current, nextAction})); setDirty(true);
        }} />
    </AdminForm>
    {changedElsewhere ? <StateRow label="Latest saved version" value={<>
      Summary: {detail.account.summary || "None"}<br />
      Next action: {detail.account.nextAction || "None"}{" "}
      <AdminButton onClick={() => {
        setForm(accountFormValues(detail.account));
        setBaseRevision(detail.account.revision);
        setDirty(false);
      }}>Use latest version</AdminButton>
    </>} /> : null}
  </Panel>;
}

function HostActivity({detail, controller}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
}) {
  const [type, setType] = useState<"note" | "reply" | "call" | "demo" | "pilot" |
    "outreach_sent_manual">("note");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "other">("email");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    toLocalDateTimeInput(new Date()));
  const save = async () => {
    if (!note.trim() || Number.isNaN(new Date(occurredAt).getTime())) return;
    const saved = await controller.logActivity({
      organizerId: detail.account.organizerId, type,
      occurredAt: new Date(occurredAt).toISOString(), note: note.trim(),
      ...(type === "outreach_sent_manual" ? {
        channel, attestation: "sent_elsewhere_by_actor" as const,
      } : {}),
    });
    if (saved) setNote("");
  };
  return <Panel title="Activity" icon={<ClipboardList size={18} />}>
    <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      <CatchField recipe="select" title="What happened?" value={type}
        onChanged={(value) => setType((value ?? "") as typeof type)} {...selectOptions([
          {value: "note", label: "Research or conversation note"},
          {value: "call", label: "Call"},
          {value: "reply", label: "Reply received"},
          {value: "demo", label: "Demo"},
          {value: "pilot", label: "Pilot update"},
          {value: "outreach_sent_manual", label: "Sent elsewhere (manual log)"},
        ])} />
      {type === "outreach_sent_manual" ? <>
        <CatchField recipe="select" title="Channel" value={channel}
          onChanged={(value) => setChannel((value ?? "") as typeof channel)} {...selectOptions([
            {value: "email", label: "Email"},
            {value: "whatsapp", label: "WhatsApp"},
            {value: "other", label: "Other"},
          ])} />
        <CatchText as="p" variant="supporting">You attest this was sent outside Catch. Delivery is unconfirmed.</CatchText>
      </> : null}
      <CatchField recipe="input" title="When" value={occurredAt} onChanged={setOccurredAt}
        keyboardType="datetime" />
      <CatchField recipe="input" title="What should the team know?" maxLines={3} value={note}
        onChanged={setNote} />
      <AdminButton type="submit" variant="primary"
        disabled={!note.trim() || controller.isSaving}>Record activity</AdminButton>
    </AdminForm>
    {detail.activities.length ? detail.activities.map((activity) =>
      <StateRow key={activity.activityId} label={labelFor(activity.type)}
        value={<>{dateLabel(activity.occurredAt)} · {activity.note}
          {activity.type === "outreach_sent_manual" ?
            ` · ${activity.channel || "other"} · Actor-attested; delivery unconfirmed` : ""}
        </>} />
    ) : <EmptyState>No activity recorded yet.</EmptyState>}
  </Panel>;
}

function HostOpportunities({detail, controller, currentUserUid}: {
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
  currentUserUid: string;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [selectedRevision, setSelectedRevision] = useState(0);
  const [transitionReason, setTransitionReason] = useState("");
  const selected = useMemo(() => detail.opportunities.find((item) =>
    item.opportunityId === selectedId), [detail.opportunities, selectedId]);
  const [motion, setMotion] = useState("first_workflow_pilot");
  const [stage, setStage] = useState("new_enquiry");
  const [ownerUid, setOwnerUid] = useState(currentUserUid);
  const [nextStep, setNextStep] = useState("");
  const [nextStepAt, setNextStepAt] = useState("");
  const select = (item: SalesOpportunity | null) => {
    setTransitionReason("");
    setSelectedId(item?.opportunityId ?? "");
    setSelectedRevision(item?.revision ?? 0);
    setMotion(item?.motion ?? "first_workflow_pilot");
    setStage(item?.stage ?? "new_enquiry");
    setOwnerUid(item?.ownerUid ?? currentUserUid);
    setNextStep(item?.nextStep ?? "");
    setNextStepAt(item?.nextStepAt ?
      toLocalDateTimeInput(new Date(item.nextStepAt)) : "");
  };
  const save = async () => {
    if (selected && selected.revision !== selectedRevision) return;
    if (!ownerUid.trim() || !nextStep.trim() || !nextStepAt) return;
    const saved = await controller.saveOpportunity({
      organizerId: detail.account.organizerId,
      opportunityId: selected?.opportunityId,
      expectedRevision: selectedRevision,
      ...(transitionReason.trim() ? {transitionReason: transitionReason.trim()} : {}),
      fields: {motion, stage, ownerUid: ownerUid.trim(),
        nextStep: nextStep.trim(), nextStepAt: new Date(nextStepAt).toISOString()},
    });
    if (saved) select(null);
  };
  return <Panel title="Opportunities" icon={<ClipboardList size={18} />}>
    {detail.opportunities.map((item) => <StateRow key={item.opportunityId}
      label={labelFor(item.stage)} value={<>
        {labelFor(item.motion)} · {item.nextStep} ({dateLabel(item.nextStepAt)}){" "}
        <AdminButton onClick={() => select(item)}>Update</AdminButton>
      </>} />)}
    {!detail.opportunities.length ? <EmptyState>No opportunity recorded yet.</EmptyState> : null}
    <AdminForm onSubmit={(event) => {event.preventDefault(); void save();}}>
      <CatchText as="h3" variant="sectionTitle">{selected ? "Update opportunity" : "New opportunity"}</CatchText>
      {selected && selected.revision !== selectedRevision ? <p role="alert">
        This opportunity changed while you were editing. Review the latest stage and
        next step before saving.
        <AdminButton onClick={() => select(selected)}>Use latest version</AdminButton>
      </p> : null}
      <CatchField recipe="select" title="Motion" value={motion}
        onChanged={(value) => setMotion(value ?? "")} {...selectOptions([
        {value: "first_workflow_pilot", label: "First workflow pilot"},
        {value: "listing_claim_assistance", label: "Listing claim assistance"},
        {value: "inbound_stack_review", label: "Inbound stack review"},
        {value: "expansion", label: "Expansion"},
        {value: "renewal", label: "Renewal"},
      ])} />
      <CatchField recipe="select" title="Stage" value={stage}
        onChanged={(value) => setStage(value ?? "")}
        {...selectOptions(stageOptions.filter((item) => item.value &&
          (item.value !== "closed_won" || selected?.stage === "closed_won")))} />
      <StateRow label="Owner" value={ownerLabel(ownerUid, currentUserUid)} />
      {ownerUid !== currentUserUid ? <AdminButton onClick={() =>
        setOwnerUid(currentUserUid)}>Assign to me</AdminButton> : null}
      {stage === "closed_lost" || selected?.stage === "closed_lost" ? (
        <CatchField recipe="input" title="Reason for closing or reopening" value={transitionReason}
          onChanged={setTransitionReason} maxLines={3} />
      ) : null}
      {stage === "closed_won" ? <CatchText as="p" variant="supporting">Payment-backed closing is managed in Pilot &amp; terms.</CatchText> : null}
      <CatchField recipe="input" title="Next step" value={nextStep} onChanged={setNextStep} />
      <CatchField recipe="input" title="Due" value={nextStepAt} onChanged={setNextStepAt}
        keyboardType="datetime" />
      <AdminButton type="submit" variant="primary" disabled={controller.isSaving ||
        (selected && selected.revision !== selectedRevision) ||
        stage === "closed_won" ||
        ((stage === "closed_lost" || selected?.stage === "closed_lost") &&
          !transitionReason.trim()) ||
        !ownerUid.trim() || !nextStep.trim() || !nextStepAt}>
        {selected ? "Save opportunity" : "Add opportunity"}
      </AdminButton>
      {selected ? <AdminButton onClick={() => select(null)}>Cancel editing</AdminButton> : null}
    </AdminForm>
  </Panel>;
}
