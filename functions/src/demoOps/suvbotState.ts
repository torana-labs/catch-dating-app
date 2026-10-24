// Reads, resets and repairs the demo state Suvbot owns for one tester. Every
// write goes through the Firestore contracts first (suvbotDocValidation.ts).
import {eventDiscoveryProjection} from "../events/eventDiscoveryProjection";
import {cohortIdForUser} from "../events/eventPolicy";
import type {
  EventDocument,
  UserProfileDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  schemaProfileDecisionCollectionPath,
  schemaProfileDecisionOutgoingSubcollectionPath,
} from "../shared/generated/schemaPaths";
import {
  DemoDocWrite,
  assertValidSuvbotDocument,
  assertValidSuvbotPlan,
} from "./suvbotDocValidation";
import {suvbotSeedPrefix} from "./suvbotWorld";
import type {SuvbotWorldPlan} from "./suvbotWorld";

export const SUVBOT_UID = "suvbot";
export const SUVBOT_ACCESS_COLLECTION = "demoSelfServiceAccess";
export const DEMO_MANIFEST_COLLECTION = "demoOpsEvents";
export const DEFAULT_DEMO_SEED_PREFIX = "suvbot_2026";
const MAX_BATCH_WRITES = 450;
const GET_ALL_CHUNK = 100;

export type ResetScope =
  "all" | "world" | "bookings" | "chats" | "notifications";

export interface DeletePlan {
  paths: string[];
  eventIds: Set<string>;
}

export interface WorldManifest {
  operationId: string;
  worldId: string;
  moment: string;
  primaryEventId: string;
  worldEventIds: string[];
  castUids: string[];
  createdAtMillis: number;
}

export interface DemoSummary {
  world: WorldManifest | null;
  savedEvents: number;
  activeEventParticipations: number;
  attendedEvents: number;
  demoMatches: number;
  payments: number;
}

/**
 * Returns the deterministic Suvbot match id for one user.
 * @param {string} uid User id.
 * @return {string} Match id.
 */
export function suvbotMatchId(uid: string): string {
  return `${SUVBOT_UID}_${uid.replace(/\//g, "_")}`;
}

/**
 * Returns whether a document is owned by seed or demo tooling.
 * @param {FirebaseFirestore.DocumentData | undefined} data Firestore data.
 * @return {boolean} True when demo-owned.
 */
export function isDemoOwned(
  data: FirebaseFirestore.DocumentData | undefined
): boolean {
  return data?.demoOps === true ||
    data?.synthetic === true ||
    typeof data?.seedPrefix === "string";
}

/**
 * Builds the delete list for one tester's demo-owned state. Paths a caller
 * is about to rewrite can be kept, so a restarted world updates documents in
 * place instead of racing delete triggers.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Tester uid.
 * @param {ResetScope} scope Reset scope.
 * @param {Set<string>} keep Paths not to delete.
 * @return {Promise<DeletePlan>} Delete plan.
 */
export async function buildResetPlan(
  db: FirebaseFirestore.Firestore,
  uid: string,
  scope: ResetScope,
  keep: Set<string> = new Set()
): Promise<DeletePlan> {
  const paths = new Set<string>();
  const eventIds = new Set<string>();
  const matchIds = new Set<string>();
  const prefix = suvbotSeedPrefix(uid);
  const manifests = await userManifests(db, uid);
  const worlds = manifests.map(worldFromManifest)
    .filter((world): world is WorldManifest => world !== null);
  const castUids = new Set(worlds.flatMap((world) => world.castUids));
  const worldEventIds = new Set(worlds.flatMap((world) => world.worldEventIds));

  const collect = (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data();
    if (!isDemoOwned(data)) return;
    paths.add(doc.ref.path);
    if (typeof data.eventId === "string") eventIds.add(data.eventId);
  };

  if (scope === "all" || scope === "world") {
    const listed = new Set<string>();
    for (const manifest of manifests) {
      if (scope === "world" && !worldFromManifest(manifest)) continue;
      for (const path of stringArray(manifest.data().paths)) listed.add(path);
      // The tester's own demo-operation records.
      paths.add(manifest.ref.path);
    }
    // A listed path is deleted only while it is still demo-owned, so a real
    // write that later reused the same id is never removed.
    for (const snap of await getAllPaths(db, [...listed])) {
      if (snap.exists && isDemoOwned(snap.data())) paths.add(snap.ref.path);
    }
    // Documents triggers derived from a world. Events and cast that are being
    // rewritten keep theirs: their triggers are already refreshing them.
    for (const eventId of worldEventIds) {
      if (keep.has(`events/${eventId}`)) continue;
      paths.add(`eventSuccessScorecards/${eventId}`);
      await collectQuery(db.collection("eventAttendees")
        .where("eventId", "==", eventId), (doc) => paths.add(doc.ref.path));
      await collectQuery(db.collection("eventParticipations")
        .where("eventId", "==", eventId), collect);
    }
    for (const castUid of castUids) {
      if (!castUid.startsWith(prefix) || keep.has(`users/${castUid}`)) continue;
      await collectQuery(
        db.collection("notifications").doc(castUid).collection("items"),
        (doc) => paths.add(doc.ref.path)
      );
      await collectQuery(outgoingDecisions(db, castUid),
        (doc) => paths.add(doc.ref.path));
    }
  }
  if (scope === "all") {
    await collectQuery(db.collection("clubMemberships")
      .where("uid", "==", uid), collect);
  }
  if (scope === "all" || scope === "bookings") {
    for (const [collection, field] of [
      ["eventParticipations", "uid"],
      ["userEventScheduleLocks", "uid"],
      ["savedEvents", "uid"],
      ["payments", "userId"],
    ]) {
      await collectQuery(db.collection(collection)
        .where(field, "==", uid), collect);
    }
  }
  if (scope === "all" || scope === "chats") {
    const matches = await db.collection("matches")
      .where("participantIds", "array-contains", uid)
      .get();
    for (const doc of matches.docs) {
      if (doc.id === suvbotMatchId(uid) || !isDemoOwned(doc.data())) continue;
      matchIds.add(doc.id);
      paths.add(doc.ref.path);
      await collectQuery(doc.ref.collection("messages"),
        (message) => paths.add(message.ref.path));
    }
    await collectQuery(outgoingDecisions(db, uid), collect);
    // Demo likes aimed at the tester, from a world's cast or older seeds.
    await collectQuery(db
      .collectionGroup(schemaProfileDecisionOutgoingSubcollectionPath)
      .where("targetId", "==", uid), collect);
  }
  if (
    scope === "all" || scope === "chats" || scope === "notifications"
  ) {
    await collectQuery(
      db.collection("notifications").doc(uid).collection("items"),
      (doc) => {
        const data = doc.data();
        if (isDemoOwned(data) || matchIds.has(data.matchId)) {
          paths.add(doc.ref.path);
        }
      }
    );
  }

  return {
    paths: [...paths]
      .filter((path) => !isSuvbotPath(path, uid) && !keep.has(path))
      .sort(),
    eventIds,
  };
}

/**
 * Validates every document, then applies set writes in batch chunks.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {DemoDocWrite[]} docs Docs to write.
 */
export async function applyWritePlan(
  db: FirebaseFirestore.Firestore,
  docs: DemoDocWrite[]
): Promise<void> {
  assertValidSuvbotPlan(docs);
  for (const chunk of chunks(docs, MAX_BATCH_WRITES)) {
    const batch = db.batch();
    for (const doc of chunk) batch.set(db.doc(doc.path), doc.data);
    await batch.commit();
  }
}

/**
 * Applies delete writes in batch chunks.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string[]} paths Docs to delete.
 */
export async function applyDeletePlan(
  db: FirebaseFirestore.Firestore,
  paths: string[]
): Promise<void> {
  for (const chunk of chunks(paths, MAX_BATCH_WRITES)) {
    const batch = db.batch();
    for (const path of chunk) batch.delete(db.doc(path));
    await batch.commit();
  }
}

/**
 * Writes a demo-operation manifest for cleanup and audit. World starts also
 * record the world, its events and its cast, which later resets use to find
 * documents triggers derived from them.
 * @param {object} params Manifest parameters.
 */
export async function writeDemoManifest({
  db,
  uid,
  operationId,
  command,
  paths,
  createdAt,
  world,
}: {
  db: FirebaseFirestore.Firestore;
  uid: string;
  operationId: string;
  command: string;
  paths: string[];
  createdAt: FirebaseFirestore.Timestamp;
  world?: SuvbotWorldPlan;
}): Promise<void> {
  const unique = [...new Set(paths)].sort();
  const doc: DemoDocWrite = {
    path: `${DEMO_MANIFEST_COLLECTION}/${operationId}`,
    data: {
      demoOps: true,
      demoOpsId: operationId,
      demoOpsCommand: command,
      seedPrefix: world ? suvbotSeedPrefix(uid) : DEFAULT_DEMO_SEED_PREFIX,
      command,
      operationId,
      applied: true,
      createdAt,
      users: [uid],
      phones: [],
      paths: unique,
      pathCount: unique.length,
      ...(world ? {
        worldId: world.summary.worldId,
        moment: world.summary.moment,
        primaryEventId: world.summary.eventId,
        worldEventIds: world.eventIds,
        castUids: world.castUids,
      } : {}),
    },
  };
  assertValidSuvbotDocument(doc);
  await db.doc(doc.path).set(doc.data);
}

/**
 * The tester's most recently started demo world, if any.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Tester uid.
 * @return {Promise<WorldManifest | null>} Latest world.
 */
export async function latestWorldManifest(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<WorldManifest | null> {
  const worlds = (await userManifests(db, uid))
    .map(worldFromManifest)
    .filter((world): world is WorldManifest => world !== null)
    .sort((a, b) => b.createdAtMillis - a.createdAtMillis);
  return worlds[0] ?? null;
}

/**
 * Recomputes counts and discovery fields for demo-owned events after their
 * participations changed. Real events are never touched.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {Set<string>} eventIds Touched event ids.
 */
export async function repairDemoEventAggregates(
  db: FirebaseFirestore.Firestore,
  eventIds: Set<string>
): Promise<void> {
  for (const eventId of eventIds) {
    const eventSnap = await db.collection("events").doc(eventId).get();
    const event = eventSnap.data();
    if (!eventSnap.exists || !event || !isDemoOwned(event)) continue;
    const participations = await db.collection("eventParticipations")
      .where("eventId", "==", eventId)
      .get();
    const booked = participations.docs
      .map((doc) => doc.data())
      .filter((data) =>
        data.status === "signedUp" || data.status === "attended");
    const users = await getAllPaths(db,
      booked.map((data) => `users/${String(data.uid)}`));
    const genderCounts: Record<string, number> = {};
    const cohortCounts: Record<string, number> = {};
    for (const [index, data] of booked.entries()) {
      if (typeof data.genderAtSignup === "string") {
        genderCounts[data.genderAtSignup] =
          (genderCounts[data.genderAtSignup] ?? 0) + 1;
      }
      const user = users[index]?.data();
      if (user) {
        const cohort = cohortIdForUser(user as UserProfileDocument);
        cohortCounts[cohort] = (cohortCounts[cohort] ?? 0) + 1;
      }
    }
    const next: FirebaseFirestore.DocumentData = {
      ...event,
      bookedCount: booked.length,
      checkedInCount: booked.filter((data) => data.status === "attended")
        .length,
      waitlistedCount: participations.docs
        .filter((doc) => doc.data().status === "waitlisted").length,
      genderCounts,
      cohortCounts,
    };
    const repaired = {
      ...next,
      ...eventDiscoveryProjection({
        event: next as EventDocument,
        clubLocation: event.discoveryMarketId,
        clubLocationMarketId: event.discoveryMarketId,
        bookedCount: booked.length,
      }),
    };
    const doc = {path: eventSnap.ref.path, data: repaired};
    assertValidSuvbotDocument(doc);
    await eventSnap.ref.set(repaired);
  }
}

/**
 * Summarizes the tester's demo state.
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Tester uid.
 * @return {Promise<DemoSummary>} Summary.
 */
export async function summarizeDemoState(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<DemoSummary> {
  const [world, saved, participations, matches, payments] = await Promise.all([
    latestWorldManifest(db, uid),
    db.collection("savedEvents").where("uid", "==", uid).get(),
    db.collection("eventParticipations").where("uid", "==", uid).get(),
    db.collection("matches").where("participantIds", "array-contains", uid)
      .get(),
    db.collection("payments").where("userId", "==", uid).get(),
  ]);
  const active = participations.docs
    .map((doc) => doc.data())
    .filter((data) => isDemoOwned(data) &&
      ["signedUp", "waitlisted", "attended"].includes(data.status));
  return {
    world,
    savedEvents: saved.docs.filter((doc) => isDemoOwned(doc.data())).length,
    activeEventParticipations: active.length,
    attendedEvents: active.filter((data) => data.status === "attended")
      .length,
    demoMatches: matches.docs
      .filter((doc) => doc.id !== suvbotMatchId(uid))
      .filter((doc) => isDemoOwned(doc.data()))
      .length,
    payments: payments.docs.filter((doc) => isDemoOwned(doc.data())).length,
  };
}

/**
 * Returns whether a path belongs to the Suvbot control thread or access doc.
 * @param {string} path Firestore path.
 * @param {string} uid Tester uid.
 * @return {boolean} True for Suvbot paths.
 */
export function isSuvbotPath(path: string, uid: string): boolean {
  return path === `matches/${suvbotMatchId(uid)}` ||
    path.startsWith(`matches/${suvbotMatchId(uid)}/`) ||
    path === `publicProfiles/${SUVBOT_UID}` ||
    path === `${SUVBOT_ACCESS_COLLECTION}/${uid}`;
}

/**
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Tester uid.
 * @return {Promise<FirebaseFirestore.QueryDocumentSnapshot[]>} Manifests.
 */
async function userManifests(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snap = await db.collection(DEMO_MANIFEST_COLLECTION)
    .where("users", "array-contains", uid)
    .get();
  return snap.docs;
}

/**
 * @param {FirebaseFirestore.QueryDocumentSnapshot} doc Manifest doc.
 * @return {WorldManifest | null} World fields, or null for other commands.
 */
function worldFromManifest(
  doc: FirebaseFirestore.QueryDocumentSnapshot
): WorldManifest | null {
  const data = doc.data();
  if (typeof data.worldId !== "string") return null;
  const createdAt = data.createdAt as {toMillis?: () => number} | undefined;
  return {
    operationId: doc.id,
    worldId: data.worldId,
    moment: String(data.moment ?? ""),
    primaryEventId: String(data.primaryEventId ?? ""),
    worldEventIds: stringArray(data.worldEventIds),
    castUids: stringArray(data.castUids),
    createdAtMillis: typeof createdAt?.toMillis === "function" ?
      createdAt.toMillis() :
      0,
  };
}

/**
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string} uid Swiper uid.
 * @return {FirebaseFirestore.CollectionReference} Outgoing decisions.
 */
function outgoingDecisions(
  db: FirebaseFirestore.Firestore,
  uid: string
): FirebaseFirestore.CollectionReference {
  return db.collection(schemaProfileDecisionCollectionPath)
    .doc(uid)
    .collection(schemaProfileDecisionOutgoingSubcollectionPath);
}

/**
 * @param {FirebaseFirestore.Query} query Query.
 * @param {Function} collect Callback per doc.
 */
async function collectQuery(
  query: FirebaseFirestore.Query,
  collect: (doc: FirebaseFirestore.QueryDocumentSnapshot) => void
): Promise<void> {
  const snap = await query.get();
  for (const doc of snap.docs) collect(doc);
}

/**
 * @param {FirebaseFirestore.Firestore} db Firestore instance.
 * @param {string[]} paths Document paths.
 * @return {Promise<FirebaseFirestore.DocumentSnapshot[]>} Snapshots in order.
 */
async function getAllPaths(
  db: FirebaseFirestore.Firestore,
  paths: string[]
): Promise<FirebaseFirestore.DocumentSnapshot[]> {
  const snaps: FirebaseFirestore.DocumentSnapshot[] = [];
  for (const chunk of chunks(paths, GET_ALL_CHUNK)) {
    if (chunk.length === 0) continue;
    snaps.push(...await db.getAll(...chunk.map((path) => db.doc(path))));
  }
  return snaps;
}

/**
 * @param {unknown} value Candidate.
 * @return {string[]} String items.
 */
function stringArray(value: unknown): string[] {
  return Array.isArray(value) ?
    value.filter((item): item is string => typeof item === "string") :
    [];
}

/**
 * Splits an array into chunks.
 * @param {Array<*>} items Items.
 * @param {number} size Chunk size.
 * @return {Array<Array<*>>} Chunks.
 */
function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
