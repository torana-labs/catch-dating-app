import {dataMode} from "../../../shared/api/dataMode";
import {useSalesFitQueueController} from
  "../controllers/useSalesFitQueueController";
import type {FitQueueEntry, FitQueueView} from
  "../api/salesFitQueueTypes";
import {CatchButton, CatchEmptyState, CatchGap, CatchIndexRow, CatchPageTabBar, CatchSection, CatchTable, CatchText, type CatchTableColumn} from "@catch/web-ui";

const views: Array<{id: FitQueueView; label: string}> = [
  {id: "ranked", label: "Reviewed fit"},
  {id: "needs_research", label: "Needs research"},
  {id: "outreach_review_candidate", label: "Outreach review candidates"},
];
function fitLabel(row: FitQueueEntry): string {
  if (row.score === null) return row.status === "review_required" ?
    "Disputed · review factors" : "Unknown · more reviewed evidence needed";
  return `${row.score.toFixed(1)} / 100 · ${row.priority} priority`;
}
function dateLabel(value: string | null): string {
  if (!value) return "No expiry date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" :
    date.toLocaleDateString(undefined, {day: "numeric", month: "short",
      year: "numeric"});
}

export function renderSalesFitQueueWorkspace(actorUid: string,
  onOpenHost: (organizerId: string) => void) {
  return dataMode() === "sample" ? <CatchEmptyState title="Reviewed fit queue"
    message="Company-wide reviewed fit is available with live Sales records. Sample hosts do not carry reviewed scores." /> : <SalesFitQueueWorkspace actorUid={actorUid}
    onOpenHost={onOpenHost} />;
}

interface QueueRow {
  key: string;
  host: {title: string; subtitle?: string};
  fit: string;
  state: string;
  through: string;
  actions: {refresh: () => void; open: () => void};
}

const small = {variant: "secondary", size: "sm"} as const;

function SalesFitQueueWorkspace({actorUid, onOpenHost}: {
  actorUid: string;
  onOpenHost: (organizerId: string) => void;
}) {
  const c = useSalesFitQueueController({actorUid});
  const rows = c.page.data?.rows ?? [];
  const locked = c.busy || Boolean(c.pending);
  const columns: CatchTableColumn<QueueRow>[] = [
    {key: "host", label: "Host", kind: "title"},
    {key: "fit", label: "Reviewed fit", width: "230px"},
    {key: "state", label: "Review state", width: "170px"},
    {key: "through", label: "Valid through", width: "150px"},
    {key: "actions", label: "", width: "210px", render: (row) => <CatchGap size="inline" direction="horizontal">
      <CatchButton {...small} label="Refresh fit" onPressed={locked ? null : row.actions.refresh} />
      <CatchButton {...small} label="Open host" onPressed={row.actions.open} />
    </CatchGap>},
  ];
  const tableRows: QueueRow[] = rows.map((row) => ({key: row.organizerId,
    host: {title: row.name, ...(row.city ? {subtitle: row.city} : {})},
    fit: fitLabel(row),
    state: row.suppressionStatus !== "clear" ? `Account ${row.suppressionStatus}` :
      row.duplicateReviewRequired ? "Identity review needed" :
      row.status === "review_required" ? "Factor dispute" :
      row.status === "needs_research" ? "Research needed" :
      c.view === "outreach_review_candidate" ? "Needs contact review" : "Reviewed score",
    through: row.expiresAt ? dateLabel(row.expiresAt) : "Awaiting reviewed evidence",
    actions: {refresh: () => void c.refreshHost(row.organizerId), open: () => onOpenHost(row.organizerId)},
  }));
  return <CatchSection title="Reviewed fit queue" dividers="none">
    <CatchGap size="related">
      <CatchText as="p" variant="supporting">Scores use current reviewed factor evidence. Missing or disputed factors
        stay unknown. This queue helps choose research and review; it does not
        authorize contacting anyone.</CatchText>
      <CatchPageTabBar label="Fit queue view" selected={c.view} size="sm" fill={false}
        options={views.map((view) => ({value: view.id, label: view.label}))}
        onChanged={(value) => c.changeView(value as FitQueueView)} />
      {c.view === "outreach_review_candidate" ? <CatchText as="p" variant="supporting">
        Candidates have a current reviewed score, a matching qualification policy,
        and no account hold or duplicate review. Review the contact and all current
        source details before any outreach activity.</CatchText> : null}
      {c.page.isPending ? <CatchText as="p" variant="supporting">Loading reviewed fit…</CatchText> : null}
      {c.page.isError ? <CatchEmptyState title={c.view === "outreach_review_candidate" ?
        "The current qualification policy or fit queue could not be checked." : "Current fit could not be loaded."}
        actions={<CatchButton {...small} label="Try again" onPressed={() => void c.page.refetch()} />} /> : null}
      {c.error ? <CatchText as="p" variant="supporting" role="alert">{c.error}</CatchText> : null}
      {c.notice ? <CatchText as="p" variant="supporting" role="status">{c.notice}</CatchText> : null}
      {c.page.data?.omittedExpiredInPage ? <CatchText as="p" variant="supporting" role="status">
        {c.page.data.omittedExpiredInPage} expired ranking(s) were omitted from
        this page. Refresh a bounded batch to review them again.
      </CatchText> : null}
      {c.page.isSuccess && !rows.length ? <CatchEmptyState title={c.page.data.nextCursor ?
        "No current results in this scanned page. Continue for more hosts." :
        "No current results in this view. Refresh a bounded batch or review host evidence."} /> : null}
      {tableRows.length ? <CatchTable columns={columns} rows={tableRows} label="Reviewed host fit queue" rowKey="key" density="compact" /> : null}
      <CatchGap size="inline" direction="horizontal" wrap>
        <CatchButton {...small} label="Previous page" onPressed={!c.history.length || c.busy ? null : c.previousPage} />
        <CatchButton {...small} label="Next page" onPressed={!c.page.data?.nextCursor || c.busy ? null : c.nextPage} />
        <CatchButton {...small} label="Start a new 10-host refresh" onPressed={locked ? null : () => void c.startBatch()} />
        {c.nextBatchCursor ? <CatchButton {...small} label="Continue refresh" onPressed={locked ? null : () => void c.continueBatch()} /> : null}
        {c.pending ? <CatchButton {...small} label="Retry unchanged refresh" onPressed={c.busy ? null : () => void c.retryPending()} /> : null}
      </CatchGap>
      {c.lastBatch ? <CatchText as="p" variant="supporting" role="status">
        This batch refreshed {c.lastBatch.rows.filter((row) => row.result === "refreshed").length} host(s);{" "}
        {c.lastBatch.rows.filter((row) => row.result === "needs_review").length}
        {" "}need source review. The batch covers only these ten or fewer hosts.
      </CatchText> : null}
      {c.lastBatch?.rows.filter((row) => row.result === "needs_review").map((row) => <CatchIndexRow key={row.organizerId} titleVariant="bodyM"
        title={row.reason || "Reviewed source needs attention."}
        trailing={<CatchButton {...small} label="Open host" onPressed={() => onOpenHost(row.organizerId)} />} />)}
    </CatchGap>
  </CatchSection>;
}
