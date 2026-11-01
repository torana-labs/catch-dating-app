import {
  CatchButton,
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
import type {MyNominationsFilter} from "../api/myNominationsRepository";
import {cityLabel} from "../controllers/salesLabels";
import type {MyNominationsController} from "../controllers/useMyNominationsController";

export type MyNominationsModel = Pick<MyNominationsController,
  "filter" | "setFilter" | "rows" | "totals" | "hasNextPage" | "hasPreviousPage" | "nextPage" | "previousPage" |
  "detail" | "detailError">;

interface Row {
  key: string;
  org: {title: string; subtitle: string};
  state: {text: string; tone?: "success" | "warning" | "danger"};
  updated: string;
}

const columns: CatchTableColumn<Row>[] = [
  {key: "org", label: "Organizer", kind: "title"},
  {key: "state", label: "Where it is", width: "240px"},
  {key: "updated", label: "Last news", width: "120px", sort: "desc", align: "end"},
];

const filters: Array<{value: MyNominationsFilter; label: string}> = [
  {value: "all", label: "All"}, {value: "published", label: "Published"},
  {value: "waiting", label: "Waiting"}, {value: "stuck", label: "Stuck"},
];

const day = (value: string) => new Intl.DateTimeFormat("en-IN", {weekday: "short", day: "numeric", month: "short"}).format(new Date(value));
const toneOf = (tone: string) => tone === "success" || tone === "warning" || tone === "danger" ? tone : undefined;

/** What happened to every organizer a sales associate sent. They nominate on WhatsApp; ops decide. */
export function MyNominationsScreen({model, selectedItemId, onSelect, onNominate}: {
  model: MyNominationsModel;
  selectedItemId: string | null;
  onSelect: (itemId: string | null) => void;
  /** Sends another link for a stuck nomination: opens the nominate form. */
  onNominate: () => void;
}) {
  const rows: Row[] = model.rows.map((row) => {
    const tone = toneOf(row.state.tone);
    return {key: row.itemId, org: {title: row.title, subtitle: `Sent ${day(row.sentAt)}`},
      state: {text: row.state.label, ...(tone ? {tone} : {})}, updated: day(row.updatedAt)};
  });
  const detail = model.detail && model.detail.item.itemId === selectedItemId ? model.detail : null;
  const steps: CatchSectionStep[] = detail ? [
    ...detail.journey.map((step): CatchSectionStep => ({title: step.title, ...(step.detail ? {subtitle: step.detail} : {}),
      meta: day(step.occurredAt), state: "done", ...(step.tone === "danger" ? {tone: "danger" as const} : {})})),
    ...(detail.item.status !== "done" ? [{title: "Waiting for ops", subtitle: detail.item.state.label, meta: "Now",
      state: "current" as const, tone: "warning" as const}] : []),
  ] : [];
  return (
    <CatchPaneLayout
      pattern="queue"
      detailOpen={selectedItemId !== null}
      main={<>
        <CatchWorkspaceHeader title="My nominations" count={model.totals?.all} note="send a link on WhatsApp to nominate"
          filters={{chips: filters.map((entry) => ({label: entry.label, count: model.totals?.[entry.value],
            selected: model.filter === entry.value, onPressed: () => model.setFilter(entry.value)}))}}
          actions={<>
            {model.hasPreviousPage ? <CatchButton label="Newer" variant="secondary" size="sm" onPressed={model.previousPage} /> : null}
            {model.hasNextPage ? <CatchButton label="Older" variant="secondary" size="sm" onPressed={model.nextPage} /> : null}
          </>} />
        {rows.length ? <CatchTable columns={columns} rows={rows} label="My nominations" rowKey="key" selectedKey={selectedItemId}
          onRowPressed={(row) => onSelect(row.key)} density="compact" /> :
          <CatchEmptyState title="No nominations here" message="Send a link to Catch on WhatsApp to nominate an organizer." />}
      </>}
      detail={selectedItemId === null ? <CatchEmptyState title="Pick a nomination" message="Every step it took opens here." /> : detail ? <>
        <CatchWorkspaceHeader title={detail.item.title} kicker="My nominations" back={{label: "Back", onPressed: () => onSelect(null), close: true}} />
        <CatchMetaRow columns={2} entries={[
          {label: "Sent", value: day(detail.item.waitingSince)},
          {label: "City", value: detail.item.city ? cityLabel(detail.item.city) : "Not set"},
          {label: "Where it is", value: detail.item.state.label, wide: true,
            ...(toneOf(detail.item.state.tone) ? {tone: toneOf(detail.item.state.tone)} : {})},
        ]} />
        <CatchSection title="How it got here" timeline={steps} dividers="none" />
        {detail.item.type === "stuck" ? <CatchDock recipe="pane" primary={{label: "Send another link", onPressed: onNominate}}
          next="You can't approve listings; ops and the owner do" /> : null}
      </> : model.detailError ? <CatchEmptyState title="This nomination could not be opened" /> : null}
    />
  );
}
