import {
  CatchButton,
  CatchIndexRow,
  CatchPaneLayout,
  CatchSection,
  CatchTable,
  CatchText,
  CatchWorkspaceHeader,
  type CatchTableColumn,
} from "@catch/web-ui";
import type {
  SystemActivityFilter,
  SystemActivityRow,
  SystemHealthRow,
} from "../controllers/useSystemController";

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
const healthWord = {success: "Fresh", warning: "Check", danger: "Blocked"} as const;

/**
 * System: one activity log (what people and agents did in Admin, newest first) beside the health
 * of each data source. The activity table filters by who acted and by problems, and searches.
 */
export function SystemScreen({
  activityError,
  counts,
  filter,
  health,
  healthError,
  isActivityLoading,
  onFilterChanged,
  onQueryChanged,
  onRefresh,
  query,
  rows,
}: {
  activityError: string | null;
  counts: Record<SystemActivityFilter, number>;
  filter: SystemActivityFilter;
  health: SystemHealthRow[];
  healthError: string | null;
  isActivityLoading: boolean;
  onFilterChanged: (filter: SystemActivityFilter) => void;
  onQueryChanged: (query: string) => void;
  onRefresh: () => void;
  query: string;
  rows: SystemActivityRow[];
}) {
  const activity = (
    <>
      <CatchWorkspaceHeader
        actions={<CatchButton label="Refresh" onPressed={onRefresh} size="sm" variant="secondary" />}
        filters={{
          chips: filterLabels.map(([value, label]) => ({
            label,
            count: value === "everyone" ? undefined : counts[value],
            selected: filter === value,
            onPressed: () => onFilterChanged(value),
          })),
          search: {placeholder: "Search activity", value: query, onChanged: onQueryChanged},
        }}
        title="Activity"
      />
      {activityError ? (
        <CatchText as="p" color="danger" variant="bodyS">{activityError}</CatchText>
      ) : isActivityLoading ? (
        <CatchText as="p" color="ink2" variant="bodyS">Loading activity</CatchText>
      ) : rows.length === 0 ? (
        <CatchText as="p" color="ink2" variant="bodyM">{filter === "problems" ? "No action failed." : "No activity matches."}</CatchText>
      ) : (
        <CatchTable columns={columns} density="compact" label="Activity" rows={rows} />
      )}
    </>
  );
  const healthPane = (
    <>
      <CatchWorkspaceHeader title="Health" />
      {healthError ? <CatchText as="p" color="danger" variant="bodyS">{healthError}</CatchText> : null}
      <CatchSection title="Data sources">
        {health.map((source) => (
          <CatchIndexRow
            key={source.id}
            subtitle={source.subtitle}
            title={source.title}
            trailing={<CatchText as="span" color={healthColor[source.tone]} variant="supportingStrong">{healthWord[source.tone]}</CatchText>}
          />
        ))}
      </CatchSection>
    </>
  );
  return <CatchPaneLayout detail={healthPane} main={activity} pattern="queue" />;
}
