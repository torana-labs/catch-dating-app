import type {DeletionWriter} from "./accountDeletion";

type Db = FirebaseFirestore.Firestore;
type Snapshot = FirebaseFirestore.QueryDocumentSnapshot;
type Data = FirebaseFirestore.DocumentData;

/** The name a deleted guest's half of a pair label shows. */
const DELETED_GUEST_LABEL = "Deleted user";

/**
 * Erases the account's live-event guidance and game records (#2468, group
 * 1). Its own records are deleted: meeting histories, game histories,
 * assignments and drafts, First Hello missions and wingman requests on
 * either side, preferences, presence, deferred cues, late-arrival
 * resolutions, venue-session receipts and runtime claim and data requests.
 * Other people's records lose the account: peers' meeting histories drop
 * it, peers' assignments and drafts drop every slot that pairs them with
 * it, and Host plans drop the constraints and overrides that name it.
 * Pair labels in rank standings are renamed after the main writes commit
 * (afterCommit), because a standings write re-projects every guest's game
 * history from the assignments and must not see the account in them.
 * @param {object} params Inputs.
 * @param {Db} params.db Firestore.
 * @param {string} params.uid The account being deleted.
 * @param {DeletionWriter} params.writer The main deletion writes.
 * @param {DeletionWriter} params.afterCommit Writes made after them.
 */
export async function queueEventDataCleanup(params: {
  db: Db;
  uid: string;
  writer: DeletionWriter;
  afterCommit: DeletionWriter;
}): Promise<void> {
  const {db, uid, writer, afterCommit} = params;
  const byField = (collection: string, field: string, op:
    "==" | "array-contains" = "==") =>
    db.collection(collection).where(field, op, uid).get();
  const [meetings, guestHistory, assignments, peerAssignments, drafts,
    peerDrafts, observedMissions, targetMissions, requestedWingman,
    targetWingman, preferences, presence, deferredCues, lateArrivals,
    redemptions, claimRequests, dataRequests, bookings] = await Promise.all([
    byField("organizerMeetingHistory", "uid"),
    byField("eventSuccessGuestHistory", "uid"),
    byField("eventSuccessAssignments", "uid"),
    byField("eventSuccessAssignments", "peerUids", "array-contains"),
    byField("eventSuccessAssignmentDrafts", "uid"),
    byField("eventSuccessAssignmentDrafts", "assignment.peerUids",
      "array-contains"),
    byField("eventSuccessArrivalMissions", "observerUid"),
    byField("eventSuccessArrivalMissions", "targetUid"),
    byField("eventSuccessWingmanRequests", "requesterUid"),
    byField("eventSuccessWingmanRequests", "targetUid"),
    byField("eventSuccessPreferences", "uid"),
    byField("eventSuccessPresence", "uid"),
    byField("eventSuccessDeferredCues", "uid"),
    byField("eventSuccessLateArrivals", "uid"),
    byField("eventVenueSessionRedemptions", "uid"),
    byField("eventRuntimeClaimRequests", "uid"),
    byField("eventRuntimeDataRequests", "uid"),
    byField("eventBookings", "uid"),
  ]);

  const deleted = new Set<string>();
  for (const records of [meetings, guestHistory, assignments, drafts,
    observedMissions, targetMissions, requestedWingman, targetWingman,
    preferences, presence, deferredCues, lateArrivals, redemptions,
    claimRequests, dataRequests]) {
    records.forEach((doc) => {
      if (deleted.has(doc.ref.path)) return;
      deleted.add(doc.ref.path);
      writer.delete(doc.ref);
    });
  }

  await queuePeerMeetingHistoryCleanup(db, uid, meetings.docs, writer);
  peerAssignments.forEach((doc) => {
    if (deleted.has(doc.ref.path)) return;
    writer.update(doc.ref, assignmentWithoutAccount(doc.data(), uid));
  });
  peerDrafts.forEach((doc) => {
    if (deleted.has(doc.ref.path)) return;
    const assignment = doc.data().assignment;
    if (assignment === null || typeof assignment !== "object") return;
    writer.update(doc.ref, {
      assignment: {...assignment, ...assignmentWithoutAccount(assignment,
        uid)},
    });
  });

  const eventIds = new Set<string>();
  for (const doc of [...bookings.docs, ...assignments.docs, ...drafts.docs]) {
    const eventId = doc.data().eventId;
    if (typeof eventId === "string" && eventId.length > 0) {
      eventIds.add(eventId);
    }
  }
  await queuePlanCleanup(db, uid, eventIds, writer);
  await queueStandingsLabelCleanup(db, uid,
    [...assignments.docs, ...peerAssignments.docs], afterCommit);
}

/**
 * Removes the account from the meeting histories of the guests it met.
 * Peers are not queryable (the peers map is unindexed), but meetings are
 * recorded for both guests of a slot, so the account's own histories name
 * every peer whose history names it.
 * @param {Db} db Firestore.
 * @param {string} uid The account being deleted.
 * @param {Snapshot[]} own The account's own histories.
 * @param {DeletionWriter} writer Deletion writes.
 */
async function queuePeerMeetingHistoryCleanup(
  db: Db,
  uid: string,
  own: Snapshot[],
  writer: DeletionWriter
): Promise<void> {
  const refs = new Map<string, FirebaseFirestore.DocumentReference>();
  for (const doc of own) {
    const {organizerId, peers} = doc.data();
    if (typeof organizerId !== "string" || peers === null ||
        typeof peers !== "object") {
      continue;
    }
    for (const peer of Object.keys(peers)) {
      if (peer === uid) continue;
      const ref = db.collection("organizerMeetingHistory")
        .doc(`${organizerId}_${peer}`);
      refs.set(ref.path, ref);
    }
  }
  const snaps = await Promise.all([...refs.values()].map((ref) => ref.get()));
  for (const snap of snaps) {
    const peers = snap.data()?.peers;
    if (!snap.exists || peers === null || typeof peers !== "object" ||
        !Object.prototype.hasOwnProperty.call(peers, uid)) {
      continue;
    }
    const remaining = {...peers};
    delete remaining[uid];
    writer.update(snap.ref, {peers: remaining});
  }
}

/**
 * The fields of a peer's assignment without the account: it leaves
 * peerUids, every rotation slot that pairs the peer with it (a slot needs
 * its peer, and doubles need both opponents) and the peer lists of group
 * slots.
 * @param {Data} assignment A peer's assignment.
 * @param {string} uid The account being deleted.
 * @return {Data} The changed fields.
 */
export function assignmentWithoutAccount(assignment: Data, uid: string):
  Data {
  const withoutUid = (values: unknown): unknown[] =>
    Array.isArray(values) ? values.filter((value) => value !== uid) : [];
  const patch: Data = {peerUids: withoutUid(assignment.peerUids)};
  if (Array.isArray(assignment.rotationSlots)) {
    patch.rotationSlots = assignment.rotationSlots.filter((slot: Data) =>
      slot?.peerUid !== uid && slot?.partnerUid !== uid &&
      !(Array.isArray(slot?.opponentUids) && slot.opponentUids.includes(uid)));
  }
  if (Array.isArray(assignment.groupRotationSlots)) {
    patch.groupRotationSlots = assignment.groupRotationSlots
      .map((slot: Data) => Array.isArray(slot?.peerUids) &&
        slot.peerUids.includes(uid) ?
        {...slot, peerUids: withoutUid(slot.peerUids)} : slot);
  }
  return patch;
}

/**
 * Drops the Host plan affinity constraints and spatial overrides that name
 * the account, on the events it booked or was assigned at.
 * @param {Db} db Firestore.
 * @param {string} uid The account being deleted.
 * @param {Set<string>} eventIds The account's events.
 * @param {DeletionWriter} writer Deletion writes.
 */
async function queuePlanCleanup(
  db: Db,
  uid: string,
  eventIds: Set<string>,
  writer: DeletionWriter
): Promise<void> {
  const plans = await Promise.all([...eventIds].map((eventId) =>
    db.collection("eventSuccessPlans").doc(eventId).get()));
  for (const plan of plans) {
    const data = plan.data();
    if (!plan.exists || !data) continue;
    const patch: Data = {};
    if (Array.isArray(data.affinityConstraints)) {
      const kept = data.affinityConstraints.filter((constraint: Data) =>
        constraint?.aUid !== uid && constraint?.bUid !== uid);
      if (kept.length !== data.affinityConstraints.length) {
        patch.affinityConstraints = kept;
      }
    }
    if (Array.isArray(data.spatialOverrides)) {
      const kept = data.spatialOverrides.filter((override: Data) =>
        override?.uid !== uid && override?.targetPeerUid !== uid);
      if (kept.length !== data.spatialOverrides.length) {
        patch.spatialOverrides = kept;
      }
    }
    if (Object.keys(patch).length > 0) writer.update(plan.ref, patch);
  }
}

/**
 * Renames the account's half of its pair labels in rank standings. A rank
 * unit is one rotation pair in one round, labelled with both guests' names
 * in the order of their sorted uids (the Host scoreboard's rule); team and
 * table units carry no guest name.
 * @param {Db} db Firestore.
 * @param {string} uid The account being deleted.
 * @param {Snapshot[]} sources The account's and its peers' assignments.
 * @param {DeletionWriter} afterCommit Writes made after the main ones.
 */
async function queueStandingsLabelCleanup(
  db: Db,
  uid: string,
  sources: Snapshot[],
  afterCommit: DeletionWriter
): Promise<void> {
  const unitsByEvent = accountPairUnits(uid, sources.map((doc) => doc.data()));
  const standings = await Promise.all([...unitsByEvent.keys()].map(
    (eventId) => db.collection("eventSuccessStandings").doc(eventId).get()));
  for (const snap of standings) {
    const data = snap.data();
    if (!snap.exists || data?.unitOutcome !== "rank") continue;
    const units = unitsByEvent.get(snap.id) ?? new Map<string, number>();
    let changed = false;
    const rename = (entries: unknown): unknown => {
      if (!Array.isArray(entries)) return entries;
      return entries.map((entry: Data) => {
        const index = units.get(entry?.unitId);
        if (index === undefined || typeof entry.unitLabel !== "string") {
          return entry;
        }
        changed = true;
        return {...entry, unitLabel: pairLabelWithoutAccount(
          entry.unitLabel, index)};
      });
    };
    const rounds = Array.isArray(data.rounds) ?
      data.rounds.map((round: Data) => ({...round,
        entries: rename(round?.entries)})) :
      data.rounds;
    const entries = rename(data.entries);
    if (changed) afterCommit.update(snap.ref, {rounds, entries});
  }
}

/**
 * The account's rotation pair units by event: unit id to the account's
 * position in the pair's sorted uids.
 * @param {string} uid The account being deleted.
 * @param {Data[]} assignments The account's and its peers' assignments.
 * @return {Map<string, Map<string, number>>} Units by event id.
 */
export function accountPairUnits(uid: string, assignments: Data[]):
  Map<string, Map<string, number>> {
  const byEvent = new Map<string, Map<string, number>>();
  for (const assignment of assignments) {
    if (typeof assignment.eventId !== "string" ||
        typeof assignment.uid !== "string" ||
        !Array.isArray(assignment.rotationSlots)) {
      continue;
    }
    for (const slot of assignment.rotationSlots as Data[]) {
      if (!Number.isInteger(slot?.roundIndex) ||
          typeof slot.peerUid !== "string") {
        continue;
      }
      const pair = [assignment.uid, slot.peerUid].sort();
      const index = pair.indexOf(uid);
      if (index < 0) continue;
      const pairKey = typeof slot.slotId === "string" ? slot.slotId :
        pair.join("_");
      const units = byEvent.get(assignment.eventId) ??
        new Map<string, number>();
      units.set(outcomeUnitId(`round_${slot.roundIndex}_${pairKey}`),
        index);
      byEvent.set(assignment.eventId, units);
    }
  }
  return byEvent;
}

/**
 * The scoreboard's unit id rule, equal to safeOutcomeUnitId in
 * eventSuccess/guestHistory.ts (a test holds them equal). It is repeated so
 * account deletion does not import an event-success trigger module.
 * @param {string} value Raw unit key.
 * @return {string} Unit id.
 */
export function outcomeUnitId(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_-]/g, "_");
  const safe = normalized.length === 0 ? "unit" : normalized;
  return safe.length <= 120 ? safe : safe.substring(0, 120);
}

/**
 * A pair label ("Asha + Ravi") with the account's name replaced.
 * @param {string} label The stored label.
 * @param {number} index The account's position in the pair.
 * @return {string} The label without the account's name.
 */
export function pairLabelWithoutAccount(label: string, index: number):
  string {
  const names = label.split(" + ");
  if (names.length !== 2) return DELETED_GUEST_LABEL;
  names[index] = DELETED_GUEST_LABEL;
  return names.join(" + ");
}
