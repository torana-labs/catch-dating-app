import {createHash} from "crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventPolicyDefaults, OrganizerDocument} from
  "../../shared/generated/firestoreAdminTypes";
import {isOrganizerManager} from "../../shared/organizerHosts";

export interface EventSetupPreferences {
  timezone?: string;
  usualDurationMinutes?: number;
  preferredVenueId?: string;
  offerValidityMinutes?: number;
  collectionPreference?: "manualInstructions" | "reusablePage" |
    "personalRequest" | "catchCheckout";
  currency?: string;
  offerMessageTemplate?: string;
  paymentInstructions?: string;
  reusablePaymentPage?: {url: string; reusableForEvents: true};
  /** The defaults the event boards added. Each is optional and leaves the
   * preferences hash unchanged while unset. */
  bookingMode?: "anyone" | "followersFirst" | "askFirst";
  startingPriceMinor?: number;
  places?: number;
  waitlistEnabled?: boolean;
  refundPolicy?: "flexible" | "standard" | "strict";
  askedAtBooking?: string[];
  autoMessages?: {thankYou: boolean; arrival: boolean};
}

type PreferenceField = keyof EventSetupPreferences;
type Change = {mode: "set"; value: unknown} | {mode: "clear"};

export interface ManagerEventSetupDefaults {
  organizerId: string;
  city: {cityId: string; marketId: string} | null;
  timezone: string | null;
  organizerDefaultsRevision: number | null;
  basicsReviewedHash: string;
  preferencesRevision: number;
  preferences: EventSetupPreferences;
  /** Hash of the pure PR430 resolver's recognized defaults. */
  preferencesHash: string;
  /** Binds public city/timezone and private suggestions in one tx snapshot. */
  reviewedDefaultsHash: string;
}

export interface UpdateManagerEventSetupDefaultsCommand {
  organizerId: string;
  requestId: string;
  expectedRevision: number;
  reviewedDefaultsHash: string;
  changes: Partial<Record<PreferenceField, Change>>;
}

export interface ManagerEventSetupDefaultsResult {
  appliedRevision: number;
  current: ManagerEventSetupDefaults;
  replayed: boolean;
}

export interface EventSetupDefaultsDependencies {
  db: FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  /** Bind to eventSetupPreferences/resolve.organizerEventDefaultsHash. */
  validateAndHashPreferences: (source: {
    revision: number;
    timezone?: string;
    eventPolicy?: Pick<EventPolicyDefaults, "admissionPreset">;
    eventSetup: EventSetupPreferences;
  }) => string;
}

const fields = new Set<PreferenceField>([
  "usualDurationMinutes", "preferredVenueId", "offerValidityMinutes",
  "collectionPreference", "currency", "offerMessageTemplate",
  "paymentInstructions", "reusablePaymentPage", "timezone",
  "bookingMode", "startingPriceMinor", "places", "waitlistEnabled",
  "refundPolicy", "askedAtBooking", "autoMessages",
]);

/** Current-manager read of one public organizer and its private suggestions. */
export async function getManagerEventSetupDefaults(params: {
  actorUid: string;
  organizerId: string;
  deps: EventSetupDefaultsDependencies;
}): Promise<ManagerEventSetupDefaults> {
  assertId(params.actorUid);
  assertId(params.organizerId);
  const {db} = params.deps;
  return db.runTransaction(async (tx) => {
    const refs = sourceRefs(db, params.actorUid, params.organizerId);
    const [organizerSnap, deletedSnap, defaultsSnap] = await Promise.all([
      tx.get(refs.organizer), tx.get(refs.deleted), tx.get(refs.defaults),
    ]);
    const organizer = authorize(organizerSnap, deletedSnap, params.actorUid);
    return projectManagerEventSetupDefaults(params.organizerId, organizer,
      defaultsSnap.data(), params.deps);
  });
}

/** Revision-fenced private update and request receipt in one transaction. */
export async function updateManagerEventSetupDefaults(params: {
  actorUid: string;
  command: UpdateManagerEventSetupDefaultsCommand;
  deps: EventSetupDefaultsDependencies;
}): Promise<ManagerEventSetupDefaultsResult> {
  const {actorUid, command, deps} = params;
  assertId(actorUid);
  assertId(command.organizerId);
  assertRequestId(command.requestId);
  if (!Number.isSafeInteger(command.expectedRevision) ||
      command.expectedRevision < 0) {
    throw new HttpsError("invalid-argument", "Invalid defaults revision.");
  }
  if (!/^[a-f0-9]{64}$/.test(command.reviewedDefaultsHash)) {
    throw new HttpsError("invalid-argument", "Invalid reviewed defaults.");
  }
  const changes = validatedChanges(command.changes);
  const requestHash = digest(["organizer-event-setup-defaults-v1",
    actorUid, command.organizerId, command.expectedRevision,
    command.reviewedDefaultsHash, changes]);
  const {db} = deps;
  const refs = sourceRefs(db, actorUid, command.organizerId);
  const receiptRef = db.collection("organizerEventSetupDefaultReceipts")
    .doc(digest(["organizer-event-setup-defaults-receipt-v1", actorUid,
      command.organizerId, command.requestId]));
  return db.runTransaction(async (tx) => {
    const [organizerSnap, deletedSnap, defaultsSnap, receiptSnap] =
      await Promise.all([
        tx.get(refs.organizer), tx.get(refs.deleted), tx.get(refs.defaults),
        tx.get(receiptRef),
      ]);
    const organizer = authorize(organizerSnap, deletedSnap, actorUid);
    const current = projectManagerEventSetupDefaults(
      command.organizerId, organizer, defaultsSnap.data(), deps);
    if (receiptSnap.exists) {
      const receipt = receiptSnap.data();
      if (receipt?.actorUid !== actorUid ||
          receipt?.organizerId !== command.organizerId ||
          receipt?.requestHash !== requestHash ||
          !Number.isSafeInteger(receipt?.appliedRevision) ||
          receipt.appliedRevision < 1) {
        throw new HttpsError("already-exists",
          "Request ID was used for another defaults change.");
      }
      return {appliedRevision: receipt.appliedRevision as number,
        current, replayed: true};
    }
    if (current.preferencesRevision !== command.expectedRevision) {
      throw new HttpsError("aborted", "Organizer defaults changed. Reload.");
    }
    if (current.reviewedDefaultsHash !== command.reviewedDefaultsHash) {
      throw new HttpsError("aborted", "Review current organizer defaults.");
    }
    const nextPreferences = {...current.preferences};
    for (const [field, change] of Object.entries(changes)) {
      if (change.mode === "clear") {
        delete nextPreferences[field as PreferenceField];
      } else {
        // The required pure validator checks the complete candidate below.
        Object.assign(nextPreferences, {[field]: change.value});
      }
    }
    const revision = current.preferencesRevision + 1;
    const next = projectManagerEventSetupDefaults(
      command.organizerId, organizer, {
        organizerId: command.organizerId, revision,
        eventSetup: nextPreferences,
      }, deps);
    tx.set(refs.defaults, {
      organizerId: command.organizerId,
      revision,
      eventSetup: nextPreferences,
      updatedAt: deps.serverTimestamp(),
      updatedByUid: actorUid,
    });
    tx.create(receiptRef, {
      actorUid, organizerId: command.organizerId,
      requestId: command.requestId, requestHash,
      appliedRevision: revision,
      createdAt: deps.serverTimestamp(),
    });
    return {appliedRevision: revision, current: next, replayed: false};
  });
}

function sourceRefs(db: FirebaseFirestore.Firestore, actorUid: string,
  organizerId: string) {
  return {
    organizer: db.collection("organizers").doc(organizerId),
    deleted: db.collection("deletedUsers").doc(actorUid),
    defaults: db.collection("organizerEventSetupDefaults").doc(organizerId),
  };
}

function authorize(organizerSnap: FirebaseFirestore.DocumentSnapshot,
  deletedSnap: FirebaseFirestore.DocumentSnapshot, actorUid: string):
  OrganizerDocument {
  if (deletedSnap.exists || !organizerSnap.exists) {
    throw new HttpsError("permission-denied", "Manager access unavailable.");
  }
  const organizer = organizerSnap.data() as OrganizerDocument;
  if (!isOrganizerManager(organizer, actorUid) || organizer.archived ||
      organizer.status !== "active") {
    throw new HttpsError("permission-denied", "Manager access unavailable.");
  }
  return organizer;
}

export function projectManagerEventSetupDefaults(
  organizerId: string, organizer: OrganizerDocument,
  raw: FirebaseFirestore.DocumentData | undefined,
  deps: EventSetupDefaultsDependencies): ManagerEventSetupDefaults {
  if (raw && (raw.organizerId !== organizerId ||
      !Number.isSafeInteger(raw.revision) || raw.revision < 1 ||
      !raw.eventSetup || typeof raw.eventSetup !== "object" ||
      Array.isArray(raw.eventSetup))) {
    throw new HttpsError("failed-precondition",
      "Organizer event defaults need review.");
  }
  const hostDefaults = organizer.hostDefaults as
    Record<string, unknown> | undefined;
  // Adopt legacy values once; clearing private timezone never re-inherits.
  const legacyTimezone = typeof hostDefaults?.timezone === "string" ?
    hostDefaults.timezone : undefined;
  const preferences = raw ?
    {...raw.eventSetup} as EventSetupPreferences :
    (legacyTimezone === undefined ? {} : {timezone: legacyTimezone});
  if (Object.keys(preferences).some((field) =>
    !fields.has(field as PreferenceField))) {
    throw new HttpsError("failed-precondition",
      "Organizer event defaults need review.");
  }
  const revision = raw ? raw.revision as number : 0;
  const timezone = preferences.timezone ?? null;
  if (Object.hasOwn(preferences, "timezone") &&
      (typeof preferences.timezone !== "string" ||
      preferences.timezone.length < 1 || preferences.timezone.length > 100)) {
    throw new HttpsError("invalid-argument", "Invalid organizer timezone.");
  }
  const publicRevision = Number.isSafeInteger(hostDefaults?.revision) &&
    (hostDefaults?.revision as number) >= 0 ?
    hostDefaults?.revision as number : null;
  const basicsRevision = raw ? revision : publicRevision;
  const city = organizer.locationCityId && organizer.locationMarketId ? {
    cityId: organizer.locationCityId,
    marketId: organizer.locationMarketId,
  } : null;
  // PR430's pure resolver validates the full recognized preference shape.
  const preferencesHash = deps.validateAndHashPreferences({
    revision,
    ...(timezone === null ? {} : {timezone}),
    ...(hostDefaults?.eventPolicy ? {
      eventPolicy: hostDefaults.eventPolicy as
        Pick<EventPolicyDefaults, "admissionPreset">,
    } : {}),
    eventSetup: preferences,
  });
  if (!/^[a-f0-9]{64}$/.test(preferencesHash)) {
    throw new HttpsError("internal", "Invalid defaults fingerprint.");
  }
  const basicsReviewedHash = createHash("sha256")
    .update(JSON.stringify({city, timezone, revision: basicsRevision}))
    .digest("hex");
  return {organizerId, city, timezone,
    organizerDefaultsRevision: basicsRevision, basicsReviewedHash,
    preferencesRevision: revision, preferences,
    preferencesHash,
    reviewedDefaultsHash: digest([basicsReviewedHash, preferencesHash])};
}

function validatedChanges(input: UpdateManagerEventSetupDefaultsCommand[
  "changes"]): Record<string, Change> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new HttpsError("invalid-argument", "Choose defaults to update.");
  }
  const entries = Object.entries(input);
  if (entries.length === 0 || entries.length > fields.size) {
    throw new HttpsError("invalid-argument", "Choose defaults to update.");
  }
  const changes: Record<string, Change> = {};
  for (const [field, change] of entries) {
    if (!fields.has(field as PreferenceField) || !change ||
        typeof change !== "object" || Array.isArray(change) ||
        !["set", "clear"].includes(change.mode)) {
      throw new HttpsError("invalid-argument", "Invalid defaults change.");
    }
    const allowedKeys = change.mode === "set" ?
      ["mode", "value"] : ["mode"];
    if (Object.keys(change).some((key) => !allowedKeys.includes(key))) {
      throw new HttpsError("invalid-argument", "Invalid defaults change.");
    }
    if (change.mode === "set" &&
        (change.value === undefined || change.value === null)) {
      throw new HttpsError("invalid-argument", "Set requires a value.");
    }
    if (change.mode === "clear" && "value" in change) {
      throw new HttpsError("invalid-argument", "Clear cannot set a value.");
    }
    changes[field] = change;
  }
  return changes;
}

function assertId(value: string): void {
  if (typeof value !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Invalid manager identity.");
  }
}

function assertRequestId(value: string): void {
  if (typeof value !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Invalid request ID.");
  }
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const data = value as Record<string, unknown>;
    return `{${Object.keys(data).sort()
      .filter((key) => data[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(data[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
