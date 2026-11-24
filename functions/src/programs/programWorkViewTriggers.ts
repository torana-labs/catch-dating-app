import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  reconcileProgramResourceView,
  reconcileProgramWorkSummary,
} from "./programWorkViews";
import type {ProgramResourceKind} from "./programWorkViews";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true};

/**
 * A programme's title, zone, status, capabilities or vehicle classes.
 * Served by dispatchOrganizerPrograms (issue #2451); it re-reads its sources,
 * so a retry or a replay converges.
 */
export const programWorkSummaryProjections = defineProjections(
  "organizerPrograms", [{
    id: "programWorkSummary", kind: "projection",
    when: () => true,
    run: (change, ctx) => reconcileProgramWorkSummary(ctx.db,
      change.documentId),
  }]);

/**
 * Reconciles the view of the source that changed, and the old view when the
 * source moved to another programme.
 * @param {ProgramResourceKind} kind The kind of resource.
 * @param {string} resourceId The source document id.
 * @param {FirebaseFirestore.DocumentData|undefined} before Old source data.
 * @param {FirebaseFirestore.DocumentData|undefined} after New source data.
 * @return {Promise<void>} Resolves once the views match.
 */
async function reconcileResource(kind: ProgramResourceKind,
  resourceId: string, before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): Promise<void> {
  const programIds = new Set([before?.programId, after?.programId].filter(
    (id): id is string => typeof id === "string" && id.length > 0));
  for (const programId of programIds) {
    await reconcileProgramResourceView(admin.firestore(), kind, resourceId,
      programId);
  }
}

export const onProgramPickupPointViewChanged = onDocumentWritten({
  ...options, document: "programPickupPoints/{pickupPointId}",
}, (event) => reconcileResource("pickupPoint", event.params.pickupPointId,
  event.data?.before.data(), event.data?.after.data()));

export const onProgramHotelViewChanged = onDocumentWritten({
  ...options, document: "programHotels/{hotelId}",
}, (event) => reconcileResource("hotel", event.params.hotelId,
  event.data?.before.data(), event.data?.after.data()));

export const onProgramFunctionViewChanged = onDocumentWritten({
  ...options, document: "programFunctions/{functionId}",
}, (event) => reconcileResource("function", event.params.functionId,
  event.data?.before.data(), event.data?.after.data()));

/**
 * Dispatcher specs for the triggers above (issue #2451). Each runs its
 * trigger's body with the dispatch change in place of the event; the
 * bodies re-read their sources, so both running is safe until the old
 * triggers retire and these become the only copy.
 */
export const programHotelsProjections = defineProjections("programHotels", [
  {
    id: "programHotelViewChanged", kind: "projection",
    when: () => true,
    run: async (change) => {
      const {before, after, documentId} = change;
      await reconcileResource("hotel", documentId,
        before, after);
    },
  },
]);
