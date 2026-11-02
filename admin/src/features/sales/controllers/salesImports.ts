import type {SalesImportBatch} from "../api/salesTypes";

/** All the batches of one file, which share an import name. */
export interface SalesImportGroup {
  sourceId: string;
  name: string;
  batches: SalesImportBatch[];
  added: number;
  updated: number;
  skipped: number;
  appliedAt: string;
  appliedBy: string;
}

/** The server takes a plain ID, so a name is stored as a slug and read back from it. */
export function salesImportSourceId(name: string): string {
  return name.trim().normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "").slice(0, 96);
}

export function salesImportName(sourceId: string): string {
  const words = sourceId.replace(/[-_.:]+/gu, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function salesImportSkipped(counts: Record<string, number>): number {
  return (counts.duplicate ?? 0) + (counts.unresolved ?? 0) + (counts.rejected ?? 0);
}

/** Newest batch first, so a group's date and person are its latest batch's. */
export function salesImportGroups(batches: readonly SalesImportBatch[]): SalesImportGroup[] {
  const groups = new Map<string, SalesImportGroup>();
  for (const batch of batches) {
    const group = groups.get(batch.sourceId) ?? {sourceId: batch.sourceId, name: salesImportName(batch.sourceId),
      batches: [], added: 0, updated: 0, skipped: 0, appliedAt: batch.appliedAt, appliedBy: batch.appliedBy};
    group.batches.push(batch);
    group.added += batch.counts.created ?? 0;
    group.updated += batch.counts.matched ?? 0;
    group.skipped += salesImportSkipped(batch.counts);
    groups.set(batch.sourceId, group);
  }
  return [...groups.values()];
}

const count = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;

/** "42 hosts added, 3 skipped · 2 batches · applied by you on 28 Oct". */
export function salesImportSummary(group: SalesImportGroup, currentUserUid: string | null): string {
  const changes = [
    `${count(group.added, "host", "hosts")} added`,
    ...(group.updated ? [`${group.updated} updated`] : []),
    ...(group.skipped ? [`${group.skipped} skipped`] : []),
  ].join(", ");
  const who = group.appliedBy === currentUserUid ? "you" : "a teammate";
  const when = new Date(group.appliedAt).toLocaleDateString(undefined, {day: "numeric", month: "short"});
  return `${changes} · ${count(group.batches.length, "batch", "batches")} · applied by ${who} on ${when}`;
}

const skipReasons: Record<string, string> = {
  identity_unresolved: "no Catch host ID, so it waits for identity review",
  repeated_source_row: "the same row appears twice",
  source_row_imported: "already imported",
  source_content_conflict: "already imported with different content",
  canonical_organizer_missing: "no Catch host has this ID",
  account_contract_invalid: "this host's Sales record can't take an import",
  private_account_archived: "this host is archived in Sales",
};

export function salesImportRowProblem(reason: string): string {
  return skipReasons[reason] ?? reason.replaceAll("_", " ");
}

const correctionBlockers: Record<string, string> = {
  import_proof_missing: "The import's record of this host is missing or incomplete",
  private_account_missing: "This host has no private Sales record",
  account_already_archived: "This host's Sales record is already archived",
  cohort_changed_since_import: "This host's cohorts changed after the import",
  import_cohort_membership_missing: "This host is no longer in the cohorts the import added",
  lineage_query_overflow: "This host has too many import rows to check",
  sibling_import_membership: "Another import also touched this host",
  dependent_business_work: "Later Sales work depends on this host's record",
  no_owned_cohort_change: "The import added no cohorts to remove",
};

export function salesCorrectionBlocker(code: string): string {
  return correctionBlockers[code] ?? code.replaceAll("_", " ");
}
