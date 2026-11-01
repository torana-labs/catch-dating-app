import {
  CatchButton,
  CatchEmptyState,
  CatchIndexRow,
  CatchMetaRow,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchSection,
  CatchTable,
  CatchWorkspaceHeader,
  type CatchTableColumn,
} from "@catch/web-ui";
import type {SalesAccountDetail} from "../api/salesTypes";
import {dueLabel, researchLabels, stageLabel, taskKindLabels} from "../controllers/salesLabels";
import type {HostTab, SalesHostsController} from "../controllers/useSalesHostsController";

export type SalesHostsModel = Pick<SalesHostsController,
  "query" | "setQuery" | "rows" | "hasNextPage" | "hasPreviousPage" | "nextPage" | "previousPage" | "tab" | "setTab"> & {
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

function hostPage(model: SalesHostsModel, host: SalesAccountDetail, onBack: () => void, onOpenOrganizer: () => void) {
  const research = researchLabels[host.account.researchStatus];
  const deal = host.opportunities[0];
  const openTasks = host.tasks.filter((task) => task.status === "open");
  const conversations = host.activities.filter((activity) => activity.type !== "note");
  const notes = host.activities.filter((activity) => activity.type === "note");
  const date = (value: string) => new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short"}).format(new Date(value));
  const counts: Partial<Record<HostTab, number>> = {conversations: conversations.length, deals: host.opportunities.length};
  let body;
  if (model.tab === "overview") {
    body = <>
      <CatchMetaRow columns={2} entries={[
        {label: "Stage", value: deal ? stageLabel(deal.stage) : "No deal yet"},
        {label: "Research", value: research.text, ...(research.tone ? {tone: research.tone} : {})},
        {label: "City", value: host.organizerSummary.city ?? "Not set"},
        {label: "On Catch", value: host.organizerSummary.claimStatus === "claimed" ? "Claimed" :
          host.organizerSummary.appVisibility === "discoverable" ? "Listed" : "Listed, hidden"},
        ...(host.account.summary ? [{label: "Summary", value: host.account.summary, wide: true}] : []),
      ]} />
      <CatchSection title="Next steps" count={openTasks.length} dividers="none"
        empty={<CatchEmptyState title="No next step" message="Add one from Today." kind="done" />}>
        {openTasks.map((task) => <CatchIndexRow key={task.taskId} title={task.title} titleVariant="bodyM"
          subtitle={`${taskKindLabels[task.kind]} · ${dueLabel(task.dueAt).text}`} />)}
      </CatchSection>
    </>;
  } else if (model.tab === "deals") {
    body = <CatchSection title="Deals" count={host.opportunities.length} dividers="none">
      {host.opportunities.map((item) => <CatchIndexRow key={item.opportunityId} title={stageLabel(item.stage)} titleVariant="bodyM"
        subtitle={[item.nextStep, item.nextStepAt ? date(item.nextStepAt) : null].filter(Boolean).join(" · ") || undefined} />)}
    </CatchSection>;
  } else {
    const list = model.tab === "conversations" ? conversations : notes;
    body = <CatchSection title={model.tab === "conversations" ? "Conversations" : "Notes"} count={list.length} dividers="none"
      empty={<CatchEmptyState title={model.tab === "conversations" ? "No conversations logged" : "No notes yet"} />}>
      {list.map((activity) => <CatchIndexRow key={activity.activityId} title={activity.note || activity.type} titleVariant="bodyM"
        subtitle={`${activity.type.replace(/_/gu, " ")} · ${date(activity.occurredAt)}`} />)}
    </CatchSection>;
  }
  return <>
    <CatchWorkspaceHeader title={host.organizerSummary.name} kicker="Sales · Hosts" back={{label: "Back to hosts", onPressed: onBack}}
      actions={<CatchButton label="Organizer page" variant="secondary" size="sm" onPressed={onOpenOrganizer} />} />
    <CatchPageTabBar label="Host" selected={model.tab} size="sm" onChanged={(value) => model.setTab(value as HostTab)}
      options={tabs.map((tab) => ({...tab, ...(counts[tab.value] !== undefined ? {count: counts[tab.value]} : {})}))} />
    {body}
  </>;
}

/** Hosts: the accounts in Sales, searchable, and one host's page with four tabs. */
export function SalesHostsScreen({model, selectedOrganizerId, onSelect, onOpenOrganizer}: {
  model: SalesHostsModel;
  selectedOrganizerId: string | null;
  onSelect: (organizerId: string | null) => void;
  onOpenOrganizer: (organizerId: string) => void;
}) {
  if (selectedOrganizerId && model.host) {
    return <CatchPaneLayout pattern="reading"
      main={hostPage(model, model.host, () => onSelect(null), () => onOpenOrganizer(selectedOrganizerId))} />;
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
          {model.hasPreviousPage ? <CatchButton label="Previous" variant="secondary" size="sm" onPressed={model.previousPage} /> : null}
          {model.hasNextPage ? <CatchButton label="More" variant="secondary" size="sm" onPressed={model.nextPage} /> : null}
        </>} />
      <CatchTable columns={columns} rows={rows} label="Hosts" rowKey="key" onRowPressed={(row) => onSelect(row.key)} density="compact" />
    </>} />
  );
}
