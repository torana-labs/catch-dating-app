import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {isDeepStrictEqual} from "node:util";
import {recountOrganizerProgram} from "./organizerProgramCounts";
import {reconcileOrganizerProgramView as rewriteView} from
  "./organizerProgramViews";

const options = {retry: true};

/**
 * Rewrites a programme's setup view and, when the view has no list counts
 * yet (it was just created, or predates them), recounts it.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} programId The programme.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
async function reconcileOrganizerProgramView(
  db: FirebaseFirestore.Firestore, programId: string): Promise<void> {
  if (await rewriteView(db, programId)) {
    await recountOrganizerProgram(db, programId);
  }
}

type Data = FirebaseFirestore.DocumentData | undefined;

const unchanged = (before: Data, after: Data, fields: string[]) =>
  before !== undefined && after !== undefined &&
  isDeepStrictEqual(fields.map((f) => before[f] ?? null),
    fields.map((f) => after[f] ?? null));

/**
 * Reconciles the view of the programme a source moved into, and the one it
 * left when it moved.
 * @param {Data} before Old source data.
 * @param {Data} after New source data.
 * @return {Promise<void>} Resolves once the views match.
 */
async function reconcilePrograms(before: Data, after: Data): Promise<void> {
  const programIds = new Set([before?.programId, after?.programId].filter(
    (id): id is string => typeof id === "string" && id.length > 0));
  for (const programId of programIds) {
    await reconcileOrganizerProgramView(admin.firestore(), programId);
  }
}

/** A programme's settings, dates, status, branding or retention dates. */
export const onOrganizerProgramViewChanged = onDocumentWritten({
  ...options, document: "organizerPrograms/{programId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["organizerId", "createdBy", "kind", "title",
    "timezone", "status", "startsAt", "endsAt", "capabilities",
    "transportSettings", "branding", "archivedAt", "anonymizeAt",
    "anonymizedAt", "revision"])) return;
  await reconcileOrganizerProgramView(admin.firestore(),
    event.params.programId);
});

/**
 * A function's setup fields. Its expected and checked-in counts are not in
 * the view, but they move its revision, which the view carries as the edit
 * fence, so a count write refreshes it too.
 */
export const onOrganizerProgramFunctionChanged = onDocumentWritten({
  ...options, document: "programFunctions/{functionId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["programId", "organizerId", "name",
    "startsAt", "endsAt", "venueName", "status", "invitationMode",
    "checkInEnabled", "dressCode", "instructions", "revision"])) return;
  await reconcilePrograms(before, after);
});

/** A pickup point's label, place, instructions or active flag. */
export const onOrganizerProgramPickupPointChanged = onDocumentWritten({
  ...options, document: "programPickupPoints/{pickupPointId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["programId", "organizerId", "kind", "label",
    "iataCode", "terminal", "meetingZone", "instructions", "active",
    "revision"])) return;
  await reconcilePrograms(before, after);
});

/** A hotel's name, address, reception contact or active flag. */
export const onOrganizerProgramHotelChanged = onDocumentWritten({
  ...options, document: "programHotels/{hotelId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (unchanged(before, after, ["programId", "organizerId", "name",
    "address", "receptionContact", "active", "revision"])) return;
  await reconcilePrograms(before, after);
});
