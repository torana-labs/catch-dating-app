#!/usr/bin/env node
// One-off move of every existing event onto the seat ledger. Events without
// an eventSeatLedgers/{eventId} document still use the legacy seat path; this
// tool gives each of them a ledger so the legacy path can be removed.
//
// Dry run (the default) only reads. --apply creates empty ledgers for
// cancelled events with no guests, runs the paged migration engine for active
// events and then sets events.bookedCount to the ledger's occupied seats.
import {isMain, parseCommonArgs} from "../lib/cli_args.mjs";
import {createFunctionsRequire} from "../lib/repo_paths.mjs";
import {
  assertProdWriteAllowed,
  resolveFirebaseProjectId,
} from "../lib/firebase_project.mjs";

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u;
const SOURCES = ["eventBookings", "eventAttendees", "organizerContactOrigins"];
const MIGRATION_REVISION = 1;
// Mirrors functions/src/events/seatMigrationPaged.ts. The planner output and
// frozen-plan budgets are private there; the source bound is imported.
const MAX_OUTPUT_ROWS = 1500;
const FROZEN_PLAN_BYTE_BUDGET = 750000;
const EVENT_PAGE_SIZE = 300;
const SCAN_PAGE_SIZE = 500;
// A cancelled event's rows are re-read inside its ledger transaction.
const CANCELLED_TX_ROW_LIMIT = 2000;
const ACTIVE_BOOKING = new Set(["signedUp", "attended"]);
const ACTIVE_ATTENDEE = new Set(["registered", "checkedIn"]);
const DISCARDABLE_PHASES = new Set(["scan", "plan", "discard"]);

export const REPORT_CLASSES = [
  "on-ledger",
  "unfinished-migration",
  "demo",
  "malformed",
  "missing",
  "cancelled-empty",
  "cancelled-with-guests",
  "migratable",
  "blocked",
];

export async function main(argv = process.argv.slice(2)) {
  const args = parseMigrateArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.env && !args.project && !args.emulatorHost) {
    throw new Error(
      "Name the target with --env <dev|prod>, --project <id> or --emulator.",
    );
  }
  const projectId = resolveFirebaseProjectId({
    env: args.env, project: args.project, defaultEnv: null,
  });
  assertProdWriteAllowed({
    env: args.env, projectId, apply: args.apply, allowProd: args.allowProd,
    confirmProd: args.confirmProd,
    action: "move prod events onto the seat ledger",
  });
  if (args.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = args.emulatorHost;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = args.authEmulatorHost;
  }

  const requireFromFunctions = createFunctionsRequire();
  const lib = loadSeatLib(requireFromFunctions);
  const admin = requireFromFunctions("firebase-admin");
  admin.initializeApp({projectId});
  const db = admin.firestore();
  const auth = admin.auth();
  const nowMillis = Date.now();

  const report = args.discard.length > 0 ?
    await runDiscards({db, auth, lib, eventIds: args.discard,
      apply: args.apply}) :
    await runBackfill({db, auth, lib, eventIds: args.events,
      apply: args.apply, nowMillis});
  report.projectId = projectId;

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else printReport(report);
  if (report.failures > 0) process.exitCode = 1;
}

/**
 * --event and --discard repeat; the shared parser keeps only the last value
 * of a custom flag, so both are collected here first.
 */
export function parseMigrateArgs(argv) {
  const events = [];
  const discard = [];
  const rest = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const match = /^--(event|discard)(?:=(.*))?$/u.exec(arg);
    if (!match) {
      rest.push(arg);
      continue;
    }
    const value = match[2] ?? argv[++index];
    if (value === undefined || value.startsWith("-")) {
      throw new Error(`--${match[1]} requires an event id.`);
    }
    if (!ID.test(value)) {
      throw new Error(`--${match[1]} ${value} is not an event id.`);
    }
    (match[1] === "event" ? events : discard).push(value);
  }
  const common = parseCommonArgs(rest, {
    valueFlags: ["--auth-emulator-host"],
    allowPositionals: false,
    customFieldCase: "camel",
  });
  if (events.length > 0 && discard.length > 0) {
    throw new Error("Use --event or --discard, not both.");
  }
  if (common.authEmulatorHost !== undefined && !common.emulatorHost) {
    throw new Error("--auth-emulator-host needs --emulator or --emulator-host.");
  }
  return {
    env: common.env,
    project: common.project,
    emulatorHost: common.emulatorHost,
    authEmulatorHost: common.emulatorHost ?
      common.authEmulatorHost ?? "127.0.0.1:9099" : null,
    apply: common.apply,
    allowProd: common.allowProd,
    confirmProd: common.confirmProd,
    json: common.json,
    help: common.help,
    events: [...new Set(events)],
    discard: [...new Set(discard)],
  };
}

export function loadSeatLib(requireFromFunctions = createFunctionsRequire()) {
  const load = (modulePath) => {
    try {
      return requireFromFunctions(modulePath);
    } catch (error) {
      throw new Error(
        `Could not load functions/${modulePath.slice(2)}. Run ` +
        "`npm --prefix functions run build` before this tool. " +
        `Original error: ${error.message}`,
      );
    }
  };
  const paged = load("./lib/events/seatMigrationPaged.js");
  const birth = load("./lib/events/seatAuthority/eventSeatLedgerBirth.js");
  return {
    bootstrapEventSeatLedgerPaged: paged.bootstrapEventSeatLedgerPaged,
    discardEventSeatLedgerMigration: paged.discardEventSeatLedgerMigration,
    planEventSeatMigration:
      load("./lib/events/seatMigration.js").planEventSeatMigration,
    deriveEventSeatPolicy: load("./lib/events/seatAuthority/firestoreAdapter.js")
      .deriveEventSeatPolicy,
    newEventSeatLedger: birth.newEventSeatLedger,
    createEventSeatLedgerInTransaction:
      birth.createEventSeatLedgerInTransaction,
    assertNoOutstandingMigrationHolds:
      load("./lib/events/seatAuthority/migrationOutstandingHolds.js")
        .assertNoOutstandingMigrationHolds,
    maxSourceRows: load("./lib/events/seatAuthority/liveMigrationSource.js")
      .MAX_LIVE_MIGRATION_SOURCE_ROWS,
    validateEventDocument:
      load("./lib/shared/generated/validators/eventDocument.js")
        .validateEventDocument,
    normalizeRosterPhone:
      load("./lib/events/eventAttendees.js").normalizeRosterPhone,
    organizerContactOriginId: load("./lib/shared/organizerContactOrigins.js")
      .organizerContactOriginId,
    formConversionReceiptId:
      load("./lib/organizers/organizerFormAdmissionIdentity.js")
        .formConversionReceiptId,
    seatVerifiedPhoneProofId: load("./lib/events/seatIdentityAuthority.js")
      .seatVerifiedPhoneProofId,
    documentId: load("firebase-admin/firestore").FieldPath.documentId,
  };
}

// ---------------------------------------------------------------------------
// Pure decisions

export function isDemoEvent(event) {
  return event?.demoOps === true || event?.synthetic === true ||
    typeof event?.seedPrefix === "string";
}

/**
 * The class an event gets from its own document and seat authority documents,
 * before any source is read. "cancelled" and "active" need a source snapshot.
 */
export function preclassifyEvent({event, ledger, fence, run},
  {deriveEventSeatPolicy}) {
  if (!event) return {class: "missing"};
  const runOpen = run && run.phase !== "complete";
  if (ledger?.state === "ready" && fence?.state === "ready" && !runOpen) {
    return {class: "on-ledger"};
  }
  if (ledger || fence || run) {
    return {class: "unfinished-migration", ...describeUnfinished(
      {ledger, fence, run})};
  }
  if (isDemoEvent(event)) return {class: "demo"};
  let policy;
  try {
    policy = deriveEventSeatPolicy(event);
  } catch (error) {
    return {class: "malformed", error: error.message};
  }
  if (!ID.test(policy.organizerId)) {
    return {class: "malformed", error: "organizerId is not a document id."};
  }
  return {class: policy.status === "cancelled" ? "cancelled" : "active",
    organizerId: policy.organizerId, capacity: policy.capacity};
}

/** What a half-finished migration left behind and who may release it. */
export function describeUnfinished({ledger, fence, run}) {
  const owner = !run ? "none" :
    run.reviewedRequestHash == null ? "backfill" : "host";
  const phase = run?.phase ?? null;
  const writersBlocked = !(ledger?.state === "ready" &&
    fence?.state === "ready");
  const discardable = owner === "backfill" && DISCARDABLE_PHASES.has(phase) &&
    run.outputCursor === 0 && run.planHash === null;
  const next = owner === "host" ?
    "The host's own guest reconciliation owns this run; leave it." :
    owner === "none" ?
      "Ledger and fence disagree with no run; reconcile by hand." :
      discardable ?
        "Re-run with --apply to resume, or --discard <eventId> --apply to " +
        "release the lock." :
        "Activation has begun; re-run with --apply to resume.";
  return {phase, owner, writersBlocked, discardable,
    ledgerState: ledger?.state ?? null, fenceState: fence?.state ?? null,
    next};
}

/** Final class once a cancelled or active event's sources are read. */
export function classifyEvent(pre, snapshot) {
  if (pre.class === "cancelled") {
    const {activeBookings, activeAttendees, holds} = snapshot;
    const empty = activeBookings === 0 && activeAttendees === 0 && !holds;
    if (!empty) {
      return {...pre, class: "cancelled-with-guests", activeBookings,
        activeAttendees, holds: holds ?? null};
    }
    return {...pre, class: "cancelled-empty", bookedCount: bookedCountSync({
      bookedCount: snapshot.bookedCount, occupied: 0})};
  }
  if (pre.class === "active") {
    const blockers = [...new Set(snapshot.blockers)].sort();
    if (blockers.length > 0) {
      return {...pre, class: "blocked", blockers,
        ...(snapshot.detail ?? {})};
    }
    return {...pre, class: "migratable", occupied: snapshot.occupied,
      bookedCount: bookedCountSync({bookedCount: snapshot.bookedCount,
        occupied: snapshot.occupied}), ...(snapshot.detail ?? {})};
  }
  return pre;
}

/**
 * bookedCount means every occupied seat once the ledger exists. Returns the
 * change to make, or null when the event already agrees.
 */
export function bookedCountSync({bookedCount, occupied}) {
  if (!Number.isSafeInteger(occupied) || occupied < 0) {
    throw new Error(`Ledger occupied is not a seat count: ${occupied}`);
  }
  return bookedCount === occupied ? null :
    {from: bookedCount ?? null, to: occupied};
}

/** The engine's eventAttendees/bookings/origins projection, unchanged. */
export function sourceProjection(kind, raw) {
  const keys = kind === "eventBookings" ?
    ["eventId", "organizerId", "uid", "status"] :
    kind === "eventAttendees" ?
      ["eventId", "organizerId", "status", "source", "linkedUid",
        "phoneE164", "externalReference", "sourceRowId"] :
      ["eventId", "organizerId", "sourceKind", "sourceEntityKind",
        "sourceEntityId", "responseId", "formId", "originContactId",
        "currentContactId"];
  const projected = Object.fromEntries(keys.filter((key) =>
    raw[key] !== undefined).map((key) => [key, raw[key]]));
  if (kind === "eventAttendees") {
    for (const key of ["linkedUid", "phoneE164", "externalReference",
      "sourceRowId"]) {
      if (projected[key] === undefined) projected[key] = null;
    }
  }
  return projected;
}

export function summarize(events) {
  const classes = Object.fromEntries(REPORT_CLASSES.map((name) => [name, 0]));
  const results = {};
  for (const row of events) {
    classes[row.class] = (classes[row.class] ?? 0) + 1;
    if (row.result) results[row.result] = (results[row.result] ?? 0) + 1;
  }
  return {classes, results};
}

// ---------------------------------------------------------------------------
// Firestore reads

const readOnly = {get: (source) => source.get()};

async function readAuthority(db, eventId) {
  const [ledger, fence, run] = await Promise.all([
    db.collection("eventSeatLedgers").doc(eventId).get(),
    db.collection("eventSeatMigrationFences").doc(eventId).get(),
    db.collection("eventSeatMigrationRuns").doc(eventId).get(),
  ]);
  return {ledger: ledger.exists ? ledger.data() : null,
    fence: fence.exists ? fence.data() : null,
    run: run.exists ? run.data() : null};
}

async function* eventPages(db, lib, eventIds) {
  if (eventIds.length > 0) {
    for (const eventId of eventIds) {
      const snap = await db.collection("events").doc(eventId).get();
      yield [{id: eventId, data: snap.exists ? snap.data() : null}];
    }
    return;
  }
  let cursor = null;
  for (;;) {
    let query = db.collection("events").orderBy(lib.documentId());
    if (cursor) query = query.startAfter(cursor);
    const page = await query.limit(EVENT_PAGE_SIZE).get();
    if (page.docs.length === 0) return;
    yield page.docs.map((doc) => ({id: doc.id, data: doc.data()}));
    if (page.docs.length < EVENT_PAGE_SIZE) return;
    cursor = page.docs.at(-1).id;
  }
}

async function countActiveRows(db, lib, kind, eventId, active) {
  let cursor = null;
  let count = 0;
  for (;;) {
    let query = db.collection(kind).where("eventId", "==", eventId)
      .orderBy(lib.documentId());
    if (cursor) query = query.startAfter(cursor);
    const page = await query.limit(SCAN_PAGE_SIZE).get();
    count += page.docs.filter((doc) => active.has(doc.data().status)).length;
    if (page.docs.length < SCAN_PAGE_SIZE) return count;
    cursor = page.docs.at(-1).id;
  }
}

async function holdsBlocker(db, lib, eventId, tx = readOnly) {
  try {
    await lib.assertNoOutstandingMigrationHolds({db, tx, eventId});
    return null;
  } catch (error) {
    if (error?.code !== "failed-precondition") throw error;
    return {source: error.details?.source ?? null, message: error.message};
  }
}

async function cancelledSnapshot(db, lib, eventId, event) {
  const [activeBookings, activeAttendees, holds] = await Promise.all([
    countActiveRows(db, lib, "eventBookings", eventId, ACTIVE_BOOKING),
    countActiveRows(db, lib, "eventAttendees", eventId, ACTIVE_ATTENDEE),
    holdsBlocker(db, lib, eventId),
  ]);
  return {activeBookings, activeAttendees, holds,
    bookedCount: event.bookedCount};
}

async function authEvidence(auth, lib, uids) {
  const proofs = [];
  const blockers = [];
  for (let index = 0; index < uids.length; index += 10) {
    const batch = uids.slice(index, index + 10);
    const records = await Promise.all(batch.map(async (uid) => {
      try {
        return await auth.getUser(uid);
      } catch (error) {
        if (error?.code === "auth/user-not-found") return null;
        throw error;
      }
    }));
    records.forEach((record, offset) => {
      if (!record) {
        blockers.push("authUserMissing");
        return;
      }
      if (record.uid !== batch[offset]) {
        blockers.push("authUidChanged");
        return;
      }
      const phone = record.phoneNumber ?? null;
      if (phone !== null) {
        const normalized = lib.normalizeRosterPhone(phone);
        if (normalized.issue || normalized.value !== phone) {
          blockers.push("authPhoneMalformed");
          return;
        }
      }
      proofs.push({uid: record.uid, phoneE164: phone, verifiedByAuth: true});
    });
  }
  return {proofs, blockers, missingUsers:
    blockers.filter((blocker) => blocker === "authUserMissing").length};
}

function formReceipt(raw, organizerId) {
  if (raw.organizerId !== organizerId ||
      raw.kind !== "eventAttendeeProposal" ||
      typeof raw.formId !== "string" ||
      typeof raw.responseId !== "string" ||
      !["completed", "failed", "pending"].includes(raw.status) ||
      !Array.isArray(raw.fields)) {
    return null;
  }
  const targets = raw.fields.filter((field) => field &&
    typeof field === "object" && field.destinationField === "eventId");
  if (targets.length !== 1 || typeof targets[0].value !== "string") {
    return null;
  }
  return {organizerId, eventId: targets[0].value, formId: raw.formId,
    responseId: raw.responseId, status: raw.status};
}

/**
 * Read-only rehearsal of bootstrapEventSeatLedgerPaged: the same initial
 * checks, source scan, Admin Auth evidence, form receipts, CRM records and
 * pure planner, without the writer lock or staged copies.
 */
export async function planActiveEvent({db, auth, lib, eventId, event,
  organizerId, nowMillis}) {
  const blockers = [];
  const detail = {eventBookedCount: event.bookedCount ?? null};
  const done = (extra = {}) => ({blockers, detail: {...detail, ...extra},
    bookedCount: event.bookedCount, occupied: extra.occupied});
  if (!lib.validateEventDocument(event)) blockers.push("eventDocumentInvalid");
  const holds = await holdsBlocker(db, lib, eventId);
  if (holds) {
    blockers.push(holds.source ? `outstandingHolds:${holds.source}` :
      "holdHistoryOverLimit");
  }
  const max = lib.maxSourceRows;
  const rows = {};
  for (const kind of SOURCES) {
    const snap = await db.collection(kind).where("eventId", "==", eventId)
      .orderBy(lib.documentId()).limit(max + 1).get();
    if (snap.docs.length > max) blockers.push(`sourceRowsOverLimit:${kind}`);
    if (snap.docs.some((doc) => !ID.test(doc.id))) {
      blockers.push(`malformedSourceId:${kind}`);
    }
    rows[kind] = snap.docs.slice(0, max).map((doc) =>
      ({id: doc.id, value: sourceProjection(kind, doc.data())}));
  }
  detail.sourceRows = Object.fromEntries(SOURCES.map((kind) =>
    [kind, rows[kind].length]));
  if (blockers.some((blocker) => blocker.startsWith("sourceRowsOverLimit") ||
      blocker.startsWith("malformedSourceId"))) {
    // The engine stops at the scan; a planner input would be partial.
    return done();
  }
  const participations = rows.eventBookings.map((row) => row.value);
  const attendees = rows.eventAttendees.map((row) =>
    ({...row.value, id: row.id}));
  const origins = rows.organizerContactOrigins.map((row) =>
    ({...row.value, id: row.id}));
  detail.activeCatchBookings = new Set(participations
    .filter((row) => ACTIVE_BOOKING.has(row.status)).map((row) => row.uid))
    .size;

  const uids = [...new Set([...participations.map((row) => row.uid),
    ...attendees.map((row) => row.linkedUid)
      .filter((uid) => uid !== null)])].sort();
  if (uids.length > max || uids.some((uid) => typeof uid !== "string" ||
      !ID.test(uid))) {
    blockers.push("authIdentitiesUnsupported");
    return done();
  }
  const evidence = await authEvidence(auth, lib, uids);
  blockers.push(...evidence.blockers);
  if (evidence.missingUsers > 0) detail.missingAuthUsers = evidence.missingUsers;

  const responseIds = [...new Set(attendees
    .filter((row) => row.source === "hostManual" &&
      typeof row.externalReference === "string" &&
      row.sourceRowId === row.externalReference.slice(0, 120))
    .map((row) => row.externalReference))];
  const receipts = [];
  const formOriginIds = [];
  for (const responseId of responseIds) {
    const snap = await db.collection("organizerFormConversionReceipts")
      .doc(lib.formConversionReceiptId(responseId, "eventAttendeeProposal",
        eventId)).get();
    if (!snap.exists) continue;
    const receipt = formReceipt(snap.data(), organizerId);
    if (!receipt) {
      blockers.push("formReceiptMalformed");
      continue;
    }
    if (receipt.eventId !== eventId || receipt.responseId !== responseId) {
      blockers.push("formReceiptTargetConflict");
      continue;
    }
    receipts.push(receipt);
    formOriginIds.push(lib.organizerContactOriginId({organizerId,
      sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
      sourceEntityId: receipt.responseId}));
  }
  const known = new Set(origins.map((origin) => origin.id));
  for (const id of formOriginIds) {
    const snap = await db.collection("organizerContactOrigins").doc(id).get();
    if (snap.exists && !known.has(id)) {
      origins.push({...snap.data(), id});
      known.add(id);
    }
  }
  if (origins.length > max) {
    blockers.push("contactOriginsOverLimit");
    return done();
  }
  const contactIds = [...new Set(origins.map((origin) =>
    origin.currentContactId))];
  if (contactIds.some((id) => typeof id !== "string" || !ID.test(id))) {
    blockers.push("crmSurvivorReferenceMalformed");
    return done();
  }
  const contacts = [];
  for (const id of contactIds) {
    const snap = await db.collection("organizerContacts").doc(id).get();
    if (!snap.exists) {
      blockers.push("crmSurvivorMissing");
      continue;
    }
    const raw = snap.data();
    contacts.push({id, organizerId: raw.organizerId,
      linkedUid: raw.linkedUid, identityState: raw.identityState,
      deleted: raw.deletedAt !== null, hidden: raw.hiddenAt !== null,
      mergedIntoContactId: raw.mergedIntoContactId,
      ambiguousCandidateContactIds: raw.ambiguousCandidateContactIds});
  }
  if (blockers.includes("crmSurvivorMissing")) return done();

  const plan = lib.planEventSeatMigration({eventId, organizerId, event,
    migrationRevision: MIGRATION_REVISION, asOfMillis: nowMillis,
    participations, attendees, verifiedPhones: evidence.proofs, origins,
    contacts, formReceipts: receipts,
    sourceReadEvidence: {complete: true,
      participationRows: participations.length,
      attendeeRows: attendees.length, originRows: origins.length}});
  if (plan.state !== "ready") {
    blockers.push(...plan.blockers);
    return done();
  }
  const outputs = [
    ...plan.reservations.map((row) =>
      ({collection: "eventSeatReservations", ...row})),
    ...plan.aliases.map((row) =>
      ({collection: "eventSeatIdentityAliases", ...row})),
    ...plan.verifiedPhoneProofs.map((value) =>
      ({collection: "eventSeatVerifiedPhones",
        id: lib.seatVerifiedPhoneProofId(eventId, value.uid), value})),
  ];
  if (outputs.length > MAX_OUTPUT_ROWS) blockers.push("outputRowsOverLimit");
  const frozenBytes = Buffer.byteLength(JSON.stringify({eventId, organizerId,
    migrationRevision: MIGRATION_REVISION, hash: "0".repeat(64),
    ledger: plan.ledger, outputs}), "utf8");
  if (frozenBytes > FROZEN_PLAN_BYTE_BUDGET) {
    blockers.push("frozenPlanOverByteBudget");
  }
  return done({occupied: plan.ledger.occupied, outputRows: outputs.length});
}

// ---------------------------------------------------------------------------
// Writes (apply only)

async function createCancelledLedger(db, lib, eventId) {
  return db.runTransaction(async (tx) => {
    const eventRef = db.collection("events").doc(eventId);
    const [eventSnap, ledgerSnap, fenceSnap, runSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(db.collection("eventSeatLedgers").doc(eventId)),
      tx.get(db.collection("eventSeatMigrationFences").doc(eventId)),
      tx.get(db.collection("eventSeatMigrationRuns").doc(eventId)),
    ]);
    if (ledgerSnap.exists || fenceSnap.exists || runSnap.exists) {
      return {result: "raced", error: "Seat authority appeared meanwhile."};
    }
    const event = eventSnap.data();
    if (!event || lib.deriveEventSeatPolicy(event).status !== "cancelled") {
      return {result: "raced", error: "The event is no longer cancelled."};
    }
    for (const [kind, active] of [["eventBookings", ACTIVE_BOOKING],
      ["eventAttendees", ACTIVE_ATTENDEE]]) {
      const snap = await tx.get(db.collection(kind)
        .where("eventId", "==", eventId).limit(CANCELLED_TX_ROW_LIMIT + 1));
      if (snap.docs.length > CANCELLED_TX_ROW_LIMIT) {
        return {result: "failed",
          error: `Too many ${kind} rows to re-check in one transaction.`};
      }
      if (snap.docs.some((doc) => active.has(doc.data().status))) {
        return {result: "raced", error: `An active ${kind} row appeared.`};
      }
    }
    const holds = await holdsBlocker(db, lib, eventId, tx);
    if (holds) return {result: "raced", error: holds.message};
    lib.createEventSeatLedgerInTransaction(tx, db, eventId, event);
    const sync = bookedCountSync({bookedCount: event.bookedCount,
      occupied: 0});
    if (sync) tx.update(eventRef, {bookedCount: sync.to});
    return {result: "created", bookedCount: sync};
  });
}

async function syncBookedCount(db, eventId) {
  return db.runTransaction(async (tx) => {
    const eventRef = db.collection("events").doc(eventId);
    const [eventSnap, ledgerSnap] = await Promise.all([
      tx.get(eventRef),
      tx.get(db.collection("eventSeatLedgers").doc(eventId)),
    ]);
    const ledger = ledgerSnap.data();
    if (!eventSnap.exists || ledger?.state !== "ready") {
      throw new Error("The ledger is not ready; bookedCount left as is.");
    }
    const sync = bookedCountSync({bookedCount: eventSnap.data().bookedCount,
      occupied: ledger.occupied});
    if (sync) tx.update(eventRef, {bookedCount: sync.to});
    return sync;
  });
}

async function runEngine({db, auth, lib, eventId, command}) {
  try {
    const result = await lib.bootstrapEventSeatLedgerPaged({command,
      deps: {db, auth}});
    let bookedCount = null;
    try {
      bookedCount = await syncBookedCount(db, eventId);
    } catch (error) {
      return {result: "migrated", occupied: result.occupied,
        bookedCountError: error.message};
    }
    return {result: "migrated", occupied: result.occupied, bookedCount};
  } catch (error) {
    const leftover = await readAuthority(db, eventId);
    const left = leftover.ledger || leftover.fence || leftover.run ?
      describeUnfinished(leftover) : null;
    return {result: "failed", error: error.message, leftover: left};
  }
}

// ---------------------------------------------------------------------------
// Runs

export async function runBackfill({db, auth, lib, eventIds = [],
  apply = false, nowMillis}) {
  const events = [];
  let failures = 0;
  for await (const page of eventPages(db, lib, eventIds)) {
    for (const {id: eventId, data: event} of page) {
      const authority = event ? await readAuthority(db, eventId) :
        {ledger: null, fence: null, run: null};
      const pre = preclassifyEvent({event, ...authority}, lib);
      let row = {eventId, ...pre};
      if (pre.class === "cancelled") {
        row = {eventId, ...classifyEvent(pre,
          await cancelledSnapshot(db, lib, eventId, event))};
      } else if (pre.class === "active") {
        row = {eventId, ...classifyEvent(pre, await planActiveEvent({db,
          auth, lib, eventId, event, organizerId: pre.organizerId,
          nowMillis}))};
      }
      if (apply) {
        const outcome = await applyRow({db, auth, lib, row, authority,
          nowMillis});
        // A prediction must not read as a write that did not happen.
        if (outcome.result) row.bookedCount = null;
        Object.assign(row, outcome);
        if (row.result === "failed") failures++;
      }
      events.push(row);
    }
  }
  return {mode: apply ? "apply" : "dry-run", asOfMillis: nowMillis,
    summary: summarize(events), failures,
    events: events.filter((row) => row.class !== "on-ledger")};
}

async function applyRow({db, auth, lib, row, authority, nowMillis}) {
  if (row.class === "cancelled-empty") {
    try {
      return await createCancelledLedger(db, lib, row.eventId);
    } catch (error) {
      return {result: "failed", error: error.message};
    }
  }
  if (row.class === "migratable") {
    return runEngine({db, auth, lib, eventId: row.eventId, command: {
      eventId: row.eventId, organizerId: row.organizerId,
      migrationRevision: MIGRATION_REVISION, asOfMillis: nowMillis}});
  }
  if (row.class === "unfinished-migration" && row.owner === "backfill") {
    const {run} = authority;
    return runEngine({db, auth, lib, eventId: row.eventId, command: {
      eventId: row.eventId, organizerId: run.organizerId,
      migrationRevision: run.migrationRevision,
      asOfMillis: run.asOfMillis}});
  }
  return {};
}

/** Releases the writer lock a failed backfill run left behind. */
export async function runDiscards({db, auth, lib, eventIds, apply = false}) {
  const events = [];
  let failures = 0;
  for (const eventId of eventIds) {
    const authority = await readAuthority(db, eventId);
    const {run} = authority;
    if (!run) {
      events.push({eventId, result: "no-run",
        ...(authority.ledger || authority.fence ?
          describeUnfinished(authority) : {})});
      continue;
    }
    const state = describeUnfinished(authority);
    if (!state.discardable) {
      events.push({eventId, result: "not-discardable", ...state});
      continue;
    }
    if (!apply) {
      events.push({eventId, result: "would-discard", ...state});
      continue;
    }
    const command = {eventId, organizerId: run.organizerId,
      migrationRevision: run.migrationRevision, asOfMillis: run.asOfMillis};
    // The backfill is the only caller of these runs: nothing to authorize
    // and no caller receipt to tombstone.
    const deps = {db, auth, authorizeTransaction: async () => {}};
    try {
      let complete = false;
      for (let round = 0; round < 100 && !complete; round++) {
        ({complete} = await lib.discardEventSeatLedgerMigration({command,
          deps, pageBudget: 5,
          prepareDiscard: async () => () => undefined}));
      }
      events.push({eventId, result: complete ? "discarded" : "failed",
        ...(complete ? {} : {error: "Discard did not finish."})});
      if (!complete) failures++;
    } catch (error) {
      events.push({eventId, result: "failed", error: error.message});
      failures++;
    }
  }
  return {mode: apply ? "discard" : "discard-dry-run", failures, events,
    summary: summarize(events.map((row) => ({class: "discard",
      result: row.result})))};
}

// ---------------------------------------------------------------------------
// Output

export function eventLine(row) {
  const parts = [`${row.eventId} [${row.class ?? "discard"}]`];
  if (row.error) parts.push(row.error);
  if (row.class === "cancelled-with-guests") {
    parts.push(`active bookings ${row.activeBookings}, active attendees ` +
      `${row.activeAttendees}` +
      (row.holds ? `, outstanding holds in ${row.holds.source ?? "?"}` : ""));
  }
  if (row.class === "blocked") {
    parts.push(row.blockers.join(", "));
    if (row.blockers.includes("catchCountMismatch")) {
      parts.push(`bookedCount ${row.eventBookedCount}, active Catch bookings ` +
        `${row.activeCatchBookings}`);
    }
  }
  if (!row.result && row.bookedCount) {
    parts.push(`bookedCount ${row.bookedCount.from} -> ${row.bookedCount.to}`);
  }
  if (row.class === "migratable" && !row.result) {
    parts.push(`occupied ${row.occupied}`);
  }
  if (row.phase !== undefined || row.owner !== undefined) {
    parts.push(`phase ${row.phase ?? "none"}, owner ${row.owner}, ` +
      `writers ${row.writersBlocked ? "BLOCKED" : "not blocked"}. ` +
      row.next);
  }
  if (row.result) {
    let result = `=> ${row.result}`;
    if (row.result === "migrated") result += ` (occupied ${row.occupied})`;
    if (row.bookedCount) {
      result += `, bookedCount ${row.bookedCount.from} -> ` +
        `${row.bookedCount.to}`;
    }
    if (row.bookedCountError) result += `; ${row.bookedCountError}`;
    if (row.leftover) {
      result += `. LEFT LOCKED at phase ${row.leftover.phase}` +
        ` (writers ${row.leftover.writersBlocked ? "blocked" : "free"}). ` +
        (row.leftover.discardable ?
          `Release: --discard ${row.eventId} --apply` : row.leftover.next);
    }
    parts.push(result);
  }
  return `- ${parts.join(" | ")}`;
}

function printReport(report) {
  const title = {
    "dry-run": "dry run, nothing written",
    "apply": "apply",
    "discard": "discard",
    "discard-dry-run": "discard dry run, nothing written",
  }[report.mode];
  console.log(`Seat ledger backfill: ${report.projectId} (${title})`);
  if (report.mode === "dry-run" || report.mode === "apply") {
    console.log("\nClass                    Events");
    for (const [name, count] of Object.entries(report.summary.classes)) {
      console.log(`${name.padEnd(24)} ${count}`);
    }
  }
  if (Object.keys(report.summary.results).length > 0) {
    console.log("\nResult                   Events");
    for (const [name, count] of Object.entries(report.summary.results)) {
      console.log(`${name.padEnd(24)} ${count}`);
    }
  }
  if (report.events.length > 0) {
    console.log("\nEvents (on-ledger events are counted, not listed):");
    for (const row of report.events) console.log(eventLine(row));
  }
  if (report.mode === "dry-run") {
    console.log("\nDry run only. Re-run with --apply to write.");
  }
  if (report.failures > 0) {
    console.log(`\n${report.failures} event(s) failed; see the lines above.`);
  }
}

function printHelp() {
  console.log(`Usage: node tool/data/migrate_event_seat_ledgers.mjs [options]

Moves every event without an eventSeatLedgers document onto the seat ledger.
Needs a current Functions build (npm --prefix functions run build).

Classes:
  on-ledger              Already has a ready ledger and fence (counted only).
  unfinished-migration   A migration run, or a lone ledger or fence, exists.
  demo                   demoOps, synthetic or seedPrefix: skipped.
  malformed              No usable organizer, status or capacity policy.
  missing                An --event id with no event document.
  cancelled-empty        Cancelled, nobody active: gets an empty ready ledger.
  cancelled-with-guests  Cancelled but someone is still active or held.
  migratable             Active; the migration engine would reconcile it.
  blocked                Active; the engine would refuse (blocker codes).

Options:
  --apply                 Write. Default is a dry run that writes nothing.
  --allow-prod            Required with --apply against prod.
  --event <id>            Limit to this event (repeatable).
  --discard <id>          Release the lock a failed run left (repeatable);
                          writes only with --apply.
  --json                  Print the report as JSON.
  --env <dev|prod>        Resolve the project id from .firebaserc.
  --project <id>          Firebase project id.
  --emulator              Use the Firestore emulator at 127.0.0.1:8080 and
                          the Auth emulator at 127.0.0.1:9099.
  --emulator-host <host>  Use a custom Firestore emulator host.
  --auth-emulator-host <host>  Auth emulator host with --emulator(-host).
  -h, --help              Show this help.
`);
}

// Last, so every module-level binding exists before main runs.
if (isMain(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
