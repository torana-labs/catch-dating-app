import {isDeepStrictEqual} from "node:util";
import {FieldPath} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";

export const MAX_LIVE_MIGRATION_SOURCE_ROWS = 250;
export const LIVE_MIGRATION_SOURCES = ["eventBookings",
  "eventAttendees", "organizerContactOrigins"] as const;
export type LiveMigrationSource = typeof LIVE_MIGRATION_SOURCES[number];

interface StagedSource {
  kind: LiveMigrationSource;
  sourceId: string;
  value: FirebaseFirestore.DocumentData;
}

function unavailable(message: string): never {
  throw new HttpsError("failed-precondition", message);
}

/**
 * Final-activation read fence. This compares every *current* bounded source
 * row with its staged projection in the SAME transaction that marks ready.
 * It proves snapshot equality at that commit only: deployment must separately
 * prove every source writer reads the fence before writes. No caller boolean
 * can replace that writer integration.
 */
export async function assertLiveMigrationSourcesMatchStage(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
  organizerId: string;
  migrationRevision: number;
  fenceToken: string;
  staged: readonly StagedSource[];
  sourceCounts: readonly [number, number, number];
  project: (kind: LiveMigrationSource,
    raw: FirebaseFirestore.DocumentData) => FirebaseFirestore.DocumentData;
}): Promise<void> {
  const {db, tx, eventId, organizerId, migrationRevision,
    fenceToken, staged, sourceCounts, project} = params;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u.test(eventId) ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u.test(organizerId) ||
      typeof fenceToken !== "string" || fenceToken.length === 0 ||
      !Number.isSafeInteger(migrationRevision) || migrationRevision < 1 ||
      sourceCounts.length !== LIVE_MIGRATION_SOURCES.length ||
      sourceCounts.some((count) => !Number.isSafeInteger(count) ||
        count < 0 || count > MAX_LIVE_MIGRATION_SOURCE_ROWS) ||
      staged.length !== sourceCounts.reduce((a, b) => a + b, 0)) {
    unavailable("Seat source verification scope is incomplete.");
  }
  const fenceSnap = await tx.get(db.collection("eventSeatMigrationFences")
    .doc(eventId));
  const fence = fenceSnap.data();
  if (!fenceSnap.exists || fence?.eventId !== eventId ||
      fence.organizerId !== organizerId ||
      fence.migrationRevision !== migrationRevision ||
      fence.token !== fenceToken || fence.state !== "locked") {
    unavailable("Seat writer fence is not locked for this migration.");
  }
  const stagedByKind = new Map<LiveMigrationSource,
    Map<string, FirebaseFirestore.DocumentData>>();
  for (const kind of LIVE_MIGRATION_SOURCES) {
    stagedByKind.set(kind, new Map());
  }
  for (const row of staged) {
    const bucket = stagedByKind.get(row.kind);
    if (!bucket || typeof row.sourceId !== "string" ||
        bucket.has(row.sourceId) || !row.value ||
        row.value.eventId !== eventId) {
      unavailable("Staged seat source is duplicated or malformed.");
    }
    bucket.set(row.sourceId, row.value);
  }
  for (let index = 0; index < LIVE_MIGRATION_SOURCES.length; index++) {
    const kind = LIVE_MIGRATION_SOURCES[index];
    const stagedRows = stagedByKind.get(kind)!;
    if (stagedRows.size !== sourceCounts[index]) {
      unavailable("Staged seat source count changed.");
    }
    // The +1 witness distinguishes complete results from a truncated page.
    const live = await tx.get(db.collection(kind)
      .where("eventId", "==", eventId)
      .orderBy(FieldPath.documentId())
      .limit(MAX_LIVE_MIGRATION_SOURCE_ROWS + 1));
    if (live.docs.length > MAX_LIVE_MIGRATION_SOURCE_ROWS ||
        live.docs.length !== stagedRows.size) {
      unavailable("Current seat source differs from staged source.");
    }
    for (const doc of live.docs) {
      const stagedValue = stagedRows.get(doc.id);
      if (!stagedValue ||
          !isDeepStrictEqual(project(kind, doc.data()), stagedValue)) {
        unavailable("Current seat source differs from staged source.");
      }
    }
  }
}
