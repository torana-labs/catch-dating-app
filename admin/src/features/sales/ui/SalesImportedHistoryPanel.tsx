import {History} from "lucide-react";
import {AdminButton, AdminToolbar, EmptyState, Panel, StateRow} from
  "../../../shared/ui/AdminPrimitives";
import {dataMode} from "../../../shared/api/dataMode";
import {useSalesHistoryController} from
  "../controllers/useSalesHistoryController";
import type {SalesImportedHistoryRecord} from
  "../api/salesHistoryTypes";
import {CatchText} from "@catch/web-ui";

function dateLabel(record: SalesImportedHistoryRecord): string {
  return record.dateCertainty === "source_exact" && record.occurredAt ?
    `Source date: ${record.occurredAt}` : "Source date unknown";
}

function SalesImportedHistoryPanel({organizerId, actorUid}: {
  organizerId: string; actorUid: string;
}) {
  const c = useSalesHistoryController({organizerId, actorUid});
  const records = c.records.data?.records ?? [];
  const rows = c.rows.data?.rows ?? [];
  const counts = {promoted: rows.filter((row) =>
    row.disposition === "promoted").length,
  skipped: rows.filter((row) => row.disposition === "skipped").length,
  reviewNeeded: rows.filter((row) =>
    row.disposition === "review_needed").length};
  return <Panel title="Imported source history" icon={<History size={18} />}>
    <CatchText as="p" variant="supporting">Historical spreadsheet material only. It does not establish a current
      fit score, contact permission, message delivery, or a current next step.
      Unknown source dates remain unknown.</CatchText>
    {c.rows.isPending || c.records.isPending ?
      <EmptyState>Loading private imported history…</EmptyState> : null}
    {c.rows.isError || c.records.isError ? <EmptyState>
      Imported history is unavailable for this host or your current access.
      <AdminButton onClick={() => {
        void c.rows.refetch(); void c.records.refetch();
      }}>Try again</AdminButton>
    </EmptyState> : null}
    {c.rows.isSuccess ? <>
      <CatchText as="p" variant="supporting" role="status">This row page: {counts.promoted} promoted, {counts.skipped}
        {" "}skipped, {counts.reviewNeeded} need review. These are page counts,
        not source-wide totals. Rows without reviewed canonical identity remain
        in the private migration plan.</CatchText>
      {rows.length ? <ul>{rows.map((row) => <li key={row.rowId}>
        <strong>{row.disposition.replaceAll("_", " ")}</strong> ·
        {" "}{row.reason} · source row <code>{row.sourceRowId}</code> ·
        import <code>{row.importId}</code> · review version
        {" "}<code>{row.promotionVersion}</code>
      </li>)}</ul> : <EmptyState>No reviewed source rows on this page.</EmptyState>}
      <AdminToolbar>
        <AdminButton disabled={!c.rowBack.length} onClick={c.previousRows}>
          Previous rows</AdminButton>
        <AdminButton disabled={!c.rows.data?.nextCursor} onClick={c.nextRows}>
          Next rows</AdminButton>
      </AdminToolbar>
    </> : null}
    {c.records.isSuccess ? <>
      {records.length ? records.map((record) =>
        <StateRow key={record.recordId}
          label={`${record.kind} · ${record.sourceColumn}`}
          value={<>
            <strong>{record.sourceValue}</strong> · {dateLabel(record)} ·
            {" "}{record.relativeChronology.replaceAll("_", " ")} ·
            source <code>{record.sourceId}/{record.sourceRowId}</code> ·
            import <code>{record.importId}</code> · review version
            {" "}<code>{record.promotionVersion}</code>. Imported from a reviewed
            source cell; provider delivery is unconfirmed.
          </>} />) : <EmptyState>
            No promoted historical records on this page.
          </EmptyState>}
      <AdminToolbar>
        <AdminButton disabled={!c.recordBack.length}
          onClick={c.previousRecords}>Previous records</AdminButton>
        <AdminButton disabled={!c.records.data?.nextCursor}
          onClick={c.nextRecords}>Next records</AdminButton>
      </AdminToolbar>
    </> : null}
  </Panel>;
}

/** Parent host detail mounts this private read surface in its Activity tab. */
export function renderSalesImportedHistory(organizerId: string,
  actorUid: string) {
  return dataMode() === "sample" ?
    <Panel title="Imported source history" icon={<History size={18} />}>
      <CatchText as="p" variant="supporting">Imported source history is available only with live private Sales
        records. Sample hosts have no imported history.</CatchText>
    </Panel> : <SalesImportedHistoryPanel
      key={`${actorUid}:${organizerId}`} organizerId={organizerId}
      actorUid={actorUid} />;
}
