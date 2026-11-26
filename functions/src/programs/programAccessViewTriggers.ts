import {defineProjections} from "../platform/dispatch/runtime";
import {
  changedOrganizerManagers,
  reconcileOrganizerManagerViews,
} from "./programAccessView";

/**
 * An organizer gaining or losing a manager (its hostUserId, ownerUserId or
 * hostUserIds): that account's view of every programme of the organizer, so
 * a new manager gets the setup flag and a removed one loses it. Other
 * organizer writes match nothing.
 *
 * The flag is display only: released Host builds gate the programme list on
 * it offline, and no security rule reads it. Programme authority is written
 * in each grant command's transaction (programAuthorityWrites), and
 * organiser authority in each team command's (accessGrants, #2474 step 3).
 * Served by the organizers dispatcher (issue #2451) in place of the retired
 * onProgramAccessViewOrganizerChanged trigger; it re-reads its sources in a
 * transaction per view, so a retry or a replay converges.
 */
export const programAccessViewOrganizerProjections = defineProjections(
  "organizers", [{
    id: "programAccessViewOrganizerManagers", kind: "projection",
    when: (change) =>
      changedOrganizerManagers(change.before, change.after).length > 0,
    run: (change, ctx) => reconcileOrganizerManagerViews(ctx.db,
      change.documentId, changedOrganizerManagers(change.before,
        change.after)),
  }]);
