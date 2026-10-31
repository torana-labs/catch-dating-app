import {createHash} from "crypto";
import {FieldPath} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {validateEventDocument} from
  "../shared/generated/validators/eventDocument";
import {organizerContactOriginId} from
  "../shared/organizerContactOrigins";
import {formConversionReceiptId} from
  "../organizers/organizerFormAdmissionIdentity";
import {normalizeRosterPhone} from "./eventAttendees";
import {seatVerifiedPhoneProofId} from "./seatIdentityAuthority";
import {planEventSeatMigration, SeatMigrationAttendee,
  SeatMigrationContact, SeatMigrationContactOrigin,
  SeatMigrationFormReceipt, SeatMigrationParticipation,
  SeatMigrationVerifiedPhone} from "./seatMigration";
import {deriveEventSeatPolicy} from "./seatAuthority/firestoreAdapter";
import {assertNoOutstandingMigrationHolds} from
  "./seatAuthority/migrationOutstandingHolds";
import {assertLiveMigrationSourcesMatchStage,
  MAX_LIVE_MIGRATION_SOURCE_ROWS} from
  "./seatAuthority/liveMigrationSource";

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u;
const PAGE_SIZE = 25;
const MAX_SOURCE_ROWS = MAX_LIVE_MIGRATION_SOURCE_ROWS;
const MAX_OUTPUT_ROWS = 1500;
const SOURCES = ["eventParticipations", "eventAttendees",
  "organizerContactOrigins"] as const;
type Source = typeof SOURCES[number];
type Phase = "scan" | "plan" | "apply" | "cleanup" | "complete" | "discard";

interface MigrationRun {
  eventId: string;
  organizerId: string;
  migrationRevision: number;
  asOfMillis: number;
  fenceToken: string;
  policyHash: string;
  phase: Phase;
  sourceIndex: number;
  cursor: string | null;
  sourceCounts: [number, number, number];
  planHash: string | null;
  outputCursor: number;
  outputCount: number;
  reviewedRequestHash?: string | null;
}

export interface PagedSeatBootstrapDeps {
  db: FirebaseFirestore.Firestore;
  auth: {getUser: (uid: string) => Promise<{uid: string;
    phoneNumber?: string | null}>};
  /** Host entry points must recheck current manager/deletion authority inside
   * every page transaction. Internal reviewed migrations may omit this hook.
   */
  authorizeTransaction?: (tx: FirebaseFirestore.Transaction,
    command: PagedSeatBootstrapCommand) => Promise<void>;
  /** A manager adapter may prepare explicitly reviewed missing event terms.
   * It must check the original event revision in this tx on every page. The
   * patch and receipt are applied only with the ready ledger, never on scan.
   */
  prepareReviewedEvent?: (params: {
    tx: FirebaseFirestore.Transaction;
    command: PagedSeatBootstrapCommand;
    event: Record<string, unknown>;
  }) => Promise<{patch: Record<string, unknown>; finish?: () => void}>;
}

export interface PagedSeatBootstrapCommand {
  eventId: string;
  organizerId: string;
  migrationRevision: number;
  asOfMillis: number;
  reviewedRequestHash?: string;
}

/**
 * Seat-affecting writers must call this inside their existing write TX before
 * reading capacity or staging writes. Before migration they may continue the
 * legacy path; after readiness they must use the seat ledger path. A locked
 * migration blocks source mutation until its terminal checkpoint.
 */
export async function readSeatMigrationWriterFence(params: {
  db: FirebaseFirestore.Firestore;
  tx: FirebaseFirestore.Transaction;
  eventId: string;
}): Promise<"legacy" | "ready"> {
  const {db, tx, eventId} = params;
  if (!ID.test(eventId)) unavailable("Invalid seat writer scope.");
  const [fenceSnap, ledgerSnap] = await Promise.all([
    tx.get(db.collection("eventSeatMigrationFences").doc(eventId)),
    tx.get(db.collection("eventSeatLedgers").doc(eventId)),
  ]);
  if (!fenceSnap.exists && !ledgerSnap.exists) return "legacy";
  const fence = fenceSnap.data();
  const ledger = ledgerSnap.data();
  if (!fence || !ledger || fence.eventId !== eventId ||
      ledger.eventId !== eventId ||
      fence.migrationRevision !== ledger.migrationRevision ||
      fence.state !== "ready" || ledger.state !== "ready") {
    unavailable("Seat source is locked for migration.");
  }
  return "ready";
}

function unavailable(message: string): never {
  throw new HttpsError("failed-precondition", message);
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function sourceStageId(eventId: string, revision: number,
  kind: Source, sourceId: string): string {
  return digest([eventId, revision, kind, sourceId]);
}

function sourceProjection(kind: Source,
  raw: FirebaseFirestore.DocumentData): FirebaseFirestore.DocumentData {
  const keys = kind === "eventParticipations" ?
    ["eventId", "organizerId", "uid", "status"] :
    kind === "eventAttendees" ?
      ["eventId", "organizerId", "status", "source", "linkedUid",
        "phoneE164", "externalReference", "sourceRowId"] :
      ["eventId", "organizerId", "sourceKind", "sourceEntityKind",
        "sourceEntityId", "responseId", "formId", "originContactId",
        "currentContactId"];
  const projected = Object.fromEntries(keys.filter((key) =>
    raw[key] !== undefined)
    .map((key) => [key, raw[key]]));
  if (kind === "eventAttendees") {
    // Legacy unclaimed rows may omit nullable identity fields. Missing never
    // implies a UID or verified endpoint; the pure planner sees explicit null.
    for (const key of ["linkedUid", "phoneE164", "externalReference",
      "sourceRowId"]) {
      if (projected[key] === undefined) projected[key] = null;
    }
  }
  return projected;
}

function exactEvent(raw: FirebaseFirestore.DocumentData | undefined,
  command: PagedSeatBootstrapCommand): Record<string, unknown> {
  if (!raw || !validateEventDocument(raw) ||
      raw.organizerId !== command.organizerId ||
      raw.organizerId !== undefined &&
        raw.organizerId !== command.organizerId) {
    unavailable("Canonical event source is unavailable.");
  }
  return raw;
}

function exactRun(raw: FirebaseFirestore.DocumentData | undefined,
  command: PagedSeatBootstrapCommand): MigrationRun {
  if (!raw || raw.eventId !== command.eventId ||
      raw.organizerId !== command.organizerId ||
      raw.migrationRevision !== command.migrationRevision ||
      raw.asOfMillis !== command.asOfMillis ||
      (raw.reviewedRequestHash ?? null) !==
        (command.reviewedRequestHash ?? null) ||
      !ID.test(raw.fenceToken) ||
      !/^[a-f0-9]{64}$/u.test(raw.policyHash) ||
      !["scan", "plan", "apply", "cleanup", "complete", "discard"]
        .includes(raw.phase) ||
      !Number.isSafeInteger(raw.sourceIndex) ||
      raw.sourceIndex < 0 || raw.sourceIndex > SOURCES.length ||
      raw.cursor !== null &&
        (typeof raw.cursor !== "string" || !ID.test(raw.cursor)) ||
      !Array.isArray(raw.sourceCounts) ||
      raw.sourceCounts.length !== SOURCES.length ||
      raw.sourceCounts.some((count: unknown) =>
        !Number.isSafeInteger(count) || Number(count) < 0 ||
        Number(count) > MAX_SOURCE_ROWS) ||
      !Number.isSafeInteger(raw.outputCursor) ||
      raw.outputCursor < 0 || raw.outputCursor > MAX_OUTPUT_ROWS ||
      !Number.isSafeInteger(raw.outputCount) ||
      raw.outputCount < 0 || raw.outputCount > MAX_OUTPUT_ROWS) {
    unavailable("Seat migration checkpoint is malformed.");
  }
  return raw as MigrationRun;
}

function assertFence(raw: FirebaseFirestore.DocumentData | undefined,
  run: MigrationRun): void {
  if (!raw || raw.eventId !== run.eventId ||
      raw.organizerId !== run.organizerId ||
      raw.migrationRevision !== run.migrationRevision ||
      raw.token !== run.fenceToken || raw.state !== "locked") {
    unavailable("Seat writer fence changed during migration.");
  }
}

function assertLedger(raw: FirebaseFirestore.DocumentData | undefined,
  run: MigrationRun): void {
  if (!raw || raw.eventId !== run.eventId ||
      raw.migrationRevision !== run.migrationRevision ||
      raw.state !== "unreconciled" ||
      raw.policyHash !== run.policyHash) {
    unavailable("Seat ledger changed during migration.");
  }
}

async function readBase(params: {tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  command: PagedSeatBootstrapCommand;
  prepareReviewedEvent?: PagedSeatBootstrapDeps["prepareReviewedEvent"]}) {
  const {tx, db, command} = params;
  const eventRef = db.collection("events").doc(command.eventId);
  const ledgerRef = db.collection("eventSeatLedgers").doc(command.eventId);
  const runRef = db.collection("eventSeatMigrationRuns")
    .doc(command.eventId);
  const fenceRef = db.collection("eventSeatMigrationFences")
    .doc(command.eventId);
  const [eventSnap, ledgerSnap, runSnap, fenceSnap] = await Promise.all([
    tx.get(eventRef), tx.get(ledgerRef), tx.get(runRef), tx.get(fenceRef),
  ]);
  const sourceEvent = exactEvent(eventSnap.data(), command);
  const review = command.reviewedRequestHash === undefined ? undefined :
    await params.prepareReviewedEvent!({tx, command, event: sourceEvent});
  const event = review ?
    exactEvent({...sourceEvent, ...review.patch}, command) : sourceEvent;
  const policy = deriveEventSeatPolicy(event);
  if (policy.organizerId !== command.organizerId) {
    unavailable("Event capacity owner is unavailable.");
  }
  return {event, eventRef, review, policy, ledgerRef, runRef, fenceRef,
    ledger: ledgerSnap.data(), run: runSnap.data(), fence: fenceSnap.data()};
}

/** Acquiring this fence is part of bootstrap, never a caller supplied claim. */
async function initialize(command: PagedSeatBootstrapCommand,
  deps: PagedSeatBootstrapDeps): Promise<void> {
  await deps.db.runTransaction(async (tx) => {
    await deps.authorizeTransaction?.(tx, command);
    const runRef = deps.db.collection("eventSeatMigrationRuns")
      .doc(command.eventId);
    const existingRun = await tx.get(runRef);
    if (existingRun.exists) {
      const run = exactRun(existingRun.data(), command);
      if (run.phase === "cleanup" || run.phase === "complete") {
        const [fenceSnap, ledgerSnap] = await Promise.all([
          tx.get(deps.db.collection("eventSeatMigrationFences")
            .doc(command.eventId)),
          tx.get(deps.db.collection("eventSeatLedgers")
            .doc(command.eventId)),
        ]);
        if (fenceSnap.data()?.state !== "ready" ||
            fenceSnap.data()?.token !== run.fenceToken ||
            ledgerSnap.data()?.state !== "ready" ||
            ledgerSnap.data()?.migrationRevision !==
              run.migrationRevision) {
          unavailable("Completed seat migration authority changed.");
        }
        return;
      }
    }
    const base = await readBase({tx, db: deps.db, command,
      prepareReviewedEvent: deps.prepareReviewedEvent});
    if (base.run) {
      const run = exactRun(base.run, command);
      assertFence(base.fence, run);
      assertLedger(base.ledger, run);
      if (base.policy.status !== "active" ||
          base.policy.policyHash !== run.policyHash) {
        unavailable("Event policy changed during migration.");
      }
      return;
    }
    if (base.ledger || base.fence) {
      unavailable("Existing seat authority needs manual reconciliation.");
    }
    if (base.policy.status !== "active") {
      unavailable("Event capacity is unavailable.");
    }
    await assertNoOutstandingMigrationHolds({db: deps.db, tx,
      eventId: command.eventId});
    const token = `mig_${digest([command.eventId,
      command.migrationRevision, command.asOfMillis]).slice(0, 48)}`;
    const run: MigrationRun = {eventId: command.eventId,
      organizerId: command.organizerId,
      migrationRevision: command.migrationRevision,
      asOfMillis: command.asOfMillis, fenceToken: token,
      policyHash: base.policy.policyHash, phase: "scan", sourceIndex: 0,
      cursor: null, sourceCounts: [0, 0, 0], planHash: null,
      outputCursor: 0, outputCount: 0,
      reviewedRequestHash: command.reviewedRequestHash ?? null};
    tx.create(base.fenceRef, {eventId: command.eventId,
      organizerId: command.organizerId,
      migrationRevision: command.migrationRevision, token,
      state: "locked"});
    tx.create(base.ledgerRef, {eventId: command.eventId,
      capacity: base.policy.capacity, occupied: 0, revision: 1,
      capacityRevision: 1, policyVersion: base.policy.policyVersion,
      policyHash: base.policy.policyHash,
      migrationRevision: command.migrationRevision, state: "unreconciled"});
    tx.create(base.runRef, run);
  });
}

/** One durable, ordered source page. A missing terminal page cannot advance. */
async function scanPage(command: PagedSeatBootstrapCommand,
  deps: PagedSeatBootstrapDeps): Promise<boolean> {
  return deps.db.runTransaction(async (tx) => {
    await deps.authorizeTransaction?.(tx, command);
    const base = await readBase({tx, db: deps.db, command,
      prepareReviewedEvent: deps.prepareReviewedEvent});
    const run = exactRun(base.run, command);
    assertFence(base.fence, run);
    assertLedger(base.ledger, run);
    if (base.policy.status !== "active" ||
        base.policy.policyHash !== run.policyHash) {
      unavailable("Seat sources changed during migration.");
    }
    if (run.phase !== "scan") return false;
    if (run.sourceIndex >= SOURCES.length) {
      unavailable("Incomplete source scan checkpoint.");
    }
    const kind = SOURCES[run.sourceIndex];
    let query: FirebaseFirestore.Query = deps.db.collection(kind)
      .where("eventId", "==", command.eventId)
      .orderBy(FieldPath.documentId());
    if (run.cursor) query = query.startAfter(run.cursor);
    const page = await tx.get(query.limit(PAGE_SIZE + 1));
    const rows = page.docs.slice(0, PAGE_SIZE);
    if (rows.some((doc) => !ID.test(doc.id))) {
      unavailable("Seat source document ID is malformed.");
    }
    const nextCount = run.sourceCounts[run.sourceIndex] + rows.length;
    if (nextCount > MAX_SOURCE_ROWS) {
      unavailable("Seat source exceeds bounded migration support.");
    }
    const counts = [...run.sourceCounts] as [number, number, number];
    counts[run.sourceIndex] = nextCount;
    const hasMore = page.docs.length > PAGE_SIZE;
    for (const doc of rows) {
      const value = sourceProjection(kind, doc.data());
      if (value.eventId !== command.eventId) {
        unavailable("Seat source event scope changed.");
      }
      const id = sourceStageId(command.eventId,
        command.migrationRevision, kind, doc.id);
      tx.create(deps.db.collection("eventSeatMigrationStages").doc(id),
        {eventId: command.eventId,
          migrationRevision: command.migrationRevision, kind,
          sourceId: doc.id, value});
    }
    tx.update(base.runRef, {sourceCounts: counts,
      sourceIndex: hasMore ? run.sourceIndex : run.sourceIndex + 1,
      cursor: hasMore ? rows.at(-1)!.id : null,
      phase: run.sourceIndex + 1 === SOURCES.length && !hasMore ?
        "plan" : "scan"});
    return true;
  });
}

function receipt(raw: FirebaseFirestore.DocumentData,
  organizerId: string): SeatMigrationFormReceipt {
  if (raw.organizerId !== organizerId ||
      raw.kind !== "eventAttendeeProposal" ||
      typeof raw.formId !== "string" ||
      typeof raw.responseId !== "string" ||
      !["completed", "failed", "pending"].includes(raw.status) ||
      !Array.isArray(raw.fields)) {
    unavailable("Form admission receipt is malformed.");
  }
  const targets = raw.fields.filter((field: unknown) => field &&
    typeof field === "object" &&
    (field as {destinationField?: unknown}).destinationField === "eventId");
  if (targets.length !== 1 || typeof targets[0].value !== "string") {
    unavailable("Form admission target is unavailable.");
  }
  return {organizerId, eventId: targets[0].value,
    formId: raw.formId, responseId: raw.responseId, status: raw.status};
}

async function authProofs(auth: PagedSeatBootstrapDeps["auth"],
  uids: string[]): Promise<SeatMigrationVerifiedPhone[]> {
  const records = await Promise.all(uids.map((uid) => auth.getUser(uid)));
  return records.map((record, index) => {
    if (record.uid !== uids[index]) unavailable("Auth UID source changed.");
    const phone = record.phoneNumber ?? null;
    if (phone !== null) {
      const normalized = normalizeRosterPhone(phone);
      if (normalized.issue || normalized.value !== phone) {
        unavailable("Auth verified phone is malformed.");
      }
    }
    return {uid: record.uid, phoneE164: phone, verifiedByAuth: true};
  });
}

interface PlannedOutput {
  collection: "eventSeatReservations" | "eventSeatIdentityAliases" |
    "eventSeatVerifiedPhones";
  id: string;
  value: FirebaseFirestore.DocumentData;
}

interface FrozenPlan {
  eventId: string;
  organizerId: string;
  migrationRevision: number;
  hash: string;
  ledger: FirebaseFirestore.DocumentData;
  outputs: PlannedOutput[];
}

function exactFrozenPlan(raw: FirebaseFirestore.DocumentData | undefined,
  run: MigrationRun): FrozenPlan {
  if (!raw || raw.eventId !== run.eventId ||
      raw.organizerId !== run.organizerId ||
      raw.migrationRevision !== run.migrationRevision ||
      raw.hash !== run.planHash ||
      !Array.isArray(raw.outputs) ||
      raw.outputs.length !== run.outputCount ||
      raw.outputs.length > MAX_OUTPUT_ROWS ||
      !raw.ledger ||
      digest({ledger: raw.ledger, outputs: raw.outputs}) !== raw.hash) {
    unavailable("Frozen seat migration plan is inconsistent.");
  }
  return raw as FrozenPlan;
}

async function readPlan(params: {command: PagedSeatBootstrapCommand;
  deps: PagedSeatBootstrapDeps; tx: FirebaseFirestore.Transaction;
  base: Awaited<ReturnType<typeof readBase>>; run: MigrationRun;
  verifyLiveSources?: boolean}) {
  const {command, deps, tx, base, run} = params;
  const stageSnap = await tx.get(deps.db.collection("eventSeatMigrationStages")
    .where("eventId", "==", command.eventId)
    .where("migrationRevision", "==", command.migrationRevision)
    .limit(MAX_SOURCE_ROWS * SOURCES.length + 1));
  const expected = run.sourceCounts.reduce((a, b) => a + b, 0);
  if (run.sourceIndex !== SOURCES.length || run.cursor !== null ||
      stageSnap.size !== expected ||
      stageSnap.size > MAX_SOURCE_ROWS * SOURCES.length) {
    unavailable("Seat source scan is incomplete.");
  }
  const grouped = new Map<Source, Array<{id: string;
    value: FirebaseFirestore.DocumentData}>>();
  for (const kind of SOURCES) grouped.set(kind, []);
  for (const doc of stageSnap.docs) {
    const row = doc.data();
    if (!SOURCES.includes(row.kind) || !ID.test(row.sourceId) ||
        doc.id !== sourceStageId(command.eventId,
          command.migrationRevision, row.kind, row.sourceId) ||
        !row.value || typeof row.value !== "object" ||
        row.value.eventId !== command.eventId) {
      unavailable("Seat source checkpoint is malformed.");
    }
    grouped.get(row.kind)!.push({id: row.sourceId, value: row.value});
  }
  SOURCES.forEach((kind, index) => {
    if (grouped.get(kind)!.length !== run.sourceCounts[index]) {
      unavailable("Seat source page count changed.");
    }
  });
  if (params.verifyLiveSources) {
    await assertNoOutstandingMigrationHolds({db: deps.db, tx,
      eventId: command.eventId});
    await assertLiveMigrationSourcesMatchStage({db: deps.db, tx,
      eventId: command.eventId, organizerId: command.organizerId,
      migrationRevision: command.migrationRevision,
      fenceToken: run.fenceToken, sourceCounts: run.sourceCounts,
      staged: stageSnap.docs.map((doc) => {
        const row = doc.data();
        return {kind: row.kind as Source, sourceId: row.sourceId as string,
          value: row.value as FirebaseFirestore.DocumentData};
      }), project: sourceProjection});
  }
  const participations = grouped.get("eventParticipations")!.map((row) =>
    row.value as SeatMigrationParticipation);
  const attendees = grouped.get("eventAttendees")!.map((row) =>
    ({...row.value, id: row.id} as SeatMigrationAttendee));
  const origins = grouped.get("organizerContactOrigins")!.map((row) =>
    ({...row.value, id: row.id} as SeatMigrationContactOrigin));
  const uids = [...new Set([...participations.map((row) => row.uid),
    ...attendees.map((row) => row.linkedUid)
      .filter((uid): uid is string => uid !== null)])].sort();
  if (uids.length > MAX_SOURCE_ROWS || uids.some((uid) => !ID.test(uid))) {
    unavailable("Auth identity source exceeds migration support.");
  }
  const verifiedPhones = await authProofs(deps.auth, uids);
  const responseIds = [...new Set(attendees
    .filter((row) => row.source === "hostManual" &&
      typeof row.externalReference === "string" &&
      row.sourceRowId === row.externalReference.slice(0, 120))
    .map((row) => row.externalReference!))];
  const receiptSnaps = await Promise.all(responseIds.map((responseId) =>
    tx.get(deps.db.collection("organizerFormConversionReceipts")
      .doc(formConversionReceiptId(responseId, "eventAttendeeProposal",
        command.eventId)))));
  const receipts: SeatMigrationFormReceipt[] = [];
  const formOriginIds: string[] = [];
  receiptSnaps.forEach((snap, index) => {
    if (!snap.exists) return;
    const value = receipt(snap.data()!, command.organizerId);
    if (value.eventId !== command.eventId ||
        value.responseId !== responseIds[index]) {
      unavailable("Form admission receipt target conflicts with attendee.");
    }
    receipts.push(value);
    formOriginIds.push(organizerContactOriginId({
      organizerId: command.organizerId, sourceKind: "hostForm",
      sourceEntityKind: "hostFormResponse", sourceEntityId: value.responseId,
    }));
  });
  const formOriginSnaps = await Promise.all(formOriginIds.map((id) =>
    tx.get(deps.db.collection("organizerContactOrigins").doc(id))));
  const known = new Set(origins.map((origin) => origin.id));
  formOriginSnaps.forEach((snap, index) => {
    if (snap.exists && !known.has(formOriginIds[index])) {
      origins.push({...snap.data(), id: formOriginIds[index]} as
        SeatMigrationContactOrigin);
      known.add(formOriginIds[index]);
    }
  });
  if (origins.length > MAX_SOURCE_ROWS) {
    unavailable("Event CRM origins exceed migration support.");
  }
  const contactIds = [...new Set(origins.map((origin) =>
    origin.currentContactId))];
  if (contactIds.some((id) => !ID.test(id))) {
    unavailable("CRM survivor reference is malformed.");
  }
  const contactSnaps = await Promise.all(contactIds.map((id) =>
    tx.get(deps.db.collection("organizerContacts").doc(id))));
  const contacts: SeatMigrationContact[] = contactSnaps.map((snap, index) => {
    const raw = snap.data();
    if (!raw) unavailable("CRM survivor is missing.");
    return {id: contactIds[index], organizerId: raw.organizerId,
      linkedUid: raw.linkedUid, identityState: raw.identityState,
      deleted: raw.deletedAt !== null, hidden: raw.hiddenAt !== null,
      mergedIntoContactId: raw.mergedIntoContactId,
      ambiguousCandidateContactIds: raw.ambiguousCandidateContactIds};
  });
  const plan = planEventSeatMigration({eventId: command.eventId,
    organizerId: command.organizerId, event: base.event,
    migrationRevision: command.migrationRevision,
    asOfMillis: command.asOfMillis, participations, attendees,
    verifiedPhones, origins, contacts, formReceipts: receipts,
    sourceReadEvidence: {complete: true,
      participationRows: participations.length,
      attendeeRows: attendees.length, originRows: origins.length}});
  if (plan.state !== "ready") {
    unavailable(`Seat reconciliation blocked: ${plan.blockers.join(", ")}`);
  }
  const outputs: PlannedOutput[] = [
    ...plan.reservations.map((row) => ({collection:
      "eventSeatReservations" as const, ...row})),
    ...plan.aliases.map((row) => ({collection:
      "eventSeatIdentityAliases" as const, ...row})),
    ...plan.verifiedPhoneProofs.map((value) => ({collection:
      "eventSeatVerifiedPhones" as const,
    id: seatVerifiedPhoneProofId(command.eventId, value.uid), value})),
  ].sort((a, b) =>
    `${a.collection}/${a.id}`.localeCompare(`${b.collection}/${b.id}`));
  if (outputs.length > MAX_OUTPUT_ROWS) {
    unavailable("Seat evidence exceeds bounded migration support.");
  }
  return {plan, outputs, hash: digest({ledger: plan.ledger, outputs}),
    verifiedPhones};
}

/** Freeze the globally validated plan once; output pages read this document. */
async function freezePlan(command: PagedSeatBootstrapCommand,
  deps: PagedSeatBootstrapDeps): Promise<void> {
  await deps.db.runTransaction(async (tx) => {
    await deps.authorizeTransaction?.(tx, command);
    const base = await readBase({tx, db: deps.db, command,
      prepareReviewedEvent: deps.prepareReviewedEvent});
    const run = exactRun(base.run, command);
    assertFence(base.fence, run);
    assertLedger(base.ledger, run);
    if (run.phase !== "plan" || base.policy.status !== "active" ||
        base.policy.policyHash !== run.policyHash) {
      unavailable("Seat migration source is not ready for planning.");
    }
    const computed = await readPlan({command, deps, tx, base, run});
    const frozen: FrozenPlan = {eventId: command.eventId,
      organizerId: command.organizerId,
      migrationRevision: command.migrationRevision,
      hash: computed.hash, ledger: computed.plan.ledger,
      outputs: computed.outputs};
    if (Buffer.byteLength(JSON.stringify(frozen), "utf8") > 750000) {
      unavailable("Frozen seat plan exceeds the document byte budget.");
    }
    tx.create(deps.db.collection("eventSeatMigrationPlans")
      .doc(command.eventId), frozen);
    tx.update(base.runRef, {phase: "apply", planHash: computed.hash,
      outputCount: computed.outputs.length});
  });
}

/** Apply at most one output page and its durable cursor in one transaction. */
async function applyPage(command: PagedSeatBootstrapCommand,
  deps: PagedSeatBootstrapDeps): Promise<boolean> {
  return deps.db.runTransaction(async (tx) => {
    await deps.authorizeTransaction?.(tx, command);
    const base = await readBase({tx, db: deps.db, command,
      prepareReviewedEvent: deps.prepareReviewedEvent});
    const run = exactRun(base.run, command);
    assertFence(base.fence, run);
    assertLedger(base.ledger, run);
    if (base.policy.status !== "active" ||
        base.policy.policyHash !== run.policyHash) {
      unavailable("Seat sources changed during migration.");
    }
    if (run.phase !== "apply") unavailable("Source scan is incomplete.");
    const frozenSnap = await tx.get(deps.db
      .collection("eventSeatMigrationPlans").doc(command.eventId));
    const frozen = exactFrozenPlan(frozenSnap.data(), run);
    if (run.outputCursor === frozen.outputs.length) {
      // The final transaction re-reads current source, CRM and Admin Auth
      // once. Every writer remained fenced throughout the staged pages.
      const current = await readPlan({command, deps, tx, base, run,
        verifyLiveSources: true});
      if (current.hash !== frozen.hash) {
        unavailable("Migration source changed before activation.");
      }
      if (base.review) {
        tx.update(base.eventRef, base.review.patch);
        base.review.finish?.();
      }
      tx.update(base.ledgerRef, {...frozen.ledger,
        revision: (base.ledger!.revision as number) + 1,
        capacityRevision: base.ledger!.capacityRevision,
        state: "ready"});
      tx.update(base.fenceRef, {state: "ready"});
      tx.update(base.runRef, {phase: "cleanup"});
      return true;
    }
    const page = frozen.outputs.slice(run.outputCursor,
      run.outputCursor + PAGE_SIZE);
    const snaps = await Promise.all(page.map((output) =>
      tx.get(deps.db.collection(output.collection).doc(output.id))));
    page.forEach((output, index) => {
      if (snaps[index].exists) {
        unavailable("Seat evidence already exists before this page.");
      }
      tx.create(deps.db.collection(output.collection).doc(output.id),
        output.value);
    });
    tx.update(base.runRef, {outputCursor: run.outputCursor + page.length});
    return true;
  });
}

/** Staged private source copies are removed in bounded resumable pages. */
async function cleanupPage(command: PagedSeatBootstrapCommand,
  deps: PagedSeatBootstrapDeps): Promise<boolean> {
  return deps.db.runTransaction(async (tx) => {
    await deps.authorizeTransaction?.(tx, command);
    const runRef = deps.db.collection("eventSeatMigrationRuns")
      .doc(command.eventId);
    const [runSnap, fenceSnap, ledgerSnap] = await Promise.all([
      tx.get(runRef),
      tx.get(deps.db.collection("eventSeatMigrationFences")
        .doc(command.eventId)),
      tx.get(deps.db.collection("eventSeatLedgers")
        .doc(command.eventId)),
    ]);
    const run = exactRun(runSnap.data(), command);
    if (run.phase !== "cleanup" ||
        fenceSnap.data()?.state !== "ready" ||
        fenceSnap.data()?.token !== run.fenceToken ||
        ledgerSnap.data()?.state !== "ready" ||
        ledgerSnap.data()?.migrationRevision !== run.migrationRevision) {
      unavailable("Seat migration cleanup authority changed.");
    }
    const page = await tx.get(deps.db
      .collection("eventSeatMigrationStages")
      .where("eventId", "==", command.eventId)
      .where("migrationRevision", "==", command.migrationRevision)
      .limit(PAGE_SIZE));
    if (page.empty || page.docs.length === 0) {
      const frozenRef = deps.db.collection("eventSeatMigrationPlans")
        .doc(command.eventId);
      const frozenSnap = await tx.get(frozenRef);
      exactFrozenPlan(frozenSnap.data(), run);
      tx.delete(frozenRef);
      tx.update(runRef, {phase: "complete"});
      return false;
    }
    for (const doc of page.docs) {
      const value = doc.data();
      if (value.eventId !== command.eventId ||
          value.migrationRevision !== command.migrationRevision) {
        unavailable("Foreign staged seat source cannot be deleted.");
      }
      tx.delete(deps.db.collection("eventSeatMigrationStages").doc(doc.id));
    }
    return true;
  });
}

/**
 * Server-owned resumable bootstrap. Integrated writers must read
 * eventSeatMigrationFences/{eventId} in their own write transaction and deny
 * while locked. The ledger stays unreconciled until all pages are witnessed.
 */
export async function bootstrapEventSeatLedgerPaged(params: {
  command: PagedSeatBootstrapCommand;
  deps: PagedSeatBootstrapDeps;
}): Promise<{eventId: string; occupied: number;
  migrationRevision: number}> {
  const {command, deps} = params;
  validateBootstrap(command, deps);
  await initialize(command, deps);
  const maxPageSteps = Math.ceil(MAX_SOURCE_ROWS * SOURCES.length /
    PAGE_SIZE) + Math.ceil(MAX_OUTPUT_ROWS / PAGE_SIZE) +
    Math.ceil(MAX_SOURCE_ROWS * SOURCES.length / PAGE_SIZE) + 8;
  for (let page = 0; page <= maxPageSteps; page++) {
    const runSnap = await deps.db.collection("eventSeatMigrationRuns")
      .doc(command.eventId).get();
    const run = exactRun(runSnap.data(), command);
    if (run.phase === "complete") {
      const progress = await readMigrationProgress(command, deps);
      return {eventId: command.eventId, occupied: progress.occupied!,
        migrationRevision: command.migrationRevision};
    }
    if (run.phase === "scan") {
      await scanPage(command, deps);
      continue;
    }
    if (run.phase === "plan") {
      await freezePlan(command, deps);
      continue;
    }
    if (run.phase === "apply") {
      await applyPage(command, deps);
      continue;
    }
    await cleanupPage(command, deps);
  }
  unavailable("Seat migration exceeded its bounded page budget.");
}

function validateBootstrap(command: PagedSeatBootstrapCommand,
  deps: PagedSeatBootstrapDeps): void {
  if (!command || !ID.test(command.eventId) ||
      !ID.test(command.organizerId) ||
      !Number.isSafeInteger(command.migrationRevision) ||
      command.migrationRevision < 1 ||
      !Number.isSafeInteger(command.asOfMillis) ||
      command.asOfMillis < 0 ||
      (command.reviewedRequestHash !== undefined &&
        (!/^[a-f0-9]{64}$/.test(command.reviewedRequestHash) ||
          deps.prepareReviewedEvent === undefined ||
          deps.authorizeTransaction === undefined))) {
    unavailable("Seat bootstrap is unavailable.");
  }
}

export interface SeatMigrationProgress {
  eventId: string;
  migrationRevision: number;
  phase: Phase;
  scannedRows: number;
  appliedRows: number;
  outputRows: number;
  occupied: number | null;
}

/** One bounded Host request, resumable from the durable checkpoint. A caller
 * must journal its exact command; a returned scan/apply phase is not readiness.
 */
export async function advanceEventSeatLedgerMigration(params: {
  command: PagedSeatBootstrapCommand;
  deps: PagedSeatBootstrapDeps;
  pageBudget?: number;
}): Promise<SeatMigrationProgress> {
  const {command, deps, pageBudget = 3} = params;
  validateBootstrap(command, deps);
  if (!Number.isInteger(pageBudget) || pageBudget < 1 || pageBudget > 5) {
    unavailable("Invalid seat reconciliation page budget.");
  }
  await initialize(command, deps);
  for (let step = 0; step < pageBudget; step++) {
    const run = exactRun((await deps.db.collection("eventSeatMigrationRuns")
      .doc(command.eventId).get()).data(), command);
    if (run.phase === "complete") break;
    if (run.phase === "scan") await scanPage(command, deps);
    else if (run.phase === "plan") await freezePlan(command, deps);
    else if (run.phase === "apply") await applyPage(command, deps);
    else await cleanupPage(command, deps);
  }
  return readMigrationProgress(command, deps);
}

async function readMigrationProgress(command: PagedSeatBootstrapCommand,
  deps: PagedSeatBootstrapDeps): Promise<SeatMigrationProgress> {
  return deps.db.runTransaction(async (tx) => {
    await deps.authorizeTransaction?.(tx, command);
    const [runSnap, ledgerSnap, fenceSnap] = await Promise.all([
      tx.get(deps.db.collection("eventSeatMigrationRuns").doc(command.eventId)),
      tx.get(deps.db.collection("eventSeatLedgers").doc(command.eventId)),
      tx.get(deps.db.collection("eventSeatMigrationFences")
        .doc(command.eventId)),
    ]);
    const run = exactRun(runSnap.data(), command);
    const ledger = ledgerSnap.data();
    const fence = fenceSnap.data();
    if (run.phase === "complete" || run.phase === "cleanup") {
      if (ledger?.state !== "ready" || ledger.eventId !== command.eventId ||
          ledger.migrationRevision !== command.migrationRevision ||
          fence?.state !== "ready" || fence.eventId !== command.eventId ||
          fence.organizerId !== command.organizerId ||
          fence.migrationRevision !== command.migrationRevision ||
          fence.token !== run.fenceToken) {
        unavailable("Seat migration completion is inconsistent.");
      }
    } else {
      assertFence(fence, run);
      assertLedger(ledger, run);
    }
    return {eventId: command.eventId,
      migrationRevision: command.migrationRevision, phase: run.phase,
      scannedRows: run.sourceCounts.reduce((sum, count) => sum + count, 0),
      appliedRows: run.outputCursor, outputRows: run.outputCount,
      occupied: run.phase === "complete" ? ledger!.occupied as number : null};
  });
}


/** Explicitly abandons only a pre-apply run. A durable caller-owned tombstone
 * commits before the writer lock is released, preventing delayed old commands
 * from starting again after the organizer reviews corrected terms.
 */
export async function discardEventSeatLedgerMigration(params: {
  command: PagedSeatBootstrapCommand;
  deps: PagedSeatBootstrapDeps;
  prepareDiscard: (tx: FirebaseFirestore.Transaction) => Promise<() => void>;
  pageBudget?: number;
}): Promise<{complete: boolean; progress: SeatMigrationProgress | null}> {
  const {command, deps, pageBudget = 3} = params;
  validateBootstrap(command, deps);
  if (!deps.authorizeTransaction || !Number.isInteger(pageBudget) ||
      pageBudget < 1 || pageBudget > 5) {
    unavailable("Invalid guest reconciliation discard request.");
  }
  let progress: SeatMigrationProgress | null = null;
  for (let page = 0; page < pageBudget; page++) {
    const result = await deps.db.runTransaction(async (tx) => {
      await deps.authorizeTransaction!(tx, command);
      const runRef = deps.db.collection("eventSeatMigrationRuns")
        .doc(command.eventId);
      const fenceRef = deps.db.collection("eventSeatMigrationFences")
        .doc(command.eventId);
      const ledgerRef = deps.db.collection("eventSeatLedgers")
        .doc(command.eventId);
      const planRef = deps.db.collection("eventSeatMigrationPlans")
        .doc(command.eventId);
      const [runSnap, fenceSnap, ledgerSnap, planSnap] = await Promise.all([
        tx.get(runRef), tx.get(fenceRef), tx.get(ledgerRef), tx.get(planRef),
      ]);
      if (!runSnap.exists || runSnap.data()?.phase === "complete") {
        // Cancelling an unapplied settings command on an already-ready event
        // leaves its existing ledger/fence entirely untouched.
        await readSeatMigrationWriterFence({db: deps.db, tx,
          eventId: command.eventId});
        if (planSnap.exists) unavailable("Unowned seat plan needs review.");
        const finish = await params.prepareDiscard(tx);
        finish();
        return {complete: true, progress: null};
      }
      const run = exactRun(runSnap.data(), command);
      assertFence(fenceSnap.data(), run);
      assertLedger(ledgerSnap.data(), run);
      if (!["scan", "plan", "discard"].includes(run.phase) ||
          run.outputCursor !== 0 || run.outputCount !== 0 ||
          run.planHash !== null || planSnap.exists) {
        throw new HttpsError("failed-precondition",
          "Guest changes have begun. Continue the saved change.",
          {reason: "seat-reconciliation-discard-unavailable"});
      }
      const rows = await tx.get(deps.db.collection("eventSeatMigrationStages")
        .where("eventId", "==", command.eventId)
        .where("migrationRevision", "==", command.migrationRevision)
        .limit(PAGE_SIZE));
      const finish = await params.prepareDiscard(tx);
      for (const doc of rows.docs) {
        const value = doc.data();
        if (value.eventId !== command.eventId ||
            value.migrationRevision !== command.migrationRevision) {
          unavailable("Foreign staged guest source cannot be discarded.");
        }
      }
      if (rows.docs.length === 0) {
        finish();
        tx.delete(runRef);
        tx.delete(ledgerRef);
        tx.delete(fenceRef);
        return {complete: true, progress: null};
      }
      for (const doc of rows.docs) {
        tx.delete(deps.db.collection("eventSeatMigrationStages").doc(doc.id));
      }
      tx.update(runRef, {phase: "discard"});
      return {complete: false, progress: {eventId: command.eventId,
        migrationRevision: command.migrationRevision, phase: "discard" as const,
        scannedRows: run.sourceCounts.reduce((a, b) => a + b, 0),
        appliedRows: 0, outputRows: 0, occupied: null}};
    });
    if (result.complete) return result;
    progress = result.progress;
  }
  return {complete: false, progress};
}
