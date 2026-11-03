import {
  CatchButton,
  CatchIndexRow,
  CatchMetaRow,
  CatchPaneLayout,
  CatchSection,
  CatchTable,
  CatchLegacyText,
  CatchWorkspaceHeader,
  useCatchPane,
  type CatchTableColumn,
} from "@catch/web-ui";
import {useState} from "react";
import {
  receiptFacts,
  type SystemActivityFilter,
  type SystemActivityRow,
} from "../controllers/useSystemController";
import {
  formatWhen,
  type SystemHealthSource,
  type SystemHealthSourceId,
  type SystemSignal,
} from "../controllers/systemHealth";

const columns: CatchTableColumn<SystemActivityRow>[] = [
  {key: "who", label: "Who", kind: "title", width: "200px"},
  {key: "what", label: "What"},
  {key: "when", label: "When", width: "170px", sort: "desc"},
  {key: "result", label: "Result", width: "120px"},
];

const filterLabels: Array<[SystemActivityFilter, string]> = [
  ["everyone", "Everyone"],
  ["people", "People"],
  ["automatic", "Automatic"],
  ["problems", "Problems"],
];

const healthColor = {success: "positiveText", warning: "attentionText", danger: "danger"} as const;
const sourceWord = {success: "Fresh", warning: "Check", danger: "Failed"} as const;
const signalWord = {success: "Fine", warning: "Check", danger: "Blocked"} as const;
const metaTone = {success: "success", warning: "warning", danger: "danger"} as const;

/** Health sits beside the activity on a wide screen; on a phone it opens from here. */
function HealthAction({onPressed, when}: {onPressed: () => void; when: "split" | "narrow"}) {
  const {split} = useCatchPane();
  if (split !== (when === "split")) return null;
  return <CatchButton label="Health" onPressed={onPressed} size="sm" variant="secondary" />;
}

function ActivityReceipt({onClose, row}: {onClose: () => void; row: SystemActivityRow}) {
  return (
    <>
      <CatchWorkspaceHeader
        actions={<HealthAction onPressed={onClose} when="split" />}
        back={{label: "Back to activity", close: true, onPressed: onClose}}
        kicker="Activity"
        title={row.what}
      />
      {row.record.status === "indeterminate" ? (
        <CatchLegacyText as="p" color="attentionText" variant="bodyS">
          The result was lost, so this may or may not have happened. Check the record before trying again.
        </CatchLegacyText>
      ) : null}
      <CatchMetaRow entries={receiptFacts(row.record)} />
      <CatchLegacyText as="p" color="ink2" variant="bodyS">
        Requests and responses are never stored here, only their hashes.
      </CatchLegacyText>
    </>
  );
}

function SignalDetail({canOpenPath, onClose, onOpenPath, signal}: {
  canOpenPath: (path: string) => boolean;
  onClose: () => void;
  onOpenPath: (path: string) => void;
  signal: SystemSignal;
}) {
  const path = signal.path !== null && canOpenPath(signal.path) ? signal.path : null;
  return (
    <>
      <CatchWorkspaceHeader
        actions={<HealthAction onPressed={onClose} when="split" />}
        back={{label: "Back to health", close: true, onPressed: onClose}}
        kicker="Health"
        title={signal.label}
      />
      <CatchMetaRow entries={[
        {label: "State", value: signalWord[signal.tone], tone: metaTone[signal.tone]},
        {label: "Owner", value: signal.owner},
        {label: "Source", value: signal.source},
        {label: "Read", value: signal.readAt ? formatWhen(signal.readAt) : "No written time"},
        {label: "What we found", value: signal.evidence, wide: true},
        {label: "What this means", value: signal.meaning, wide: true},
        {label: "Next", value: signal.nextAction, wide: true},
        {label: "Runbook", value: signal.runbook, wide: true},
      ]} />
      {path ? <CatchButton label="Open where it's handled" onPressed={() => onOpenPath(path)} size="sm" variant="secondary" /> : null}
      <CatchLegacyText as="p" color="ink2" variant="bodyS">
        This only reads. Nothing here acknowledges a signal or changes a record.
      </CatchLegacyText>
    </>
  );
}

function SignalRows({onSignalSelected, signals, title}: {
  onSignalSelected: (id: string) => void;
  signals: SystemSignal[];
  title: string;
}) {
  if (signals.length === 0) return null;
  return (
    <CatchSection title={title}>
      {signals.map((signal) => (
        <CatchIndexRow
          key={signal.id}
          onTap={() => onSignalSelected(signal.id)}
          subtitle={`${signal.source} · ${signal.owner}`}
          title={signal.label}
          trailing={<CatchLegacyText as="span" color={healthColor[signal.tone]} variant="supportingStrong">{signalWord[signal.tone]}</CatchLegacyText>}
        />
      ))}
    </CatchSection>
  );
}

/**
 * System: one activity log (what people and agents did in Admin, newest first) beside the health
 * of each data source. The activity table filters by who acted and by problems, and searches;
 * a row opens its receipt in place of the health pane, and a signal opens the same way.
 */
export function SystemScreen({
  activityError,
  canOpenPath,
  counts,
  filter,
  hasMore,
  isActivityLoading,
  isLoadingMore,
  onFilterChanged,
  onLoadMore,
  onOpenPath,
  onQueryChanged,
  onRefresh,
  onRetrySource,
  onRowSelected,
  onSignalSelected,
  query,
  rows,
  selected,
  selectedSignal,
  signals,
  sources,
}: {
  activityError: string | null;
  canOpenPath: (path: string) => boolean;
  counts: Record<SystemActivityFilter, number>;
  filter: SystemActivityFilter;
  hasMore: boolean;
  isActivityLoading: boolean;
  isLoadingMore: boolean;
  onFilterChanged: (filter: SystemActivityFilter) => void;
  onLoadMore: () => void;
  onOpenPath: (path: string) => void;
  onQueryChanged: (query: string) => void;
  onRefresh: () => void;
  onRetrySource: (id: SystemHealthSourceId) => void;
  onRowSelected: (key: string | null) => void;
  onSignalSelected: (id: string | null) => void;
  query: string;
  rows: SystemActivityRow[];
  selected: SystemActivityRow | null;
  selectedSignal: SystemSignal | null;
  signals: SystemSignal[];
  sources: SystemHealthSource[];
}) {
  const [healthOpen, setHealthOpen] = useState(false);
  const activity = (
    <>
      <CatchWorkspaceHeader
        actions={(
          <>
            <HealthAction onPressed={() => setHealthOpen(true)} when="narrow" />
            <CatchButton label="Refresh" onPressed={onRefresh} size="sm" variant="secondary" />
          </>
        )}
        filters={{
          chips: filterLabels.map(([value, label]) => ({
            label,
            count: value === "everyone" ? undefined : counts[value],
            selected: filter === value,
            onPressed: () => onFilterChanged(value),
          })),
          search: {placeholder: "Search activity", value: query, onChanged: onQueryChanged},
        }}
        note={counts.everyone > 0 ? `${counts.everyone} loaded` : undefined}
        title="Activity"
      />
      {activityError ? <CatchLegacyText as="p" color="danger" variant="bodyS">{activityError}</CatchLegacyText> : null}
      {isActivityLoading ? (
        <CatchLegacyText as="p" color="ink2" variant="bodyS">Loading activity</CatchLegacyText>
      ) : rows.length > 0 ? (
        <CatchTable
          columns={columns}
          density="compact"
          label="Activity"
          onRowPressed={(row) => onRowSelected(row.key)}
          rows={rows}
          selectedKey={selected?.key ?? null}
        />
      ) : activityError ? null : (
        <CatchLegacyText as="p" color="ink2" variant="bodyM">
          {filter === "problems" ? "No action failed or needs checking." : "No activity matches."}
        </CatchLegacyText>
      )}
      {hasMore ? (
        <CatchButton
          label="Load more"
          onPressed={onLoadMore}
          size="sm"
          status={isLoadingMore ? "loading" : "idle"}
          variant="secondary"
        />
      ) : null}
    </>
  );
  const healthPane = (
    <>
      <CatchWorkspaceHeader back={{label: "Back to activity", close: true, onPressed: () => setHealthOpen(false)}} title="Health" />
      <CatchSection title="Data sources">
        {sources.map((source) => (
          <CatchIndexRow
            key={source.id}
            subtitle={source.subtitle}
            title={source.title}
            trailing={source.failed ? (
              <CatchButton label="Try again" onPressed={() => onRetrySource(source.id)} size="sm" variant="secondary" />
            ) : (
              <CatchLegacyText as="span" color={healthColor[source.tone]} variant="supportingStrong">{sourceWord[source.tone]}</CatchLegacyText>
            )}
          />
        ))}
      </CatchSection>
      <SignalRows
        onSignalSelected={onSignalSelected}
        signals={signals.filter((signal) => signal.tone !== "success")}
        title="Data problems"
      />
      <SignalRows
        onSignalSelected={onSignalSelected}
        signals={signals.filter((signal) => signal.tone === "success")}
        title="Fine"
      />
    </>
  );
  return (
    <CatchPaneLayout
      detail={selected ? <ActivityReceipt onClose={() => onRowSelected(null)} row={selected} /> :
        selectedSignal ? (
          <SignalDetail
            canOpenPath={canOpenPath}
            onClose={() => onSignalSelected(null)}
            onOpenPath={onOpenPath}
            signal={selectedSignal}
          />
        ) : healthPane}
      detailOpen={selected !== null || selectedSignal !== null || healthOpen}
      main={activity}
      pattern="queue"
    />
  );
}
