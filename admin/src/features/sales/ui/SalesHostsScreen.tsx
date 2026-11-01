import {
  CatchButton,
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
  CatchWorkspaceHeader,
  type CatchTableColumn,
} from "@catch/web-ui";
import {useState} from "react";
import type {SalesAccountDetail, SalesOpportunity, SalesTaskKind} from "../api/salesTypes";
import {
  dueLabel,
  hostActivityTypes,
  movableStages,
  researchLabels,
  stageLabel,
  taskKindLabels,
} from "../controllers/salesLabels";
import type {HostTab, SalesHostsController} from "../controllers/useSalesHostsController";

export type SalesHostsModel = Pick<SalesHostsController,
  "query" | "setQuery" | "rows" | "hasNextPage" | "hasPreviousPage" | "nextPage" | "previousPage" | "tab" | "setTab" |
  "contacts" | "logActivity" | "addNextStep" | "completeNextStep" | "saveDeal" | "isSaving"> & {
  host: SalesAccountDetail | null;
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

/** What a datetime field shows: local wall-clock time, not UTC. */
function localInput(at: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

function tomorrowMorning(): string {
  const at = new Date(Date.now() + 86_400_000);
  at.setHours(10, 0, 0, 0);
  return localInput(at);
}

const isoFrom = (local: string): string | null => {
  const at = new Date(local);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
};

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
  const dueAt = isoFrom(due);
  const submit = async () => {
    if (dueAt && await model.addNextStep({kind, title: title.trim(), dueAt})) onClose();
  };
  return (
    <CatchSheet recipe="standard" open onClose={onClose} title="Add a next step" subtitle="Hosts"
      footer={<CatchButton label={model.isSaving ? "Saving" : "Add"} onPressed={title.trim() && dueAt && !model.isSaving ? () => void submit() : null} />}>
      <CatchGap size="related">
        <CatchField recipe="input" title="What's next" value={title} onChanged={setTitle} inputHint="Send pilot terms" />
        <CatchField recipe="select" title="Kind" value={kind} values={nextStepKinds}
          itemLabelBuilder={(value) => taskKindLabels[value as SalesTaskKind] ?? value}
          onChanged={(value) => setKind((value ?? "follow_up") as SalesTaskKind)} />
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
          helperText={won ? "A won deal is closed by its payment, in All tools." : "Closing as won needs payment proof, in All tools."}
          onChanged={(value) => setStage(value ?? stage)} />
        <CatchField recipe="input" title="Next step" value={nextStep} onChanged={setNextStep} />
        <CatchField recipe="input" title="Due" value={due} onChanged={setDue} keyboardType="datetime" />
        {needsReason ? <CatchField recipe="input" title="Why it closed, or why it's reopening" maxLines={3} value={reason} onChanged={setReason} /> : null}
      </CatchGap>
    </CatchSheet>
  );
}

type HostSheet = {kind: "log"} | {kind: "step"} | {kind: "deal"; deal: SalesOpportunity | null};

/** One host: its facts and history beside what's next and who's involved. Everything rarer is in All tools. */
function HostPage({model, host, onBack, onOpenOrganizer, onOpenTools}: {
  model: SalesHostsModel;
  host: SalesAccountDetail;
  onBack: () => void;
  onOpenOrganizer: () => void;
  onOpenTools: () => void;
}) {
  const [sheet, setSheet] = useState<HostSheet | null>(null);
  const close = () => setSheet(null);
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
      <CatchMetaRow columns={2} entries={[
        {label: "Stage", value: deal ? stageLabel(deal.stage) : "No deal yet"},
        {label: "Research", value: research.text, ...(research.tone ? {tone: research.tone} : {})},
        {label: "City", value: host.organizerSummary.city ?? "Not set"},
        {label: "On Catch", value: host.organizerSummary.claimStatus === "claimed" ? "Claimed" :
          host.organizerSummary.appVisibility === "discoverable" ? "Listed" : "Listed, hidden"},
        ...(host.account.summary ? [{label: "Summary", value: host.account.summary, wide: true}] : []),
      ]} />
    );
  } else if (model.tab === "deals") {
    body = <CatchSection title="Deals" count={host.opportunities.length} dividers="none"
      action={host.opportunities.length ? undefined : {label: "Start a deal", onPressed: () => setSheet({kind: "deal", deal: null})}}
      empty={<CatchEmptyState title="No deal yet" />}>
      {host.opportunities.map((item) => <CatchIndexRow key={item.opportunityId} title={stageLabel(item.stage)} titleVariant="bodyM"
        subtitle={[item.nextStep, item.nextStepAt ? date(item.nextStepAt) : null].filter(Boolean).join(" · ") || undefined}
        trailing={<CatchButton label="Move" variant="secondary" size="sm" onPressed={() => setSheet({kind: "deal", deal: item})} />} />)}
    </CatchSection>;
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
      </>}
      aside={<CatchGap size="section">
        <CatchSection title="Next steps" count={openTasks.length} dividers="none" action={{label: "Add", onPressed: () => setSheet({kind: "step"})}}
          empty={<CatchEmptyState title="No next step" kind="done" />}>
          {openTasks.map((task) => <CatchIndexRow key={task.taskId} title={task.title} titleVariant="bodyM"
            subtitle={`${taskKindLabels[task.kind]} · ${dueLabel(task.dueAt).text}`}
            trailing={<CatchButton label="Done" variant="secondary" size="sm"
              onPressed={model.isSaving ? null : () => void model.completeNextStep(task)} />} />)}
        </CatchSection>
        <CatchSection title="People" count={model.contacts.length} dividers="none" empty={<CatchEmptyState title="No one yet" />}>
          {model.contacts.map((contact) => <CatchIndexRow key={contact.contactId} title={contact.displayName} titleVariant="bodyM"
            subtitle={[contact.relationship.role, ...(contact.relationship.endpoints ?? []).map((endpoint) => endpoint.value)].filter(Boolean).join(" · ") || undefined} />)}
        </CatchSection>
        <CatchSection title="More" dividers="none">
          <CatchIndexRow title="Organizer page" titleVariant="bodyM" onTap={onOpenOrganizer} />
          <CatchIndexRow title="All tools" titleVariant="bodyM" subtitle="Edit the host, people, evidence, holds, pilots, quotes, fit, demos and privacy" onTap={onOpenTools} />
        </CatchSection>
      </CatchGap>} />
  );
}

/** Hosts: the accounts in Sales, searchable, and one host's page with four tabs. */
export function SalesHostsScreen({model, selectedOrganizerId, onSelect, onOpenOrganizer, onOpenHostTools, onAddHost}: {
  model: SalesHostsModel;
  selectedOrganizerId: string | null;
  onSelect: (organizerId: string | null) => void;
  /** The older host page: editing, stage moves, pilots, quotes, people and evidence. */
  onOpenHostTools: (organizerId: string) => void;
  /** The older form to add a host or nominate an organizer. */
  onAddHost: () => void;
  onOpenOrganizer: (organizerId: string) => void;
}) {
  if (selectedOrganizerId && model.host) {
    return <HostPage key={selectedOrganizerId} model={model} host={model.host} onBack={() => onSelect(null)}
      onOpenOrganizer={() => onOpenOrganizer(selectedOrganizerId)} onOpenTools={() => onOpenHostTools(selectedOrganizerId)} />;
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
