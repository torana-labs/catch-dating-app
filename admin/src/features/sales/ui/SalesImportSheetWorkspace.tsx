import {
  CatchButton, CatchCheckboxInput, CatchEmptyState, CatchField, CatchFilePickerButton, CatchGap, CatchLegacyIcon,
  CatchIndexRow, CatchMetaRow, CatchSection, CatchSheet, CatchLegacyText,
} from "@catch/web-ui";
import type {SalesImportPacket} from "../api/salesTypes";
import {salesErrorMessage, selectChoices} from "../controllers/salesLabels";
import {salesImportRowProblem, salesImportSkipped} from "../controllers/salesImports";
import {salesImportBatchSize, useSalesImportSheetController} from "../controllers/useSalesImportSheetController";

const dispositionLabels: Record<string, string> = {created: "New host", matched: "Updates a host"};

const rowLabel = (sourceRowId: string) => sourceRowId.replace(/^row-/u, "Row ");

/** Reviews one CSV a batch at a time. The server's preview changes nothing until a batch is applied. */
export function SalesImportSheetWorkspace({applyImport, isSaving, onClose}: {
  applyImport: (packet: SalesImportPacket, previewHash: string) => Promise<boolean>;
  isSaving: boolean;
  onClose: () => void;
}) {
  const c = useSalesImportSheetController({applyImport});
  const preview = c.preview.data && !c.batchApplied ? c.preview.data : null;
  const counts = preview?.counts ?? {};
  const skippedRows = preview?.rows.filter((row) => !(row.disposition in dispositionLabels)) ?? [];
  const names = new Map(c.packet?.rows.map((row) => [row.sourceRowId, row.name]) ?? []);
  const inBatch = Math.min(salesImportBatchSize, c.rowCount - c.batch * salesImportBatchSize);
  const headers = c.rows[0] ?? [];
  const columns = [{value: "-1", label: "None"},
    ...headers.map((header, index) => ({value: String(index), label: header || `Column ${index + 1}`}))];
  const column = (title: string, key: keyof typeof c.mapping) => <CatchField recipe="select" title={title}
    value={String(c.mapping[key])} inputMode={isSaving ? "inactive" : "editable"}
    onChanged={(value) => c.setMapping({[key]: Number(value ?? -1)})} {...selectChoices(columns)} />;
  const allDone = c.batchCount > 0 && c.applied.length === c.batchCount;
  return (
    <CatchSheet recipe="standard" pinFooter open onClose={onClose} title="Import a CSV" subtitle="Settings · Sales"
      footer={allDone ? <CatchButton label="Done" fullWidth onPressed={onClose} /> : <CatchButton fullWidth
        label={`Apply batch ${c.batch + 1}: add ${counts.created ?? 0}, update ${counts.matched ?? 0}`}
        onPressed={preview && c.reviewed && !isSaving ? () => void c.apply() : null} />}>
      <CatchGap size="formField">
        <CatchField recipe="input" title="Name this import" value={c.name} onChanged={c.setName}
          inputMode={c.hasApplied || isSaving ? "inactive" : "editable"}
          helperText="Keeps batches from the same file together, so it can't change once a batch is applied." />
        <CatchGap size="inline" crossAxisAlignment="start">
          <CatchFilePickerButton accept=".csv,text/csv" label="Choose CSV" leading={<CatchLegacyIcon icon="upload" size="sm" />}
            onChanged={isSaving ? null : (file) => void c.chooseFile(file)} />
          {c.fileName ? <CatchLegacyText as="p" variant="supporting" role="status">
            {c.fileName} · {c.rowCount} rows, in {c.batchCount} batch{c.batchCount === 1 ? "" : "es"} of up to {salesImportBatchSize}.
            Nothing changes until you apply a batch.
          </CatchLegacyText> : null}
          {c.fileError ? <CatchLegacyText as="p" variant="supporting" role="alert">{c.fileError}</CatchLegacyText> : null}
        </CatchGap>
        {c.rows.length ? <>
          {column("Host name column", "name")}
          {column("Summary column", "summary")}
          {column("Catch host ID (optional)", "organizerId")}
          {column("Past research (optional)", "researchStatus")}
          <CatchLegacyText as="p" variant="supporting">
            Rows without a Catch host ID wait for identity review. New hosts start as Needs research; past research is kept
            as history and doesn't qualify anyone. Every column is kept privately, mapped or not.
          </CatchLegacyText>
          {c.batchCount > 1 ? <CatchField recipe="select" title="Batch to review" value={String(c.batch)}
            inputMode={isSaving ? "inactive" : "editable"} onChanged={(value) => c.setBatch(Number(value ?? 0))}
            {...selectChoices(Array.from({length: c.batchCount}, (_, index) => ({value: String(index),
              label: `Batch ${index + 1}${c.applied.includes(index) ? ", applied" : ""}`})))} /> : null}
        </> : null}
        {c.packetError ? <CatchLegacyText as="p" variant="supporting" role="alert">{c.packetError}</CatchLegacyText> : null}
        {c.rows.length && c.mapping.name < 0 ? <CatchLegacyText as="p" variant="supporting" role="status">
          Choose the host name column to see this batch.</CatchLegacyText> : null}
        {c.batchApplied ? <CatchEmptyState title={`Batch ${c.batch + 1} is applied`} /> : null}
        {c.preview.isFetching && !preview ? <CatchLegacyText as="p" variant="supporting" role="status">Checking this batch…</CatchLegacyText> : null}
        {c.preview.isError ? <CatchEmptyState title="This batch could not be checked" message={salesErrorMessage(c.preview.error)}
          actions={<CatchButton label="Try again" variant="secondary" size="sm" onPressed={() => void c.preview.refetch()} />} /> : null}
        {preview ? <>
          <CatchMetaRow columns={2} entries={[
            {label: `Batch ${c.batch + 1} of ${c.batchCount}`, value: `${inBatch} rows`},
            {label: "New hosts", value: counts.created ?? 0},
            {label: "Match a host", value: counts.matched ?? 0},
            {label: "Skipped", value: salesImportSkipped(counts), ...(skippedRows.length ? {tone: "warning" as const} : {})},
          ]} />
          {skippedRows.length ? <CatchSection title="Skipped" count={skippedRows.length}>
            {skippedRows.map((row) => <CatchIndexRow key={row.sourceRowId} titleVariant="bodyM"
              title={`${rowLabel(row.sourceRowId)}: ${salesImportRowProblem(row.reason)}`}
              {...(names.get(row.sourceRowId) ? {subtitle: names.get(row.sourceRowId)} : {})} />)}
          </CatchSection> : null}
          <CatchButton recipe="text" label={c.showAllRows ? "Hide the rows" : `See all ${preview.rows.length} rows in this batch`}
            onPressed={() => c.setShowAllRows(!c.showAllRows)} />
          {c.showAllRows ? <CatchSection title="This batch" count={preview.rows.length}>
            {preview.rows.map((row) => <CatchIndexRow key={row.sourceRowId} titleVariant="bodyM"
              title={`${rowLabel(row.sourceRowId)}: ${names.get(row.sourceRowId) ?? "Unnamed"}`}
              subtitle={dispositionLabels[row.disposition] ?? `Skipped: ${salesImportRowProblem(row.reason)}`} />)}
          </CatchSection> : null}
          <CatchCheckboxInput label="I reviewed every row in this batch" value={c.reviewed}
            onChanged={isSaving ? null : c.setReviewed} />
        </> : null}
      </CatchGap>
    </CatchSheet>
  );
}
