import {CatchButton, CatchEmptyState, CatchGap, CatchIndexRow, CatchSection, CatchText} from "@catch/web-ui";
import {dataMode} from "../../../shared/api/dataMode";
import type {SalesImportedHistoryRecord} from "../api/salesHistoryTypes";
import {useSalesHistoryController} from "../controllers/useSalesHistoryController";

function sourceDate(record: SalesImportedHistoryRecord): string {
  return record.dateCertainty === "source_exact" && record.occurredAt ? `Source date: ${record.occurredAt}` : "Source date unknown";
}

function Paging({back, next, onBack, onNext, what}: {back: boolean; next: boolean; onBack: () => void; onNext: () => void; what: string}) {
  if (!back && !next) return null;
  return (
    <CatchGap direction="horizontal" size="related" wrap>
      <CatchButton label={`Previous ${what}`} variant="secondary" size="sm" onPressed={back ? onBack : null} />
      <CatchButton label={`Next ${what}`} variant="secondary" size="sm" onPressed={next ? onNext : null} />
    </CatchGap>
  );
}

function ImportedHistory({actorUid, organizerId}: {actorUid: string; organizerId: string}) {
  const c = useSalesHistoryController({organizerId, actorUid});
  const records = c.records.data?.records ?? [];
  const rows = c.rows.data?.rows ?? [];
  const count = (disposition: string) => rows.filter((row) => row.disposition === disposition).length;
  if (c.rows.isError || c.records.isError) {
    return <CatchSection title="Imported source history" dividers="none">
      <CatchEmptyState title="Imported history is unavailable for this host or your current access"
        actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={() => {
          void c.rows.refetch(); void c.records.refetch();
        }} />} />
    </CatchSection>;
  }
  return (
    <CatchGap size="section">
      <CatchText as="p" variant="supporting">
        Historical spreadsheet material only. It doesn't establish a current fit score, contact permission, message delivery
        or a current next step. Unknown source dates stay unknown.
      </CatchText>
      <CatchSection title="Imported source history" dividers="none"
        empty={<CatchEmptyState title={c.records.isPending ? "Loading imported history…" : "No promoted records on this page"} />}>
        {records.map((record) => <CatchIndexRow key={record.recordId} title={record.sourceValue} titleVariant="bodyM"
          subtitle={[`${record.kind} · ${record.sourceColumn}`, sourceDate(record), record.relativeChronology.replaceAll("_", " "),
            `source ${record.sourceId}/${record.sourceRowId}`, `import ${record.importId}`, `review ${record.promotionVersion}`,
            "provider delivery unconfirmed"].join(" · ")} />)}
      </CatchSection>
      <Paging back={c.recordBack.length > 0} next={Boolean(c.records.data?.nextCursor)} onBack={c.previousRecords} onNext={c.nextRecords} what="records" />
      <CatchSection title="Reviewed source rows" dividers="none"
        empty={<CatchEmptyState title={c.rows.isPending ? "Loading source rows…" : "No reviewed source rows on this page"} />}>
        {rows.map((row) => <CatchIndexRow key={row.rowId} title={row.disposition.replaceAll("_", " ")} titleVariant="bodyM"
          subtitle={[row.reason, `source row ${row.sourceRowId}`, `import ${row.importId}`, `review ${row.promotionVersion}`].join(" · ")} />)}
      </CatchSection>
      {c.rows.isSuccess ? <CatchText as="p" variant="supporting" role="status">
        This page: {count("promoted")} promoted, {count("skipped")} skipped, {count("review_needed")} need review. These count this
        page, not the whole source. Rows without a reviewed Catch host stay in the private migration plan.
      </CatchText> : null}
      <Paging back={c.rowBack.length > 0} next={Boolean(c.rows.data?.nextCursor)} onBack={c.previousRows} onNext={c.nextRows} what="rows" />
    </CatchGap>
  );
}

/**
 * A host's past: next steps already finished and, for the team, what earlier spreadsheets said. Imported material
 * doesn't establish a current fit, contact permission, message delivery or next step. Unknown dates stay unknown.
 */
export function SalesHostHistoryWorkspace({actorUid, canSeeImported, finished, organizerId}: {
  actorUid: string;
  canSeeImported: boolean;
  finished: ReadonlyArray<{taskId: string; title: string; subtitle: string}>;
  organizerId: string;
}) {
  return (
    <CatchGap size="section">
      <CatchSection title="Finished next steps" count={finished.length} dividers="none" empty={<CatchEmptyState title="None finished yet" />}>
        {finished.map((task) => <CatchIndexRow key={task.taskId} title={task.title} titleVariant="bodyM" subtitle={task.subtitle} />)}
      </CatchSection>
      {!canSeeImported ? null : dataMode() === "sample" ?
        <CatchSection title="Imported source history" dividers="none">
          <CatchEmptyState title="Sample hosts have no imported history" />
        </CatchSection> :
        <ImportedHistory key={`${actorUid}:${organizerId}`} actorUid={actorUid} organizerId={organizerId} />}
    </CatchGap>
  );
}
