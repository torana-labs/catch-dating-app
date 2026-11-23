import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {isDeepStrictEqual} from "node:util";
import {
  reconcileEventAssignmentView,
  reconcileProgramAssignmentView,
  reconcileTeamAssignmentView,
} from "./hostAssignmentViews";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true};
const fanoutLimit = 600;

type Data = FirebaseFirestore.DocumentData | undefined;

const unchanged = (before: Data, after: Data, fields: string[]) =>
  before !== undefined && after !== undefined &&
  isDeepStrictEqual(fields.map((f) => before[f] ?? null),
    fields.map((f) => after[f] ?? null));

const text = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/** A programme grant, renewal or revocation: that account's row. */
export const onHostAssignmentProgramGrantChanged = onDocumentWritten({
  ...options, document: "programStaffGrants/{grantId}",
}, async (event) => {
  const db = admin.firestore();
  const seen = new Set<string>();
  for (const grant of [event.data?.before.data(),
    event.data?.after.data()]) {
    if (!text(grant?.uid) || !text(grant?.programId)) continue;
    const key = `${grant.uid}__${grant.programId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await reconcileProgramAssignmentView(db, grant.uid, grant.programId);
  }
});

/**
 * A programme's title, status, organizer or owner: every staff row of it.
 * Other programme writes leave the rows alone.
 */
export const onHostAssignmentProgramChanged = onDocumentWritten({
  ...options, document: "organizerPrograms/{programId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["title", "status", "organizerId",
    "createdBy"])) return;
  const db = admin.firestore();
  const programId = event.params.programId;
  const grants = await db.collection("programStaffGrants")
    .where("programId", "==", programId).limit(fanoutLimit).get();
  for (const grant of grants.docs) {
    const uid = grant.data().uid;
    if (text(uid)) await reconcileProgramAssignmentView(db, uid, programId);
  }
});

/** An event grant, renewal or revocation: that account's row. */
export const onHostAssignmentEventGrantChanged = onDocumentWritten({
  ...options, document: "eventStaffGrants/{grantId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["uid", "eventId", "organizerId", "role",
    "status", "expiresAt"])) return;
  await reconcileEventAssignmentView(admin.firestore(), event.params.grantId,
    before);
});

/** An event's name, or the event appearing or vanishing: its staff rows. */
export const onHostAssignmentEventChanged = onDocumentWritten({
  ...options, document: "events/{eventId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["name"])) return;
  const db = admin.firestore();
  const grants = await db.collection("eventStaffGrants")
    .where("eventId", "==", event.params.eventId).limit(fanoutLimit).get();
  for (const grant of grants.docs) {
    await reconcileEventAssignmentView(db, grant.id);
  }
});

/** A team membership joining, leaving or changing: that account's row. */
export const onHostAssignmentMembershipChanged = onDocumentWritten({
  ...options, document: "organizerTeamMemberships/{membershipId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["uid", "organizerId", "status"])) return;
  await reconcileTeamAssignmentView(admin.firestore(),
    event.params.membershipId, before);
});

/** Every programme, event and team row that names an organiser. */
async function reconcileOrganizerNameRows(
  db: FirebaseFirestore.Firestore, organizerId: string
): Promise<void> {
  // One equality filter each keeps these off the composite index list.
  const [programGrants, eventGrants, memberships] = await Promise.all([
    db.collection("programStaffGrants").where("organizerId", "==",
      organizerId).limit(fanoutLimit).get(),
    db.collection("eventStaffGrants").where("organizerId", "==",
      organizerId).limit(fanoutLimit).get(),
    db.collection("organizerTeamMemberships").where("organizerId", "==",
      organizerId).limit(fanoutLimit).get(),
  ]);
  for (const grant of programGrants.docs) {
    const {uid, programId} = grant.data();
    if (text(uid) && text(programId)) {
      await reconcileProgramAssignmentView(db, uid, programId);
    }
  }
  for (const grant of eventGrants.docs) {
    await reconcileEventAssignmentView(db, grant.id);
  }
  for (const membership of memberships.docs) {
    await reconcileTeamAssignmentView(db, membership.id);
  }
}

/** An organiser's name: every programme, event and team row naming it. */
export const onHostAssignmentOrganizerChanged = onDocumentWritten({
  ...options, document: "organizers/{organizerId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["name"])) return;
  await reconcileOrganizerNameRows(admin.firestore(),
    event.params.organizerId);
});

/**
 * An organiser's name: every programme, event and team row naming it.
 * The organizers dispatcher (issue #2451) runs the same work; both run
 * until the old trigger retires, which is safe because it re-reads its
 * sources, so a retry, a replay or a second run converges.
 */
export const hostAssignmentViewProjections = defineProjections(
  "organizers", [{
    id: "hostAssignmentView", kind: "projection",
    when: (change) => !unchanged(change.before, change.after, ["name"]),
    run: (change, ctx) => reconcileOrganizerNameRows(ctx.db,
      change.documentId),
  }]);
