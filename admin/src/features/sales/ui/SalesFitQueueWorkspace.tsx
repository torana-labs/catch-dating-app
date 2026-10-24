import {ClipboardList} from "lucide-react";
import {AdminButton, AdminTableRow, AdminToolbar, DataTable,
  EmptyState, Panel, SegmentedControl} from
  "../../../shared/ui/AdminPrimitives";
import {dataMode} from "../../../shared/api/dataMode";
import {useSalesFitQueueController} from
  "../controllers/useSalesFitQueueController";
import type {FitQueueEntry, FitQueueView} from
  "../api/salesFitQueueTypes";
import {CatchText} from "@catch/web-ui";

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
  return dataMode() === "sample" ? <Panel title="Reviewed fit queue"
    icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Company-wide reviewed fit is available with live Sales records.
      Sample hosts do not carry reviewed scores.</CatchText>
  </Panel> : <SalesFitQueueWorkspace actorUid={actorUid}
    onOpenHost={onOpenHost} />;
}

function SalesFitQueueWorkspace({actorUid, onOpenHost}: {
  actorUid: string;
  onOpenHost: (organizerId: string) => void;
}) {
  const c = useSalesFitQueueController({actorUid});
  const rows = c.page.data?.rows ?? [];
  return <Panel title="Reviewed fit queue" icon={<ClipboardList size={18} />}>
    <CatchText as="p" variant="supporting">Scores use current reviewed factor evidence. Missing or disputed factors
      stay unknown. This queue helps choose research and review; it does not
      authorize contacting anyone.</CatchText>
    <SegmentedControl ariaLabel="Fit queue view" mobileLayout="content"
      mobileSelectLabel="Fit queue view" options={views} value={c.view}
      onChange={(value) => c.changeView(value as FitQueueView)} />
    {c.view === "outreach_review_candidate" ? <CatchText as="p" variant="supporting">
      Candidates have a current reviewed score, a matching qualification policy,
      and no account hold or duplicate review. Review the contact and all current
      source details before any outreach activity.</CatchText> : null}
    {c.page.isPending ? <EmptyState>Loading reviewed fit…</EmptyState> : null}
    {c.page.isError ? <EmptyState>
      {c.view === "outreach_review_candidate" ?
        "The current qualification policy or fit queue could not be checked." :
        "Current fit could not be loaded."}{" "}
      <AdminButton onClick={() => void c.page.refetch()}>Try again</AdminButton>
    </EmptyState> : null}
    {c.error ? <CatchText as="p" variant="supporting" role="alert">{c.error}</CatchText> : null}
    {c.notice ? <CatchText as="p" variant="supporting" role="status">{c.notice}</CatchText> : null}
    {c.page.data?.omittedExpiredInPage ? <CatchText as="p" variant="supporting" role="status">
      {c.page.data.omittedExpiredInPage} expired ranking(s) were omitted from
      this page. Refresh a bounded batch to review them again.
    </CatchText> : null}
    {c.page.isSuccess && !rows.length ? <EmptyState>
      {c.page.data.nextCursor ?
        "No current results in this scanned page. Continue for more hosts." :
        "No current results in this view. Refresh a bounded batch or review host evidence."}
    </EmptyState> : null}
    {rows.length ? <DataTable ariaLabel="Reviewed host fit queue">
      <thead><tr><th>Host</th><th>Reviewed fit</th><th>Review state</th>
        <th>Valid through</th><th /></tr></thead>
      <tbody>{rows.map((row) => <AdminTableRow key={row.organizerId}>
        <td><strong>{row.name}</strong>{row.city ? <> · {row.city}</> : null}</td>
        <td>{fitLabel(row)}</td>
        <td>{row.suppressionStatus !== "clear" ?
          `Account ${row.suppressionStatus}` :
          row.duplicateReviewRequired ? "Identity review needed" :
          row.status === "review_required" ? "Factor dispute" :
          row.status === "needs_research" ? "Research needed" :
          c.view === "outreach_review_candidate" ?
            "Needs contact review" : "Reviewed score"}</td>
        <td>{row.expiresAt ? dateLabel(row.expiresAt) :
          "Awaiting reviewed evidence"}</td>
        <td><AdminToolbar>
          <AdminButton disabled={c.busy || Boolean(c.pending)}
            onClick={() => void c.refreshHost(row.organizerId)}>
            Refresh fit
          </AdminButton>
          <AdminButton onClick={() => onOpenHost(row.organizerId)}>
            Open host
          </AdminButton>
        </AdminToolbar></td>
      </AdminTableRow>)}</tbody>
    </DataTable> : null}
    <AdminToolbar>
      <AdminButton disabled={!c.history.length || c.busy}
        onClick={c.previousPage}>Previous page</AdminButton>
      <AdminButton disabled={!c.page.data?.nextCursor || c.busy}
        onClick={c.nextPage}>Next page</AdminButton>
      <AdminButton disabled={c.busy || Boolean(c.pending)}
        onClick={() => void c.startBatch()}>
        Start a new 10-host refresh
      </AdminButton>
      {c.nextBatchCursor ? <AdminButton disabled={c.busy || Boolean(c.pending)}
        onClick={() => void c.continueBatch()}>
        Continue refresh
      </AdminButton> : null}
      {c.pending ? <AdminButton disabled={c.busy}
        onClick={() => void c.retryPending()}>
        Retry unchanged refresh
      </AdminButton> : null}
    </AdminToolbar>
    {c.lastBatch ? <CatchText as="p" variant="supporting" role="status">
      This batch refreshed {c.lastBatch.rows.filter((row) =>
        row.result === "refreshed").length} host(s);{" "}
      {c.lastBatch.rows.filter((row) => row.result === "needs_review").length}
      {" "}need source review. The batch covers only these ten or fewer hosts.
    </CatchText> : null}
    {c.lastBatch?.rows.some((row) => row.result === "needs_review") ?
      <ul>{c.lastBatch.rows.filter((row) => row.result === "needs_review")
        .map((row) => <li key={row.organizerId}>
          {row.reason || "Reviewed source needs attention."}{" "}
          <AdminButton onClick={() => onOpenHost(row.organizerId)}>
            Open host
          </AdminButton>
        </li>)}</ul> : null}
  </Panel>;
}
