import {
  CatchDock,
  CatchEmptyState,
  CatchMetaRow,
  CatchPaneLayout,
  CatchSection,
  CatchTable,
  CatchWorkspaceHeader,
  type CatchSectionStep,
  type CatchTableColumn,
} from "@catch/web-ui";
import {useState, type ReactNode} from "react";
import type {SalesAccountDetail, SalesTask} from "../api/salesTypes";
import {dueLabel, researchLabels, stageLabel, taskKindLabels, todayKinds, todayScopeLabels, type TodayKind, type TodayScope} from "../controllers/salesLabels";
import type {SalesTodayController} from "../controllers/useSalesTodayController";

export type SalesTodayModel = Pick<SalesTodayController,
  "scope" | "setScope" | "kind" | "setKind" | "rows" | "counts" | "selected" | "nextTask" | "position" |
  "logAndComplete" | "snooze" | "complete" | "isSaving"> & {account: SalesAccountDetail | null; names: ReadonlyMap<string, string>};

interface Row {
  key: string;
  task: {title: string; subtitle?: string};
  kind: {label: string; tone: "neutral"};
  stage: string;
  due: {text: string; tone?: "warning" | "danger"};
}

const columns: CatchTableColumn<Row>[] = [
  {key: "task", label: "Task", kind: "title"},
  {key: "kind", label: "Kind", kind: "badge", width: "110px"},
  {key: "stage", label: "Stage", width: "120px"},
  {key: "due", label: "Due", width: "110px", sort: "asc", align: "end"},
];

function inspector(model: SalesTodayModel, task: SalesTask, note: string, setNote: (value: string) => void, onClose: () => void) {
  const account = model.account;
  const research = account ? researchLabels[account.account.researchStatus] : null;
  const due = dueLabel(task.dueAt);
  const deal = account?.opportunities[0];
  const steps: CatchSectionStep[] = [
    ...(account?.activities ?? []).slice(0, 6).reverse().map((activity): CatchSectionStep => ({
      title: activity.note || activity.type, meta: new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short"})
        .format(new Date(activity.occurredAt)), state: "done"})),
    {title: task.title, subtitle: due.text, meta: "Now", state: "current", ...(due.tone ? {tone: due.tone} : {})},
  ];
  return (
    <>
      <CatchWorkspaceHeader title={model.names.get(task.organizerId) ?? account?.organizerSummary.name ?? "Host"} kicker="Today"
        back={{label: "Back to Today", onPressed: onClose, close: true}}
        {...(model.position ? {position: {label: `${model.position.index} of ${model.position.of}`}} : {})} />
      <CatchMetaRow columns={2} entries={[
        {label: "Task", value: task.title, wide: true},
        {label: "Due", value: due.text, ...(due.tone ? {tone: due.tone} : {})},
        {label: "Stage", value: deal ? stageLabel(deal.stage) : "No deal yet"},
        {label: "Research", value: research?.text ?? "…", ...(research?.tone ? {tone: research.tone} : {})},
        {label: "City", value: account?.organizerSummary.city ?? "Not set"},
        ...(account?.account.summary ? [{label: "Summary", value: account.account.summary, wide: true}] : []),
      ]} />
      <CatchSection title="How it got here" timeline={steps} dividers="none" />
      {task.status === "open" ? (
        <CatchDock recipe="pane"
          primary={{label: "Log what happened", isLoading: model.isSaving,
            onPressed: note.trim() ? () => void model.logAndComplete(task, note.trim()) : null}}
          secondary={{label: "Snooze to Monday", onPressed: () => void model.snooze(task)}}
          danger={{label: "Done, nothing to log", onPressed: () => void model.complete(task)}}
          note={{label: "What happened", placeholder: "Called them; demo on Tuesday", value: note, onChanged: setNote}}
          next={model.nextTask ? `Then ${model.names.get(model.nextTask.organizerId) ?? model.nextTask.title}` : "Then you're done for today"} />
      ) : null}
    </>
  );
}

/** A sales associate's day: their tasks by when they are due, done from the pane beside them. */
export function SalesTodayScreen({model, selectedTaskId, onSelect, tabs}: {
  model: SalesTodayModel;
  selectedTaskId: string | null;
  onSelect: (taskId: string | null) => void;
  /** The owner's Today, Hosts and Deals tabs. */
  tabs?: ReactNode;
}) {
  const [note, setNote] = useState("");
  const rows: Row[] = model.rows.map((task) => {
    const due = dueLabel(task.dueAt);
    return {
      key: task.taskId,
      task: {title: model.names.get(task.organizerId) ?? task.title, subtitle: task.title},
      kind: {label: taskKindLabels[task.kind], tone: "neutral"},
      stage: task.status === "open" ? "Open" : "Done",
      due: {text: due.text, ...(due.tone ? {tone: due.tone} : {})},
    };
  });
  const scopes = (Object.keys(todayScopeLabels) as TodayScope[]).map((value) => ({value, label: todayScopeLabels[value],
    ...(value !== "done" ? {count: model.counts[value]} : {})}));
  return (
    <CatchPaneLayout
      pattern="queue"
      detailOpen={selectedTaskId !== null}
      main={<>
        <CatchWorkspaceHeader title="Today" count={model.counts.week} actions={tabs}
          note={[model.counts.due ? `${model.counts.due} due` : null].filter(Boolean).join(" · ") || null}
          views={{items: scopes, value: model.scope, label: "When", onChanged: (value) => model.setScope(value as TodayScope)}}
          filters={{chips: [
            {label: "All", count: model.rows.length, selected: model.kind === null, onPressed: () => model.setKind(null)},
            ...todayKinds.map((entry) => ({label: entry.label, count: model.counts.kinds[entry.value],
              selected: model.kind === entry.value, onPressed: () => model.setKind(entry.value as TodayKind)})),
          ]}} />
        {rows.length ? <CatchTable columns={columns} rows={rows} label="Today" rowKey="key" selectedKey={selectedTaskId}
          onRowPressed={(row) => { setNote(""); onSelect(row.key); }} density="compact" /> :
          <CatchEmptyState title="Nothing due" message="Every task in this view is done." kind="done" />}
      </>}
      detail={model.selected && selectedTaskId ? inspector(model, model.selected, note, setNote, () => onSelect(null)) :
        <CatchEmptyState title="Pick a task" message="Its host and what happened so far open here." />}
    />
  );
}
