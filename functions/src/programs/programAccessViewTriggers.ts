import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  changedOrganizerManagers,
  reconcileOrganizerManagerViews,
} from "./programAccessView";

const options = {retry: true};

/**
 * An organizer gaining or losing a manager (its hostUserId, ownerUserId or
 * hostUserIds, the fields requireProgramSetupAccess and the rules read): that
 * account's view of every programme of the organizer, so a new manager gets
 * the setup flag and a removed one loses it. Other organizer writes return
 * without reading anything.
 *
 * The flag is display only: released Host builds gate the programme list on
 * it offline, and no security rule reads it. Programme authority itself is
 * written in each grant command's transaction (programAuthorityWrites), so
 * grants and programmes need no trigger (issue #2474).
 */
export const onProgramAccessViewOrganizerChanged = onDocumentWritten({
  ...options, document: "organizers/{organizerId}",
}, async (event) => {
  const changed = changedOrganizerManagers(event.data?.before.data(),
    event.data?.after.data());
  if (changed.length === 0) return;
  await reconcileOrganizerManagerViews(admin.firestore(),
    event.params.organizerId, changed);
});
