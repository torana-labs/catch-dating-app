import {CatchGap, CatchText, CatchField} from "@catch/web-ui";
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
import type {SalesAccountDetail} from "../api/salesTypes";

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
            " Review a contact on the host page, or choose Internal research."}</CatchText> : null}
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
  section: "draft" | "tasks";
  currentUserUid?: string;
  assignedStaffOnly?: boolean;
  detail: SalesAccountDetail; controller: SalesWorkspaceController;
}) {
  if (section === "tasks") return <SalesTasksPanel key={detail.account.organizerId}
    detail={detail} controller={controller} currentUserUid={currentUserUid ?? ""}
    assignedStaffOnly={assignedStaffOnly} />;
  return <SalesDraftReadinessPanel />;
}
