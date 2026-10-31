import {readSeatMigrationWriterFence} from "../seatMigrationPaged";
import {createHash} from "crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {isOrganizerManager} from "../../shared/organizerHosts";
import {validateCreatePrivateEventSetupCallablePayload} from
  "../../shared/generated/validators/createPrivateEventSetupInput";
import {validateUpdatePrivateEventBasicsCallablePayload} from
  "../../shared/generated/validators/updatePrivateEventBasicsInput";
import {requireDoc} from "../../shared/validation";
import {EVENT_MAX_DURATION_MINUTES} from "../../shared/businessRules";
import {
  normalizePrivateEventBasics,
  PrivateEventBasicsInput,
} from "./basics";
import {OrganizerSetupDefaults} from "./defaults";
import {projectManagerEventSetupDefaults} from
  "../../organizers/eventSetupDefaults/service";
import {eventSetupDefaultsDependencies} from
  "../../organizers/eventSetupDefaults/dependencies";

export interface CreatePrivateEventSetupCommand {
  organizerId: string;
  requestId: string;
  basics: PrivateEventBasicsInput;
}

export interface UpdatePrivateEventBasicsCommand extends
  CreatePrivateEventSetupCommand {
  eventId: string;
  expectedSetupRevision: number;
}

export interface ProgressiveSetupResult {
  eventId: string;
  setupRevision: number;
  replayed: boolean;
}

export interface ProgressiveSetupDependencies {
  db: FirebaseFirestore.Firestore;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  /** Integration must fence roster, offer and payment commitments in tx. */
  assertBasicsEditable?: (params: {
    tx: FirebaseFirestore.Transaction;
    db: FirebaseFirestore.Firestore;
    eventId: string;
    event: Record<string, unknown>;
  }) => Promise<void>;
}

/** Creates one private canonical events/{id} document and durable receipt. */
export async function createPrivateEventSetup(params: {
  actorUid: string;
  command: CreatePrivateEventSetupCommand;
  deps: ProgressiveSetupDependencies;
}): Promise<ProgressiveSetupResult> {
  const {actorUid, command, deps} = params;
  if (!validateCreatePrivateEventSetupCallablePayload(command)) {
    throw new HttpsError("invalid-argument", "Invalid event setup request.");
  }
  assertCommandIds(actorUid, command.organizerId, command.requestId);
  const db = deps.db;
  const receiptRef = receiptFor(db, actorUid, command.organizerId,
    command.requestId);
  const eventRef = db.collection("events").doc();
  const organizerRef = db.collection("organizers").doc(command.organizerId);
  const deletedRef = db.collection("deletedUsers").doc(actorUid);
  const defaultsRef = db.collection("organizerEventSetupDefaults")
    .doc(command.organizerId);
  const requestHash = hashRequest("create", command);
  return db.runTransaction(async (tx) => {
    const [receiptSnap, organizerSnap, deletedSnap, defaultsSnap] =
      await Promise.all([
        tx.get(receiptRef), tx.get(organizerRef), tx.get(deletedRef),
        tx.get(defaultsRef),
      ]);
    const organizer = authorizeSetupManager(
      organizerSnap, deletedSnap, actorUid
    );
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() as Record<string, unknown>;
      assertReceipt(receipt, "create", actorUid, command.organizerId,
        requestHash);
      const priorEventId = receipt.eventId as string;
      const currentSnap = await tx.get(db.collection("events")
        .doc(priorEventId));
      const current = currentSnap.data() as Record<string, unknown> | undefined;
      if (!current || current.organizerId !== command.organizerId) {
        throw new HttpsError("failed-precondition", "Event is unavailable.");
      }
      return {eventId: priorEventId,
        setupRevision: receipt.appliedRevision as number, replayed: true};
    }
    const basics = normalizePrivateEventBasics({
      basics: command.basics,
      defaults: organizerDefaults(command.organizerId, organizer,
        defaultsSnap.data(), db),
    });
    const event = {
      organizerId: command.organizerId,
      name: basics.name,
      eventCityId: basics.eventCityId,
      eventMarketId: basics.eventMarketId,
      eventLocalDate: basics.eventLocalDate,
      eventLocalStartTime: basics.eventLocalStartTime,
      eventTimezone: basics.eventTimezone,
      startTime: deps.timestampFromMillis(basics.startTimeMillis),
      setupDefaults: basics.setupDefaults,
      setupRevision: 1,
      createdAt: deps.serverTimestamp(),
      updatedAt: deps.serverTimestamp(),
      publicationState: "private",
      publicRegistrationEnabled: false,
      status: "active",
      cancelledAt: null,
      cancellationReason: null,
      bookedCount: 0,
      checkedInCount: 0,
      waitlistedCount: 0,
      genderCounts: {},
      cohortCounts: {},
      waitlistedCohortCounts: {},
    };
    tx.create(eventRef, event);
    tx.create(receiptRef, {
      operation: "create",
      actorUid,
      organizerId: command.organizerId,
      requestHash,
      eventId: eventRef.id,
      appliedRevision: 1,
      createdAt: deps.serverTimestamp(),
    });
    return {eventId: eventRef.id, setupRevision: 1, replayed: false};
  });
}

/** Updates only basics on the same private canonical event. */
export async function updatePrivateEventBasics(params: {
  actorUid: string;
  command: UpdatePrivateEventBasicsCommand;
  deps: ProgressiveSetupDependencies;
}): Promise<ProgressiveSetupResult> {
  const {actorUid, command, deps} = params;
  if (!validateUpdatePrivateEventBasicsCallablePayload(command)) {
    throw new HttpsError("invalid-argument", "Invalid event basics request.");
  }
  assertCommandIds(actorUid, command.organizerId, command.requestId);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(command.eventId) ||
      !Number.isSafeInteger(command.expectedSetupRevision) ||
      command.expectedSetupRevision < 1) {
    throw new HttpsError("invalid-argument", "Invalid event revision.");
  }
  if (!deps.assertBasicsEditable) {
    throw new HttpsError("failed-precondition",
      "Event commitment guard is not installed.");
  }
  const assertBasicsEditable = deps.assertBasicsEditable;
  const db = deps.db;
  const receiptRef = receiptFor(db, actorUid, command.organizerId,
    command.requestId);
  const eventRef = db.collection("events").doc(command.eventId);
  const organizerRef = db.collection("organizers").doc(command.organizerId);
  const deletedRef = db.collection("deletedUsers").doc(actorUid);
  const defaultsRef = db.collection("organizerEventSetupDefaults")
    .doc(command.organizerId);
  const requestHash = hashRequest("update", command);
  return db.runTransaction(async (tx) => {
    const [receiptSnap, organizerSnap, deletedSnap, eventSnap, defaultsSnap] =
      await Promise.all([
        tx.get(receiptRef), tx.get(organizerRef), tx.get(deletedRef),
        tx.get(eventRef), tx.get(defaultsRef),
      ]);
    const organizer = authorizeSetupManager(
      organizerSnap, deletedSnap, actorUid
    );
    const event = eventSnap.data() as Record<string, unknown> | undefined;
    if (!event || event.organizerId !== command.organizerId) {
      throw new HttpsError("not-found", "Event not found.");
    }
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data() as Record<string, unknown>;
      assertReceipt(receipt,
        "update", actorUid, command.organizerId, requestHash,
        command.eventId);
      return {eventId: command.eventId,
        setupRevision: receipt.appliedRevision as number, replayed: true};
    }
    await readSeatMigrationWriterFence({db, tx, eventId: command.eventId});
    if (event.publicationState !== "private" ||
        event.status !== "active") {
      throw new HttpsError("failed-precondition",
        "Only active private event basics can be edited here.");
    }
    if (event.eventSuccessPlanId !== undefined) {
      throw new HttpsError("failed-precondition",
        "An event plan already depends on these basics.");
    }
    const revision = requireRevision(event);
    if (revision !== command.expectedSetupRevision) {
      throw new HttpsError("aborted", "Event setup changed. Reload it.");
    }
    await assertBasicsEditable({tx, db, eventId: command.eventId,
      event});
    const basics = normalizePrivateEventBasics({
      basics: command.basics,
      defaults: organizerDefaults(command.organizerId, organizer,
        defaultsSnap.data(), db),
    });
    if ((basics.eventCityId !== event.eventCityId ||
        basics.eventMarketId !== event.eventMarketId) &&
        (event.meetingLocation !== undefined ||
        event.meetingPoint !== undefined ||
        event.sourceVenueId !== undefined)) {
      throw new HttpsError("failed-precondition",
        "Clear the venue in Details before changing the event city.");
    }
    let shiftedEnd: FirebaseFirestore.Timestamp | undefined;
    if (event.endTime !== undefined) {
      const oldStart = event.startTime as FirebaseFirestore.Timestamp;
      const oldEnd = event.endTime as FirebaseFirestore.Timestamp;
      const duration = oldEnd?.toMillis?.() - oldStart?.toMillis?.();
      if (!Number.isSafeInteger(duration) || duration <= 0 ||
          duration > EVENT_MAX_DURATION_MINUTES * 60_000) {
        throw new HttpsError("failed-precondition",
          "Review the event duration in Details before editing basics.");
      }
      shiftedEnd = deps.timestampFromMillis(basics.startTimeMillis + duration);
    }
    tx.update(eventRef, {
      name: basics.name,
      eventCityId: basics.eventCityId,
      eventMarketId: basics.eventMarketId,
      eventLocalDate: basics.eventLocalDate,
      eventLocalStartTime: basics.eventLocalStartTime,
      eventTimezone: basics.eventTimezone,
      startTime: deps.timestampFromMillis(basics.startTimeMillis),
      ...(shiftedEnd === undefined ? {} : {endTime: shiftedEnd}),
      setupDefaults: basics.setupDefaults,
      setupRevision: revision + 1,
      updatedAt: deps.serverTimestamp(),
    });
    tx.create(receiptRef, {
      operation: "update",
      actorUid,
      organizerId: command.organizerId,
      requestHash,
      eventId: command.eventId,
      appliedRevision: revision + 1,
      createdAt: deps.serverTimestamp(),
    });
    return {eventId: command.eventId,
      setupRevision: revision + 1, replayed: false};
  });
}

function assertCommandIds(
  actorUid: string, organizerId: string, requestId: string
): void {
  const id = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
  const request = /^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/;
  if (!id.test(actorUid) || !id.test(organizerId) ||
      !request.test(requestId)) {
    throw new HttpsError("invalid-argument", "Invalid operation identity.");
  }
}

export function receiptFor(db: FirebaseFirestore.Firestore, actorUid: string,
  organizerId: string, requestId: string): FirebaseFirestore.DocumentReference {
  const id = createHash("sha256")
    .update(JSON.stringify(["progressive-event-setup-v1", actorUid,
      organizerId, requestId]))
    .digest("hex");
  return db.collection("eventSetupReceipts").doc(id);
}

type SetupOperation = "create" | "update" | "preferences" | "details" |
  "publish" | "unpublish";

export function hashRequest(operation: SetupOperation,
  command: unknown
): string {
  return createHash("sha256")
    .update(canonicalJson([operation, command]))
    .digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function assertReceipt(receipt: Record<string, unknown>,
  operation: SetupOperation, actorUid: string,
  organizerId: string, requestHash: string,
  eventId?: string): void {
  if (receipt.operation !== operation || receipt.actorUid !== actorUid ||
      receipt.organizerId !== organizerId ||
      receipt.requestHash !== requestHash ||
      typeof receipt.eventId !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(receipt.eventId) ||
      !Number.isSafeInteger(receipt.appliedRevision) ||
      (receipt.appliedRevision as number) < 1 ||
      (receipt.appliedRevision as number) > 1_000_000_000 ||
      (eventId && receipt.eventId !== eventId)) {
    throw new HttpsError("already-exists",
      "Request ID was already used for another event change.");
  }
}

export function requireRevision(event: Record<string, unknown>): number {
  const revision = event.setupRevision;
  if (!Number.isSafeInteger(revision) || (revision as number) < 1 ||
      (revision as number) >= 1_000_000_000) {
    throw new HttpsError("failed-precondition",
      "Event has no progressive setup revision.");
  }
  return revision as number;
}

/** Authorizes transaction snapshots, including deleted accounts. */
export function authorizeSetupManager(
  organizerSnap: FirebaseFirestore.DocumentSnapshot,
  deletedSnap: FirebaseFirestore.DocumentSnapshot,
  actorUid: string): OrganizerDocument {
  if (deletedSnap.exists) {
    throw new HttpsError("failed-precondition",
      "This account cannot manage events.");
  }
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  const organizer = requireDoc<OrganizerDocument>(organizerSnap,
    "OrganizerDocument");
  if (!isOrganizerManager(organizer, actorUid)) {
    throw new HttpsError("permission-denied",
      "Only organizer owners and managers can manage events.");
  }
  if (organizer.archived || organizer.status !== "active") {
    throw new HttpsError("failed-precondition",
      "Organizer is not active.");
  }
  return organizer;
}

function organizerDefaults(organizerId: string, organizer: OrganizerDocument,
  privateDefaults: FirebaseFirestore.DocumentData | undefined,
  db: FirebaseFirestore.Firestore): OrganizerSetupDefaults {
  const projected = projectManagerEventSetupDefaults(organizerId, organizer,
    privateDefaults, eventSetupDefaultsDependencies(db));
  return {
    ...(projected.city === null ? {} : {city: projected.city}),
    ...(projected.timezone === null ? {} : {timezone: projected.timezone}),
    ...(projected.organizerDefaultsRevision === null ? {} :
      {revision: projected.organizerDefaultsRevision}),
  };
}
