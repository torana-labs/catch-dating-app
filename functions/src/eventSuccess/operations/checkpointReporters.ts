import {Timestamp} from "firebase-admin/firestore";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {isOrganizerManager, organizerHostProfiles,
  organizerManagerUserIds} from "../../shared/organizerHosts";
import {eventStaffGrantId, staffTimestampMillis} from
  "../../shared/eventOperatorAuthority";
import {GROUP_DUTY_PERMISSIONS, parseStaff, readGroupDutySource, denied} from
  "./groupStaffAuthority";
import {invalidSource} from "./groupProgressSource";
import {checkpointAssignmentView, checkpointAvailability,
  checkpointRequestView, CheckpointState, Response} from "./checkpointRecords";

type Options = NonNullable<Response["view"]["reporterOptions"]>;
/** The actor-free part of the choice list: who could report, until when. */
export type ReporterCandidates = Pick<Options, "sourceHash" | "reporters">;

/** Current group observers only; never exposes phone or grant details. */
export async function readCheckpointReporters(db: Firestore, tx: Transaction,
  state: CheckpointState, actorUid: string, clock: () => number
): Promise<Options | null> {
  const duty = await readGroupDutySource(db, tx, state.scope.context,
    state.scope.groupId, clock);
  if (duty.now < state.now) throw invalidSource();
  if (!duty.source.configured ||
      !isOrganizerManager(duty.organizer, actorUid)) throw denied();
  const candidates = await readReporterCandidates(db, tx, state, duty, clock);
  if (!candidates) return null;
  const now = state.now;
  if (now >= Number.MAX_SAFE_INTEGER) throw invalidSource();
  return {actorUid, sourceHash: candidates.sourceHash,
    validUntil: Math.min(Number.MAX_SAFE_INTEGER, now + 1_800_000),
    reporters: candidates.reporters};
}

/**
 * The managers and current group observers who could take over the original
 * request, each with the instant their access ends. Trusted: the caller has
 * authorized a manager, or (the live console's view) serves managers only.
 */
export async function readCheckpointReporterCandidates(db: Firestore,
  tx: Transaction, state: CheckpointState, clock: () => number
): Promise<ReporterCandidates | null> {
  const duty = await readGroupDutySource(db, tx, state.scope.context,
    state.scope.groupId, clock);
  if (duty.now < state.now) throw invalidSource();
  if (!duty.source.configured) throw denied();
  return readReporterCandidates(db, tx, state, duty, clock);
}

async function readReporterCandidates(db: Firestore, tx: Transaction,
  state: CheckpointState,
  duty: Awaited<ReturnType<typeof readGroupDutySource>>, clock: () => number
): Promise<ReporterCandidates | null> {
  const {context, groupId} = state.scope;
  const request = checkpointRequestView(state);
  const assignment = checkpointAssignmentView(state);
  if (!request || !assignment ||
      assignment.revision >= Number.MAX_SAFE_INTEGER ||
      ["complete", "closedOut"].includes(request.state) ||
      checkpointAvailability(state).kind !== "ready") return null;
  const grants = await tx.get(db.collection("eventStaffGrants")
    .where("eventId", "==", context.eventId)
    .where("status", "==", "active")
    .where("expiresAt", ">", Timestamp.fromMillis(duty.now)).limit(51));
  const now = clock();
  if (!Number.isSafeInteger(now) || now < Math.max(state.now, duty.now) ||
      grants.size > 50) throw invalidSource();
  state.now = now;
  const managers = organizerManagerUserIds(duty.organizer);
  const profiles = organizerHostProfiles(duty.organizer);
  const reporters: Options["reporters"] = managers.map((operatorId) => ({
    operatorId, displayName: profiles.find((p) =>
      p.uid === operatorId)?.displayName ?? null,
    validUntil: Number.MAX_SAFE_INTEGER}))
    .filter((r) => r.validUntil > Math.max(now, request.dueAt));
  for (const snapshot of grants.docs) {
    const raw = snapshot.data();
    const uid = raw?.uid;
    if (typeof uid !== "string" || snapshot.id !==
        eventStaffGrantId(context.eventId, uid)) throw invalidSource();
    const staff = parseStaff(raw, context, uid, now);
    if (!staff || staff.status !== "active" || managers.includes(uid)) continue;
    const grant = staff.groupDuties?.find((d) => d.groupId === groupId);
    if (!grant) continue;
    const permitted: readonly string[] = GROUP_DUTY_PERMISSIONS[grant.duty];
    const validUntil = Math.min(grant.expiresAtMillis,
      staffTimestampMillis(staff.expiresAt));
    if (grant.sourceHash === duty.source.hash &&
        permitted.includes("recordCheckpoint") &&
        validUntil > Math.max(now, request.dueAt)) {
      reporters.push({operatorId: uid, displayName: staff.displayName,
        validUntil});
    }
  }
  reporters.sort((a, b) => a.operatorId.localeCompare(b.operatorId));
  if (reporters.length > 92) throw invalidSource();
  return {sourceHash: assignment.sourceHash, reporters};
}
